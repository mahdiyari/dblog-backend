// get DynamicGlobalProperties from steem blockchain
const express = require('express');
const router = express.Router();
const steem = require('steem');
const config = require('../../config');
steem.api.setOptions({ url: config.rpc });

router.get('/',function(req,res){
    res.set('Content-Type', 'application/json');
    const props = steem.api.getDynamicGlobalPropertiesAsync();
    props.then(result=> res.status(200).send(JSON.stringify(result)))
    .catch(e=> res.send('RPC node error!'));
})

//export API
module.exports = router;