//https://developers.google.com/web/tools/puppeteer/articles/ssr
const express = require('express');
const http = require('http');
const puppeteer = require('puppeteer');
const { minifyHtml, stringToZip, zipToString, encoding } = require('./data');
const cheerio = require('cheerio');
const purifyCSS = require('purify-css');
const urlModule = require('url');
const URL = urlModule.URL;

const app = express();
const server = http.createServer(app);
const url = 'https://www.lalettrea.fr/';

app.get('/', async (req, res) => {
  const stylesheetContents = {};
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('response', async resp => {
    const responseUrl = resp.url();
    const sameOrigin = new URL(responseUrl).origin === new URL(url).origin;
    const isStylesheet = resp.request().resourceType() === 'stylesheet';
    if (sameOrigin && isStylesheet) {
      stylesheetContents[responseUrl] = await resp.text()
    }
  });

  await page.goto(url, {waitUntil: 'networkidle0'});

  await page.$$eval('link[rel="stylesheet"]', (links, content) => {
    links.forEach(link => {
      const cssText = content[link.href];
      if (cssText) {
        const style = document.createElement('style');
        style.textContent = cssText;
        link.replaceWith(style);
      }
    });
  }, stylesheetContents);

  const html = await page.content();
  const { result, encode } = await processHtml(html, req.headers);

  res.set(Object.assign({}, 
    { 'content-type': 'text/html' }, 
    (encode) ? { 'content-encoding': encode } : {}
  )).send(result)
});

server.listen(process.env.PORT || 8000, () => {
  console.log(`Server started on port ${server.address().port} :)`);
});

async function processHtml(html, headers) {
  const htmlmin = minifyHtml(html);
  const htmlZipped = await stringToZip(htmlmin);
  const htmlString = await zipToString(htmlZipped);

  return await encoding(htmlString, headers);
}