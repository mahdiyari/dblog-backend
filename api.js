// Main API process
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const global_props = require('./blockchain_apis/database/get_dynamic_global_properties.js');
const confirm_process = require('./login_apis/confirm_process');
app.use(bodyParser.json()); //support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); //support encoded bodies

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

//Adding APIs
app.use('/api/database/get_dynamic_global_properties', global_props);
app.use('/api/login/confirm_process', confirm_process);

//Listening
const host = "127.0.0.1";
const port = 4939;
app.listen(port,host, () => console.log(`App listening on ${host}:${port}`));
