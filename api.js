// Main API process
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const globalProps = require('./blockchain_apis/database/get_dynamic_global_properties.js')
const confirmProcess = require('./login_apis/confirm_process')
app.use(bodyParser.json()) // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })) // support encoded bodies

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

// Adding APIs
app.use('/api/database/get_dynamic_global_properties', globalProps)
app.use('/api/login/confirm_process', confirmProcess)

// Listening
const host = process.env.HOST || '127.0.0.1'
const port = process.env.PORT || 4939
app.listen(port, host, () => console.log(`App listening on ${host}:${port}`))
