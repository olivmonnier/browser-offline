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
const url = 'https://www.example.com/';

app.get('/', (req, res) => {
  const stylesheetContents = {};
  const browser = puppeteer.launch();
  const page = browser.then(b => b.newPage());

  page
    .then(p => p.on('response', resp => {
      const responseUrl = resp.url();
      const sameOrigin = new URL(responseUrl).origin === new URL(url).origin;
      const isStylesheet = resp.request().resourceType() === 'stylesheet';
      if (sameOrigin && isStylesheet) {
        resp.text().then(txt => stylesheetContents[responseUrl] = txt)
      }
    }))

  const navigate = page
    .then(p => p.goto(url, {waitUntil: 'networkidle0'}))

  const inlineCss = Promise.all([page, navigate])
    .then(([p, ...args]) => p.$$eval('link[rel="stylesheet"]', (links, content) => {
      links.forEach(link => {
        const cssText = content[link.href];
        if (cssText) {
          const style = document.createElement('style');
          style.textContent = cssText;
          link.replaceWith(style);
        }
      });
    }, stylesheetContents));

  return Promise.all([page, inlineCss])
    .then(([p, ...args]) => p.content())
    .then(html => processCSS(html))
    .then(html => processHtml(html, req.headers))
    .then(({ result, encode }) => {
      res.set(Object.assign({}, { 'content-type': 'text/html' }, 
      (encode) ? { 'content-encoding': encode } : {}
      )).send(result)
    })
    .catch(err => console.error(err))
});

server.listen(process.env.PORT || 8000, () => {
  console.log(`Server started on port ${server.address().port} :)`);
});

function processHtml(html, headers) {
  return Promise.resolve(minifyHtml(html))
    .then(htmlmin => stringToZip(htmlmin))
    .then(zip => zipToString(zip))
    .then(h => encoding(h, headers))
}

function cleanStyle(html) {
  const $$ = Promise.resolve(cheerio.load(html));
  const $style = $$
    .then($ => $('style'))
    .then($style => {
      if ($style.length > 0) {
        return $style.html(purifyCSS(html, $style.html()))
      }
    })

  return Promise.all([$$, $style])
    .then(([$, ...args])  => $.html())
}

function processCSS(html) {
  return cleanStyle(html)
}