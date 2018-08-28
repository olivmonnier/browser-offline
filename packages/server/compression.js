const { minifyHtml, stringToZip, zipToString } = require('./data');

module.exports = async function (html) {
  const htmlmin = minifyHtml(html);
  const htmlZipped = await stringToZip(htmlmin);
  const htmlString = await zipToString(htmlZipped);

  return htmlString;
}