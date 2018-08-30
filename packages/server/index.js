const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const { encoding } = require('./data');
const ssr = require('./ssr');
const app = express();
const server = http.createServer(app);
const WebSocket = require('ws');

// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json());

// app.post('/', async (req, res) => {
//   const { url } = req.body;
//   const html = await ssr(url);
//   const { result, encode } = await encoding(html, req.headers);

//   res.set(Object.assign({}, 
//     { 'content-type': 'text/plain' }, 
//     (encode) ? { 'content-encoding': encode } : {}
//   )).send(result)
// });
const wss = new WebSocket.Server({ server });

wss.on('connection', function(ws) {
  ssr(ws)
});

server.listen(process.env.PORT || 8000, () => {
  console.log(`Server started on port ${server.address().port} :)`);
});