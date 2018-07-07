// Steemconnect initialization
const sc2 = require('sc2-sdk')
// import config file
const config = require('../../config')
const api = sc2.Initialize({
  app: config.sc2.app, // app name
  callbackURL: config.sc2.callbackURL, // callback url
  scope: config.sc2.scope // scope
})

// export api to import in the other files
module.exports = api
