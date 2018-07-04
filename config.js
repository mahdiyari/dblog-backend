// All variables may need changes in the future
var config = {};
config.db = {};
// MySQL details
config.db.pw = '';
config.db.user = 'root';
config.db.host = '127.0.0.1';
config.db.name = 'dblog';
//wifkey
config.wifkey = '';
//steemconnect
config.sc2 = {};
config.sc2.app = 'steem.app';
config.sc2.callbackURL = 'https://dblog.io';
config.sc2.scope = ['login'];
// RPC nodes
config.rpc = 'ws://127.0.0.1:8090';
config.rpc2 = 'ws://127.0.0.1:8090';
config.rpc3 = 'ws://127.0.0.1:8090';
config.rpchttp = 'http://127.0.0.1:8090';
config.nodejssrv = 'http://127.0.0.1';

module.exports = config;
