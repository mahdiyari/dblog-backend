const con = require('../conf/mysql')
const config = require('../config')
const fetch = require('node-fetch')

// we will start syncing users data if user is not synced already
// these functions will insert comments and posts of all Dblog users to the database
// we need just constant details like permlink, author, id, created, and etc
// later we can use RPC nodes to get body, title, and etc
const syncUser = async (username, uid) => {
  try {
    let results = await con.query(
      'SELECT `synced`,`syncing` FROM `users` WHERE `uid`=?',
      [uid]
    )
    if (results[0].synced === 0 && results[0].syncing === 0) {
      // syncing posts and comments started
      // we will update database to don't sync again same user in the future
      await con.query(
        'UPDATE `users` SET `syncing`=1 WHERE `uid`=?',
        [uid]
      )
      let posts = await getAllPosts(username)
      await insertPosts(posts, username, uid)
      let comments = await getAllComments(username)
      await insertComments(comments, username, uid)
      // User sync finished
      // update database
      con.query(
        'UPDATE `users` SET `syncing`=0,`synced`=1 WHERE `uid`=?',
        [uid]
      )
      // We will send username to the stream_sync.js API
      // stream_sync.js will stream blocks to detect new posts and comments from all users
      let body = JSON.stringify({
        id: 1,
        user: username
      })
      fetch(
        config.stream_sync,
        {
          method: 'POST',
          body
        }
      )
    }
  } catch (err) {
    console.error(err)
  }
}

const getAllPosts = async (username) => {
  let posts = []
  let startPermlink
  let startAuthor
  let nextPosts
  do {
    nextPosts = await call(
      'call',
      [
        'database_api',
        'get_discussions_by_blog',
        [{
          limit: 100,
          tag: username,
          start_author: startAuthor,
          start_permlink: startPermlink
        }]
      ]
    )
    if (nextPosts.length === 100) {
      startPermlink = nextPosts[99].permlink
      startAuthor = nextPosts[99].author
    }
    // Returning all posts.id to the pos
    // we will check duplicate values with the help of this ids
    let pos = posts.map(post => {
      return post.id
    })
    for (let post of nextPosts) {
      if (post.author === username && pos.indexOf(post.id) < 0) posts.push(post)
    }
  } while (nextPosts.length === 100)
  return posts
}

const getAllComments = async (username) => {
  let comments = []
  let startPermlink
  let nextComments
  let startAuthor = username
  do {
    nextComments = await call(
      'call',
      [
        'database_api',
        'get_discussions_by_comments',
        [{
          limit: 100,
          tag: username,
          start_author: startAuthor,
          start_permlink: startPermlink
        }]
      ]
    )
    if (nextComments.length === 100) {
      startPermlink = nextComments[99].permlink
      startAuthor = nextComments[99].author
    }
    let com = comments.map((comment) => {
      return comment.id
    })
    for (let comment of nextComments) {
      if (comment.author === username && com.indexOf(comment.id) < 0) comments.push(comment)
    }
  } while (nextComments.length === 100)
  return comments
}

const insertPosts = async (posts, username, uid) => {
  for (let post of posts) {
    let created = post.created
    let date = new Date(created + 'Z')
    let timestamp = date.getTime() / 1000
    let results = await con.query(
      'SELECT EXISTS(SELECT `postid` FROM `posts` WHERE `postid`=?)',
      [post.id]
    )
    let exists = results[0]
    for (let i in exists) exists = exists[i]
    if (!exists) {
      await con.query(
        'INSERT INTO `posts`' +
        '(`permlink`,`created`,`author`,`authorid`,`postid`,`category`,`timestamp`)' +
        'VALUES(?,?,?,?,?,?,?)',
        [
          post.permlink,
          post.created,
          username,
          uid,
          post.id,
          post.category,
          timestamp
        ]
      )
    }
  }
}

const insertComments = async (comments, username, uid) => {
  for (let comment of comments) {
    let created = comment.created
    let date = new Date(created + 'Z')
    let timestamp = date.getTime() / 1000
    let results = await con.query(
      'SELECT EXISTS(SELECT `commentid` FROM `comments` WHERE `commentid`=?)',
      [comment.id]
    )
    let exists = results[0]
    for (let i in exists) exists = exists[i]
    if (!exists) {
      await con.query(
        'INSERT INTO `comments`' +
        '(`permlink`,`created`,`author`,`authorid`,`commentid`,`category`,`parentpermlink`,`parentauthor`,`timestamp`)' +
        'VALUES(?,?,?,?,?,?,?,?,?)',
        [
          comment.permlink,
          comment.created,
          username,
          uid,
          comment.id,
          comment.category,
          comment.parent_permlink,
          comment.parent_author,
          timestamp
        ]
      )
    }
  }
}

// We will use this function to make calls to the RPC node
// It is faster than using official libraries (I don't know why!)
const call = async (method, params) => {
  let body = {
    id: 0,
    jsonrpc: '2.0',
    method,
    params
  }
  body = JSON.stringify(body)
  let result = await fetch(
    config.rpchttp,
    {
      method: 'POST',
      body
    }
  )
  result = await result.json()
  return result.result
}

module.exports = syncUser
