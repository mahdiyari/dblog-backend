// All variables may need changes in the future
var config = {}
config.db = {}
// MySQL details
config.db.pw = 'mysql' // MySQL password
config.db.user = 'root' // MySQL username
config.db.host = '127.0.0.1' // MySQL host
config.db.name = 'dblog' // MySQL database
// possible wifkey
config.wifkey = ''
// steemconnect
config.sc2 = {}
config.sc2.app = 'steem.app' // app name
config.sc2.callbackURL = 'https://dblog.io' // callback url
config.sc2.scope = ['login'] // scopes
// RPC nodes
// main RPC node (websocket)
config.rpc = 'ws://rpc2.steemviz.com:8090'
// RPC node (http)
config.rpchttp = 'http://rpc2.steemviz.com:8090'
config.stream_sync = 'http://127.0.0.1:4938'

// export config to use in the other files
module.exports = config
