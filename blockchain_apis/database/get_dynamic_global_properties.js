// get DynamicGlobalProperties from steem blockchain
const express = require('express')
const router = express.Router()
const steem = require('steem')
// import config file
const config = require('../../config')
// set custon RPC node which is in the /config.js
steem.api.setOptions({ url: config.rpc })

router.get('/', (req, res) => {
  // Process get requests
  // Set JSON header
  res.set('Content-Type', 'application/json')
  // make call to the RPC node
  // return GlobalProperties in the response
  steem.api.getDynamicGlobalPropertiesAsync()
    .then(result => res.status(200).send(JSON.stringify(result)))
    // catch possible errors
    .catch(e => res.send('RPC node error!'))
})

// export API
module.exports = router
