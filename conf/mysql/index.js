// MySQL connection
const mysql = require('mysql');
const config = require('../../config');
var con = mysql.createConnection({
    host: config.db.host,
    user: config.db.user,
    password: config.db.pw,
    database: config.db.name,
    charset: "utf8mb4"
});

module.exports = con;