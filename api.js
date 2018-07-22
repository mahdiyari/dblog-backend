// Main API process
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const globalProps = require('./blockchain_apis/database/get_dynamic_global_properties.js')
const loginApis = require('./login_apis')
const getBlogPosts = require('./posts_apis/getBlogPosts')
// support json encoded bodies
app.use(bodyParser.json())
// support encoded bodies
app.use(bodyParser.urlencoded({ extended: true }))

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

app.use('/api/database/get_dynamic_global_properties', globalProps)
app.use('/api/login/confirm_process', loginApis)
app.use('/api/posts/getBlogPosts', getBlogPosts)

const host = process.env.HOST || '127.0.0.1'
const port = process.env.PORT || 4939
app.listen(port, host, () => console.log(`App listening on ${host}:${port}`))
