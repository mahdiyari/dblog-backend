// Steemconnect initialization
const sc2 = require('sc2-sdk');
const config = require('../../config');
const api = sc2.Initialize({
    app: config.sc2.app,
    callbackURL: config.sc2.callbackURL,
    scope: config.sc2.scope
});

module.exports = api;