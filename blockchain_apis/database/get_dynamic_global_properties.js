// get DynamicGlobalProperties from steem blockchain
const express = require('express')
const router = express.Router()
const steem = require('steem')
// import config file
const config = require('../../config')
// set custon RPC node which is in the /config.js
steem.api.setOptions({ url: config.rpc })

// Process get requests
router.get('/', (req, res) => {
  res.set('Content-Type', 'application/json')
  steem.api.getDynamicGlobalPropertiesAsync()
    .then(result => res.status(200).json(result))
    .catch(e => res.send('RPC node error!'))
})

// export API
module.exports = router
