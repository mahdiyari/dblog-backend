const express = require('express')
const router = express.Router()
const con = require('../conf/mysql')

router.post('/', async (req, res) => {
  res.set('Content-Type', 'application/json')
  try {
    if (req.body.id && req.body.id === 1 && req.body.user) {
      let isSynced = await checkSync(req.body.user)
      if (isSynced === 'syncing') {
        res.status(200).json({
          id: 1,
          result: 'syncing'
        })
      } else if (isSynced === 'not found') {
        res.status(200).json({
          id: 1,
          result: 'not found'
        })
      } else if (isSynced === 'bad sync') {
        res.status(200).json({
          id: 1,
          result: 'bad sync'
        })
      } else if (isSynced === 'synced') {
        let posts = await getUserPosts(req.body.user)
        res.status(200).json(posts)
      }
    } else {
      res.status(400).end()
    }
  } catch (err) {
    res.status(400).end()
  }
})

const checkSync = async (user) => {
  let results = await con.query(
    'SELECT EXISTS(SELECT `uid` FROM `users` WHERE `username` =?)',
    [user]
  )
  let exists
  for (let i in results[0]) exists = results[0][i]
  if (exists) {
    let results = await con.query(
      'SELECT `syncing`,`synced` FROM `users` WHERE `username` =?',
      [user]
    )
    if (results[0].syncing === 1) {
      return 'syncing'
    } else if (results[0].synced === 1) {
      return 'synced'
    } else {
      return 'bad sync'
    }
  } else {
    return 'not found'
  }
}

const getUserPosts = async (user) => {
  let results = await con.query(
    'SELECT `uid` FROM `users` WHERE `username` =?',
    [user]
  )
  let uid
  if (results && results[0] && results[0].uid) uid = results[0].uid
  else throw new Error('bad blog')
  return con.query(
    'SELECT `postid`,`author`,`permlink`,`category`,`authorid`,`timestamp` FROM `posts`' +
    'WHERE `authorid`=? ORDER BY `posts`.`timestamp` DESC',
    [uid]
  )
}

module.exports = router
