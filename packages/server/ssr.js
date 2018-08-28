const puppeteer = require('puppeteer');
const urlModule = require('url');
const URL = urlModule.URL;
const compression = require('./compression');
const RENDER_CACHE = new Map();
let browserWSEndpoint = null;

module.exports = async function(url) {
  let browser;
  const urlToFetch = new URL(url);
  const stylesheetContents = {};
  const scriptsContents = {};
  const imgsContents = {};
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
    'document', 'stylesheet', 'script', 'image', 'xhr', 'fetch', 'websocket'
  ];

  const urlBlackList = [
    '/gtag/js', // Don't load Google Analytics (e.g. inflates page metrics).
  ];

  page.on('request', req => {
    const url = req.url();
    const type = req.resourceType();

    if (urlBlackList.find(regex => url.match(regex))) {
      req.abort();
      return;
    }

    if (!resourcesWhiteList.includes(type)) {
      req.abort();
      return;
    }

    req.continue();
  });

  page.on('response', async resp => {
    const href = resp.url();
    const sameOrigin = new URL(href).origin === new URL(url).origin;
    const type = resp.request().resourceType();
    const headers = resp.headers();

    if (sameOrigin) {
      if (type === 'stylesheet') {
        stylesheetContents[href] = await resp.text();
      } else if (type === 'script') {
        scriptsContents[href] = await resp.text();
      } else if (type === 'image') {
        const buffer = await resp.buffer();
        imgsContents[href] = `data:${headers['content-type']};charset=utf-8;base64,${buffer.toString('base64')}`;
      }
    }
  });

  await page.goto(urlToFetch.href, {waitUntil: 'domcontentloaded'});

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

  const html = await page.content();
  const htmlmin = await compression(html);
  
  if (browserWSEndpoint) {
    await page.close();
  }

  console.info(`Headless rendered ${url} in: ${Date.now() - tic}ms`);

  RENDER_CACHE.set(url, htmlmin);

  return htmlmin;
}