const puppeteer = require('puppeteer');
const urlModule = require('url');
const URL = urlModule.URL;
const compression = require('./compression');

module.exports = async function(ws) {
  let browser, page;
  const RESSOURCES = new Map();

  ws.on('message', function(resp) {
    const data = JSON.parse(resp);
    const { event } = data;

    if (event === 'goto') {
      const { url } = data;
      navigate(page, url, ws);
    }
  });

  ws.on('close', async function() {
    await browser.close();
  });

  browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  page = await browser.newPage();

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

    if (urlBlackList.find(regex => url.match(regex))) {
      req.abort();
      return;
    }

    if (!resourcesWhiteList.includes(type)) {
      req.abort();
      return;
    }

    if (RESSOURCES.has(url)) {
      req.abort();
      return;
    }

    if (RESSOURCES.has(url)) {
      req.abort();
      return;
    }

    if (RESSOURCES.has(url)) {
      req.abort();
      return;
    }

    if (RESSOURCES.has(url)) {
      req.abort();
      return;
    }

    req.continue();
  });

  page.on('response', async resp => {
    const href = resp.url();
    const type = resp.request().resourceType();
    const headers = resp.headers();

    if (resp.ok()) {
      if (type === 'stylesheet') {
        const stylesheetContent = await resp.text();
        const stylesheetContentCompressed = await compression(stylesheetContent);

        RESSOURCES.set(href, { type: 'stylesheet', data: stylesheetContentCompressed });
      } 
      else if (type === 'script') {
        const scriptContent = await resp.text();
        const scriptContentCompressed = await compression(scriptContent);

        RESSOURCES.set(href, { type: 'script', data: scriptContentCompressed });
      } 
      else if (type === 'image') {
        const buffer = await resp.buffer();
        const imgContent = `data:${headers['content-type']};charset=utf-8;base64,${buffer.toString('base64')}`;
        const imgContentCompressed = await compression(imgContent)

        RESSOURCES.set(href, { type: 'image', data: imgContentCompressed });
      } 
      else if (type === 'font') {
        const buffer = await resp.buffer();
        const fontContent = `data:${headers['content-type']};charset=utf-8;base64,${buffer.toString('base64')}`;
        const fontContentCompressed = await compression(fontContent);

        RESSOURCES.set(href, { type: 'font', data: fontContentCompressed });
      }

      if (RESSOURCES.has(href)) {
        const { type, data } = RESSOURCES.get(href);

        ws.send(JSON.stringify({
          event: 'data',
          type, 
          data
        }))
      }
    }
  });

  ws.send(JSON.stringify({
    event: 'ready'
  }));
}

async function navigate(page, url, ws) {
  await page.goto(url, {waitUntil: 'load'});

  let html = await page.content();
  const htmlmin = await compression(html);

  ws.send(JSON.stringify({
    event: 'data',
    type: 'page',
    data: htmlmin
  }));
}