// Confirming Login process
const express = require('express')
const router = express.Router()
const api = require('../conf/steemconnect')
const con = require('../conf/mysql')
const crypto = require('crypto')

// Process post requests
// This will receive user's id, name, access_token and optional hash_key
// Purpose of this API is to assign a 'hash_key' to each user
// And return hash_key of each logged users
// hash_key is a random generated hex string
router.post('/', (req, res) => {
  res.set('Content-Type', 'application/json')
  try {
    if (req.body.access_token && req.body.username && req.body.uid) {
      const accessToken = req.body.access_token
      // set access_token to steemconnect
      api.setAccessToken(accessToken)
      // user id in the blockchain
      const uid = req.body.uid
      const username = req.body.username
      if (req.body.hash_key) {
        // skip if there was already correct hash_key
        const hashKey = req.body.hash_key
        CheckHash(hashKey, uid, username)
          .then(hash => {
            res.status(200).json({
              hash_key: hash,
              username,
              uid
            })
          })
          .catch(err => {
            res.status(400).json({
              error: 1,
              message: err
            })
          })
      } else {
        // User don't sent a hash_key
        // We will verify user login details then return a hash_key
        con.query('SELECT EXISTS(SELECT `username` FROM `users` WHERE `uid`=?)', [uid])
          .then(results => setOrGetHashKey({ uid, username, results }))
          .then(hash => {
            res.status(200).json({
              hash_key: hash,
              username,
              uid
            })
          })
      }
    } else {
      // User is not authorized
      res.status(401).end()
    }
  } catch (err) {
    res.status(400).json({
      error: 1,
      message: err
    })
  }
})
const setOrGetHashKey = async ({ uid, username, results }) => {
  let exists = results[0]
  for (let i in exists) {
    exists = exists[i]
  }
  if (exists) {
    // User is in the database
    // Get hash_key from database
    let hash = await RetrieveHash(uid)
    return hash
  } else {
    // Insert user to the database
    // and Generate new hash_key
    let hash = await SetHash(uid, username)
    return hash
  }
}

// Checking the hash_key which is sent by the user's cookies
// We will send this hash_key in the respond if it was correct
// This process will avoid calling to the steemconnect
const CheckHash = async (hashKey, uid, username) => {
  // let's check is this user already in the database or not
  let results = await con.query('SELECT EXISTS(SELECT `username` FROM `users` WHERE `uid`=?)', [uid])
  let hash = await checkHashDbCheck({ hashKey, uid, username, results })
  return hash
}
const checkHashDbCheck = async ({ hashKey, uid, username, results }) => {
  results = results[0]
  let exists
  for (let i in results) {
    exists = results[i]
  }
  if (exists) {
    // Username is already in the database
    // We will compare received hash_key vs database
    let results = await con.query('SELECT `hash_key` FROM `users` WHERE `uid`=?', [uid])
    if (results[0].hash_key === hashKey) return hashKey
    else {
      let hash = await RetrieveHash(uid)
      return hash
    }
  } else {
    // Username is not in the database
    // but, user sent a hash_key
    // set a new hash_key
    let hash = await SetHash(uid, username)
    return hash
  }
}

// Get hash_key from database for users who already are in the database
const RetrieveHash = async (uid) => {
  let results = await con.query('SELECT `hash_key` FROM `users` WHERE `uid`=?', [uid])
  // call to steemconnect to verify user is logged in
  let auth = await isAuth()
  if (auth) return (results[0].hash_key)
}

// this function will verify login details by calling to steemconnect
const isAuth = async () => {
  let auth = await new Promise((resolve, reject) => {
    api.me((err, result) => {
      if (!err && result && result.account) {
        resolve(result)
      } else {
        reject(new Error(err))
      }
    })
  })
  return auth
}

// First time login
// Generating new hash_key
const SetHash = async (uid, username) => {
  // Create random hex string (hash_key)
  const hash = crypto.randomBytes(20).toString('hex')
  // call to steemconnect
  // to verify user is logged in
  let auth = await isAuth()
  let id = await auth.account.id
  let user = await auth.user
  if (uid === id && user === username) {
    let results = await con.query(
      'INSERT INTO `users`(`uid`, `username`, `hash_key`) VALUES (?,?,?)',
      [uid, username, hash]
    )
    if (results) return hash
    else throw new Error('db insert fail')
  }
}

// export router to import in the /api.js
module.exports = router

// previosly we used this method to keep one MySQL connection alive
// now, we are using a pool which will handle multiple connections
// we can use it again if any possible error
// setInterval(() => {
//   con.query('SELECT 1', () => {})
// }, 5000)
