const con = require('../conf/mysql')
const config = require('../config')
const dsteem = require('dsteem')

const client = new dsteem.Client(config.rpchttp)

const syncUser = async (uid) => {
  await con.query('UPDATE `users` SET `syncing`=1 WHERE `uid`=?', [uid])
  await startSyncing(uid)
}

const startSyncing = async (uid) => {
  // work in progress
}
