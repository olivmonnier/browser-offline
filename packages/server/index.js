const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const { encoding } = require('./data');
const ssr = require('./ssr');
const app = express();
const server = http.createServer(app);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/', async (req, res) => {
  const { url } = req.body;
  const html = await ssr(url);
  const { result, encode } = await encoding(html, req.headers);

  res.set(Object.assign({}, 
    { 'content-type': 'text/html' }, 
    (encode) ? { 'content-encoding': encode } : {}
  )).send(result)
});

server.listen(process.env.PORT || 8000, () => {
  console.log(`Server started on port ${server.address().port} :)`);
});