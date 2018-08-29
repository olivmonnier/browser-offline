const { brotliCompress, brotliDecompress, lzmaCompress, lzmaDecompress } = require('./data');

module.exports = async function (html) {
  // const htmlZipped = await lzmaCompress(html);
  // const htmlString = await lzmaDecompress(htmlZipped);

  const htmlZipped = brotliCompress(html);
  // const htmlString = brotliDecompress(htmlZipped);

  return htmlZipped;
}