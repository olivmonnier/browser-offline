const puppeteer = require('puppeteer');
const urlModule = require('url');
const URL = urlModule.URL;
const compression = require('./compression');
let browserWSEndpoint = null;

const STYLESHEETS_CACHE = new Map();
const SCRIPTS_CACHE = new Map();
const IMGS_CACHE = new Map();
const FONTS_CACHE = new Map();
const RENDER_CACHE = new Map();

module.exports = async function(url) {
  let browser;
  const urlToFetch = new URL(url);
  const stylesheetContents = {};
  const scriptsContents = {};
  const imgsContents = {};
  const fontsContents = {};
  const tic = Date.now();

  if (RENDER_CACHE.has(url)) {
    return RENDER_CACHE.get(url);
  }

  if (browserWSEndpoint) {
    browser = await puppeteer.connect({browserWSEndpoint})
  } else {
    browser = await puppeteer.launch({
      args: ['--disable-dev-shm-usage']
    });
    browserWSEndpoint = await browser.wsEndpoint();
  }
  const page = await browser.newPage();

  await page.setRequestInterception(true);

  const resourcesWhiteList = [
    'document', 'stylesheet', 'script', 'image', 'font', 'xhr', 'fetch', 'websocket'
  ];

  const urlBlackList = [
    '/gtag/js', // Don't load Google Analytics (e.g. inflates page metrics).
  ];

  page.on('request', req => {
    const url = req.url();
    const type = req.resourceType();

    // if (req.isNavigationRequest() && req.redirectChain().length) {
    //   req.abort();
    //   return;
    // }

    if (urlBlackList.find(regex => url.match(regex))) {
      req.abort();
      return;
    }

    if (!resourcesWhiteList.includes(type)) {
      req.abort();
      return;
    }

    if (STYLESHEETS_CACHE.has(url)) {
      req.abort();
      stylesheetContents[url] = STYLESHEETS_CACHE.get(url);
      return;
    }

    if (SCRIPTS_CACHE.has(url)) {
      req.abort();
      scriptsContents[url] = SCRIPTS_CACHE.get(url);
      return;
    }

    if (IMGS_CACHE.has(url)) {
      req.abort();
      imgsContents[url] = IMGS_CACHE.get(url);
      return;
    }

    if (FONTS_CACHE.has(url)) {
      req.abort();
      fontsContents[url] = FONTS_CACHE.get(url);
      return;
    }

    req.continue();
  });

  page.on('response', async resp => {
    const href = resp.url();
    // const sameOrigin = new URL(href).origin === new URL(url).origin;
    const type = resp.request().resourceType();
    const headers = resp.headers();

    if (resp.ok()) {
      if (type === 'stylesheet') {
        stylesheetContents[href] = await resp.text();
        STYLESHEETS_CACHE.set(href, stylesheetContents[href]);
      } else if (type === 'script') {
        scriptsContents[href] = await resp.text();
        SCRIPTS_CACHE.set(href, scriptsContents[href]);
      } else if (type === 'image') {
        const buffer = await resp.buffer();
        imgsContents[href] = `data:${headers['content-type']};charset=utf-8;base64,${buffer.toString('base64')}`;
        IMGS_CACHE.set(href, imgsContents[href]);
      } else if (type === 'font') {
        const buffer = await resp.buffer();
        fontsContents[href] = `data:${headers['content-type']};charset=utf-8;base64,${buffer.toString('base64')}`;
        FONTS_CACHE.set(href, fontsContents[href]);
      }
    }
  });

  await page.goto(urlToFetch.href, {waitUntil: 'networkidle0'});

  await page.$$eval('link[rel="stylesheet"]', (sheets, stylesheetContents) => {
    sheets.forEach(sheet => {
      const cssText = stylesheetContents[sheet.href];

      if (cssText) {
        const style = document.createElement('style');
        style.textContent = cssText;
        sheet.replaceWith(style);
      }
    });
  }, stylesheetContents);

  await page.$$eval('script[src]', (scripts, scriptsContents) => {
    scripts.forEach(script => {
      const jsText = scriptsContents[script.src];

      if (jsText) {
        const s = document.createElement('script');
        s.textContent = jsText;
        s.type = script.getAttribute('type');
        script.replaceWith(s);
      }
    });
  }, scriptsContents);

  await page.$$eval('img[src]', (imgs, imgsContents) => {
    imgs.forEach(img => {
      const imgText = imgsContents[img.src];

      if (imgText) {
        const i = document.createElement('img');
        i.setAttribute('src', imgText);
        img.replaceWith(i);
      }
    });
  }, imgsContents);

  let html = await page.content();

  for (let font in fontsContents) {
    const fontUrl = new URL(font);
    html = html.replace(fontUrl.pathname, fontsContents[font]);
  }

  console.info('Nb Characters: ' + html.length);
  const htmlmin = await compression(html);
  
  if (browserWSEndpoint) {
    await page.close();
  }

  console.info(`Headless rendered ${url} in: ${Date.now() - tic}ms`);

  RENDER_CACHE.set(url, htmlmin);

  return htmlmin;
}