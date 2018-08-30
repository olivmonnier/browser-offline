const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 8001;

express()
  .use(express.static(path.join(__dirname, 'dist'), { maxAge: '30d' }))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))