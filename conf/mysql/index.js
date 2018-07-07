// MySQL connection
const mysql = require('mysql')
// import config file
const config = require('../../config')
var con = mysql.createConnection({
  host: config.db.host, // MySQL host
  user: config.db.user, // MySQL username
  password: config.db.pw, // MySQL password
  database: config.db.name, // MySQL database
  charset: 'utf8mb4' // MySQL charset (fix possible charset errors)
})

// export con to import in the other files
module.exports = con
