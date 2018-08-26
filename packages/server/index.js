const express = require('express');
const http = require('http');
const puppeteer = require('puppeteer');
const { minifyHtml, stringToZip, zipToString, encoding } = require('./data');
const cheerio = require('cheerio');
const purifyCSS = require('purify-css');

const app = express();
const server = http.createServer(app);

app.get('/', (req, res) => {
  const browser = puppeteer.launch();
  const page = browser.then(b => b.newPage());

  page
    .then(p => p.goto('http://www.example.com/'))
    .then(() => page)
    .then(p => p.content())
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

  return $$
    .then($ => $('style'))
    .then($style => $style.html(purifyCSS(html, $style.html())))
    .then(() => $$)
    .then($ => $.html())
}

function processCSS(html) {
  return cleanStyle(html)
}