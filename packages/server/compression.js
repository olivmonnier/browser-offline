const { lzmaCompress, lzmaDecompress } = require('./data');

module.exports = async function (html) {
  const htmlZipped = await lzmaCompress(html);
  // const htmlString = await lzmaDecompress(htmlZipped);

  return htmlZipped;
}