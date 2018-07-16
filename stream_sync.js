/*
* This file will stream block numbers and will process block operations
* then it will check to find comments and posts
* then it will insert comments and posts from Dblog users to the database
* we will insert only constant values to the database (permlink, author, created, category,...)
* later we can get body, title and etc from RPC node
*/
const steem = require('steem')
const express = require('express')
const bodyParser = require('body-parser')
const con = require('./conf/mysql')
const config = require('./config')

steem.api.setOptions({ url: config.rpc })

let users = []
let posts = []
let lastBlock
let syncOldBlock = process.env.SYNC_OLD_BLOCK || null

// this function will get all users from database (users[])
const fillUsers = async () => {
  let results = await con.query(
    'SELECT `username` FROM `users`'
  )
  for (let result of results) {
    users.push(result.username)
  }
}
fillUsers()

// this function will stream block numbers
// we can use lastBlock to continue syncing from that block if an error occurred
steem.api.streamBlockNumber((err, block) => {
  if (err) throw new Error(err)
  lastBlock = block
  processBlock(block)
    .catch(err => {
      console.error(`Last Block: ${lastBlock}`, err)
    })
})

// if we pass 'SYNC_OLD_BLOCK' which is last synced block as environment variable
// this function will sync missed blocks from block 'SYNC_OLD_BLOCK' to 'currentBlock'
const processOldBlocks = async (syncOldBlock) => {
  let globals = await steem.api.getDynamicGlobalPropertiesAsync()
  let currentBlock = globals.head_block_number
  for (let i = syncOldBlock; i <= currentBlock; i++) {
    processBlock(i)
  }
}
if (syncOldBlock) processOldBlocks(syncOldBlock)

// this function will receive a block number and will send operations to the processOp function
const processBlock = async (block) => {
  await steem.api.getOpsInBlockAsync(block, false)
    .map(blockop => {
      processOp(blockop.op)
        .catch(err => console.error(err))
    })
}

// this function will separate comments from posts
// then will send data to the 'insert to database' functions
const processOp = async (op) => {
  if (op[0] === 'comment' && users.indexOf(op[1].author) > -1) {
    if (op[1].parent_author === '') {
      insertPostToDb(op[1].author, op[1].permlink)
    } else {
      insertCommentToDb(op[1].author, op[1].permlink)
    }
  }
}

// we used 'uid' (user id in blockchain which is authorid)
// to select posts and comments faster from database
// selecting from MySQL by an integer (uid) is faster than selecting by a text (author)
const insertPostToDb = async (author, permlink) => {
  try {
    let post = await steem.api.getContentAsync(author, permlink)
    // select authorid from database
    // database is faster than RPC nodes
    let results = await con.query(
      'SELECT `uid` FROM `users` WHERE `username`=?',
      [author]
    )
    let authorid = results[0].uid
    let created = post.created
    let date = new Date(created + 'Z')
    let timestamp = date.getTime() / 1000
    if (posts.indexOf(post.id) < 0) {
      let results = await con.query(
        'SELECT EXISTS(SELECT `postid` FROM `posts` WHERE `postid`=?)',
        [post.id]
      )
      let exists = results[0]
      for (let i in exists) exists = exists[i]
      if (!exists) {
        let index = await postsIndex()
        posts[index] = post.id
        await con.query(
          'INSERT INTO `posts`' +
          '(`permlink`,`created`,`author`,`authorid`,`postid`,`category`,`timestamp`)' +
          'VALUES(?,?,?,?,?,?,?)',
          [
            permlink,
            created,
            author,
            authorid,
            post.id,
            post.category,
            timestamp
          ]
        )
      }
    }
  } catch (err) {
    console.error(err)
  }
}

// same as above function with two extra infromation (parentpermlink & parentauthor)
const insertCommentToDb = async (author, permlink) => {
  try {
    let comment = await steem.api.getContentAsync(author, permlink)
    let results = await con.query(
      'SELECT `uid` FROM `users` WHERE `username`=?',
      [author]
    )
    let authorid = results[0].uid
    let created = comment.created
    let date = new Date(created + 'Z')
    let timestamp = date.getTime() / 1000
    if (posts.indexOf(comment.id) < 0) {
      let results = await con.query(
        'SELECT EXISTS(SELECT `commentid` FROM `comments` WHERE `commentid`=?)',
        [comment.id]
      )
      let exists = results[0]
      for (let i in exists) exists = exists[i]
      if (!exists) {
        let index = await postsIndex()
        posts[index] = comment.id
        await con.query(
          'INSERT INTO `comments`' +
          '(`permlink`,`created`,`author`,`authorid`,`commentid`,`category`,`parentpermlink`,`parentauthor`,`timestamp`)' +
          'VALUES(?,?,?,?,?,?,?,?,?)',
          [
            permlink,
            created,
            author,
            authorid,
            comment.id,
            comment.category,
            comment.parent_permlink,
            comment.parent_author,
            timestamp
          ]
        )
      }
    }
  } catch (err) {
    console.error(err)
  }
}

// we will use this function to save recent posts in the 'posts[]'
// if a user broadcasts multiple 'edited posts' to the blockchain
// we may add same post, multiple times to the database
// because INSERT in MySQL is not fast enough to insert data
// and that may process multiple INSERTs at the same time
// we can check posts against 'posts[]' variable
// to ensure there will not be any duplicate posts in the database
// this function will return a number from 0 to 500 as index (posts[index])
// to create a pool of posts to keep recent posts and delete older posts
let index = 0
let maxIndex = 500
const postsIndex = async () => {
  if (index < maxIndex) index += 1
  else index = 0
  return index
}

/*
* We will use expressJS to update 'users[]' to sync new registered users
* this functions will push received user to the 'users[]'
*/
const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.post('/', async (req, res) => {
  try {
    res.set('Content-Type', 'application/json')
    if (req.body.id && req.body.id === '1' && req.body.user) {
      let update = await updateUsers(req.body.user)
      if (update) {
        res.status(200).json({
          id: 1,
          result: 'Successfully updated'
        })
      } else {
        res.status(200).json({
          id: 0,
          result: 'Not Found'
        })
      }
    } else {
      res.status(400).end()
    }
  } catch (err) {
    console.error(err)
    res.status(400).end()
  }
})

const updateUsers = async (user) => {
  let results = await con.query(
    'SELECT EXISTS(SELECT `username` FROM `users` WHERE `username`=?)',
    [user]
  )
  for (let i in results[0]) {
    if (results[0][i]) {
      if (users.indexOf(user)) users.push(user)
      return 1
    } else {
      return 0
    }
  }
}

const host = process.env.HOST || '127.0.0.1'
const port = process.env.PORT || 4938
app.listen(port, host, () => console.log(`App listening on ${host}:${port}`))
