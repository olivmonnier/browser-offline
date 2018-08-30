import { lzmaDecompress } from './data';

let readystate = Boolean(false);
let URL;
const domParser = new DOMParser();
const PAGES = new Map();
const socket = new WebSocket('ws://localhost:8000');
const $input = document.querySelector('#url');
const $button = document.querySelector('button');
const $iframe = document.querySelector('iframe');

socket.onopen = function() {
  $button.addEventListener('click', function() {
    URL = $input.value;

    if (readystate) {
      if (PAGES.has(URL)) {
        $iframe.setAttribute('srcdoc', PAGES.get(URL));
      } else {
        socket.send(JSON.stringify({
          event: 'goto',
          url: URL
        }))
      }
    }
  })
}

socket.onmessage = function(e) {
  const data = JSON.parse(e.data);
  const { event } = data;

  if (event === 'ready') {
    readystate = Boolean(true);
  }
  else if (event === 'data') {
    const { type } = data;
  
    lzmaDecompress(data.data)
      .then(res => {
        if (type === 'page') {
          $iframe.setAttribute('srcdoc', res);
          // document.write(res);
          PAGES.set(URL, res);
        }
        else if (type === 'stylesheet') {
          const page = PAGES.get(URL);
          const doc = domParser.parseFromString(page, 'text/html');
          const $stylesheets = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));

          console.log($stylesheets)
        }
      })
  }
}

