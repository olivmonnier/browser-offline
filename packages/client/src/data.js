import * as LZMA from 'lzma/src/lzma-d';

export function base64ToByteArray (base64) {
  const raw = atob(base64);
  const rawLength = raw.length;
  const array = new Uint8Array(new ArrayBuffer(rawLength));
  for (let i = 0; i < rawLength; i++) {
    array[i] = raw.charCodeAt(i);
  }
  return array;
}

export function lzmaDecompress(s) {
  const a = base64ToByteArray(s);

  return new Promise((resolve, reject) => {
    LZMA.LZMA.decompress(a, function(result, error) {
      if (error) reject(error);
      if (!(typeof result === 'string')) result = new Uint8Array(result)

      resolve(result)
    });
  })
}