const { stringToZip, zipToString } = require('./data');

module.exports = async function (html) {
  const htmlZipped = await stringToZip(html);
  const htmlString = await zipToString(htmlZipped);

  return htmlString;
}