const lzma = require('lzma');
const zlib = require('zlib');

function btoa (b) {
  return new Buffer(b).toString('base64');
};

function atob (a) {
  return new Buffer(a, 'base64').toString('binary');
};

function base64ToByteArray (base64) {
  const raw = atob(base64);
  const rawLength = raw.length;
  const array = new Uint8Array(new ArrayBuffer(rawLength));
  for (i = 0; i < rawLength; i++) {
    array[i] = raw.charCodeAt(i);
  }
  return array;
}

function gzip(data) {
  return new Promise((resolve, reject) => {
    zlib.gzip(data, function (err, result) {
      if (err) reject(err);
      resolve({ result, encode: 'gzip' });
    })
  })
}

function deflate(data) {
  return new Promise((resolve, reject) => {
    zlib.deflate(data, function (err, result) {
      if (err) reject(err);
      resolve({ result, encode: 'deflate' });
    });
  })
}

exports.stringToZip = function (s) {
  return new Promise((resolve, reject) => {
    lzma.compress(s, 1, function (result, error) {
      if (error) reject(error);
      const base64String = btoa(result);
      resolve(base64String)
    })
  })
}

exports.zipToString = function (data) {
  return new Promise((resolve, reject) => {
    const array = base64ToByteArray(data);

    lzma.decompress(array, function (result, error) {
      if (!(typeof result === 'string')) result = new Uint8Array(result)
      if (error) reject(error);
      resolve(result);
    });
  })
}

exports.encoding = function (data, headers) {
  const acceptEncoding = headers['accept-encoding'] || '';

  if (acceptEncoding.match(/\bdeflate\b/)) {
    return deflate(data);
  } else if (acceptEncoding.match(/\bgzip\b/)) {
    return gzip(data);
  } else {
    return Promise.resolve(data);
  }
}