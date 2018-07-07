// Confirming Login process
const express = require('express')
const router = express.Router()
const api = require('../conf/steemconnect')
const con = require('../conf/mysql')
const crypto = require('crypto')

// Process post requests
router.post('/', (req, res) => {
  res.set('Content-Type', 'application/json') // JSON header
  if (req.body.access_token && req.body.username && req.body.uid) {
    const accessToken = req.body.access_token
    api.setAccessToken(accessToken) // set access_token to steemconnect
    const uid = req.body.uid // user id in blockchain
    const username = req.body.username
    if (req.body.hash_key) {
      // skip if there was already correct hash_key
      const hashKey = req.body.hash_key
      CheckHash(hashKey, uid, username, res)
    } else { // User don't have hash_key
      con.query(
        'SELECT EXISTS(SELECT `username` FROM `users` WHERE `uid`=?)',
        [uid],
        (error, results) => setOrGetHashKey({ uid, username, res, error, results })
      )
    }
  } else {
    // Unauthorized
    res.status(401).end()
  }
})
const setOrGetHashKey = ({ res, uid, username, error, results }) => {
  console.log(error)
  if (!error) {
    const exists = results[0][0]
    console.log('exists = ' + exists)
    if (exists) { // Get hash_key from database
      RetrieveHash(uid, username, (result) => {
        res.status(200).send(result)
      })
    } else { // Generate new hash_key
      SetHash(uid, username, (result) => {
        res.status(200).send(result)
      })
    }
  }
}
// Checking the hash_key which is sent by the user's cookies
// We will send this hash_key in the respond if it was correct
// This process will avoid calling to the steemconnect
/* checkHash Start */
const CheckHash = (hashKey, uid, username, res) => {
  // let's check is this user already in the database?
  con.query(
    'SELECT EXISTS(SELECT `username` FROM `users` WHERE `uid`=?)',
    [uid],
    (error, results) => {
      checkHashDbCheck({ res, hashKey, uid, username, error, results })
    }
  )
}
const checkHashDbCheck = ({ res, hashKey, uid, username, error, results }) => {
  if (!error) {
    results = results[0]
    let exists
    for (let i in results) {
      exists = results[i]
    }
    if (exists) {
      // Username is already in the database
      // We will compare received hash_key vs database
      con.query(
        'SELECT `hash_key` FROM `users` WHERE `uid`=?',
        [uid],
        (error, results) => {
          checkHashRetrieve({ res, hashKey, username, uid, error, results })
        }
      )
    } else {
      // Username is not in the database
      // but, user sent a hash_key
      // set a new hash_key
      SetHash(uid, username, res)
    }
  }
}
// Get hash_key from database and compare
const checkHashRetrieve = ({ res, hashKey, username, uid, error, results }) => {
  if (!error) {
    const hash = results[0].hash_key
    // provided hash_key is correct
    if (hash === hashKey) {
      // return hash_key
      res.status(200).send(
        JSON.stringify({
          hash_key: hashKey,
          username: username,
          uid: uid
        })
      )
    } else {
      // provided hashKey is not correct
      // return correct hashKey
      RetrieveHash(uid, username, res)
    }
  }
}
/* CheckHash End */

// Get hash_key from database for users who already are in the database
/* RetrieveHash Start */
const RetrieveHash = (uid, username, res) => {
  con.query(
    'SELECT `hash_key` FROM `users` WHERE `uid`=?',
    [uid],
    (error, results) => RetrieveHashDbCheck({ res, uid, username, error, results })
  )
}
// Process database response and return hash_key
const RetrieveHashDbCheck = ({ res, uid, username, error, results }) => {
  if (!error) {
    // call to steemconnect
    // to verify user is logged in
    api.me((err, ress) => {
      if (!err && ress) {
        // steemconnect access_token is correct
        // user is logged in
        if (ress.account && ress.account.id === uid) {
          if (results[0].hash_key) {
            res.status(200).send(
              JSON.stringify({
                // return result
                username: username,
                uid: uid,
                hash_key: results[0].hash_key
              })
            )
          } else {
            // any error
            res.status(400).send(
              JSON.stringify({
                error: 'invalid request (db die)'
              })
            )
          }
        } else {
          // Not logged in steemconnect
          res.status(400).send(
            JSON.stringify({
              error: 'invalid request (401)'
            })
          )
        }
      } else {
        // steemconnect call error
        res.status(400).send(
          JSON.stringify({
            error: 'invalid request (sc die)'
          })
        )
      }
    })
  }
}
/* RetrieveHash End */

/* SetHash Start */
// First time login
// Generating new hash_key
const SetHash = (uid, username, res) => {
  // Create random hex string (hash_key)
  const hash = crypto.randomBytes(20).toString('hex')
  // call to steemconnect
  // to verify user is logged in
  api.me((err, ress) => {
    if (!err && ress && ress.account && ress.account.id === uid) {
      // user is logged in
      const username = ress.user
      // inserting hash_key and user info to the database
      con.query(
        'INSERT INTO `users`(`uid`, `username`, `hash_key`) VALUES (?,?,?)',
        [uid, username, hash],
        (error, results) => {
          SetHashDbInsert({ res, username, uid, hash, error, results })
        }
      )
    } else {
      // steemconnect call error
      res.status(400).send(
        JSON.stringify({
          error: 'invalid request (sc die)'
        })
      )
    }
  })
}
// Return hash_key after inserting data to the database
const SetHashDbInsert = ({ res, uid, username, hash, error, results }) => {
  if (!error) {
    res.status(200).send(
      JSON.stringify({
        // return result
        username: username,
        uid: uid,
        hash_key: hash
      })
    )
  }
}
/* SetHash End */

// export router to import in the /api.js
module.exports = router

// keep MySQL connection live
// prevent MySQL connection timeout error
setInterval(() => {
  con.query('SELECT 1', () => {})
}, 5000)
