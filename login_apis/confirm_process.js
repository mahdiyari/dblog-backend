// Confirming Login process
const express = require('express');
const router = express.Router();
const api = require('../conf/steemconnect');
const con = require('../conf/mysql');
const crypto = require("crypto");

//Process post requests
router.post('/', function(req, res){
    res.set('Content-Type', 'application/json'); //JSON header
    if(req.body.access_token && req.body.username && req.body.uid){
        console.log(1);
        const access_token = req.body.access_token;
        api.setAccessToken(access_token); //set access_token to steemconnect
        const uid = req.body.uid; //user id in blockchain
        const username = req.body.username;
        if(req.body.hash_key){ // skip if there was already correct hash_key
            console.log(2);
            
            const hash_key = req.body.hash_key;
            CheckHash(hash_key,uid,username,function(result){
                res.status(200).send(result);
            });
        }else{ //User don't have hash_key
            console.log(3);
            
            con.query('SELECT EXISTS(SELECT `username` FROM `users` WHERE `uid`=?)',[uid],
                function (error, results, fields){
                    for (const i in results) {
                        for(const j in results[i]){
                            const exists = results[i][j];
                            if(exists){ // Get hash_key from database
                                console.log(4);
                                
                                RetriveHash(uid,username,function(result){
                                    res.status(200).send(result);
                                });
                            }else{ // Generate new hash_key
                                console.log(5);
                                
                                SetHash(uid,username,function(result){
                                    res.status(200).send(result);
                                });
                            }
                        }
                    }
                }
            );
        }
    }else{
        res.status(401).end(); // Unauthorized
    }
});

function CheckHash(hash_key,uid,username,callback) {
    con.query('SELECT EXISTS(SELECT `username` FROM `users` WHERE `uid`=?)',[uid],
        function (error, results, fields){
            for (const i in results) {
                for(const j in results[i]){
                    const exists = results[i][j];
                    if(exists){ // Username is already in the database
                        con.query('SELECT `hash_key` FROM `users` WHERE `uid`=?',[uid],
                            function (error, results, fields){
                                for (const i in results) {
                                    const hash = results[i].hash_key;
                                    if(hash == hash_key){ // hash_key is correct
                                        callback(JSON.stringify({ // return hash_key
                                            hash_key:hash_key,
                                            username:username,
                                            uid:uid
                                        }));
                                    }else{ // hash_key is not correct
                                        // return correct hash_key
                                        RetriveHash(uid,username,function(result){
                                            callback(result);
                                        });
                                        //callback(JSON.stringify({error:'invalid request'}));
                                    }
                                }
                            }
                        );
                    }else{ // Username is not in the database
                        // set a new hash_key
                        SetHash(uid,username,function(result){
                            callback(result);
                        });
                        //callback(JSON.stringify({error:'invalid request'}));                        
                    }
                }
            }
        }
    );
}
function RetriveHash(uid,username,callback){
    con.query('SELECT `hash_key` FROM `users` WHERE `uid`=?',[uid],
        function (error, results, fields){
            for (const i in results) {
                //call to steemconnect
                api.me(function (err, ress) {
                    if(!err && ress){
                        // steemconnect access_token is correct
                        if(ress.account && ress.account.id == uid){ 
                            if(results[i].hash_key){ //hash_key isn't null
                                callback(JSON.stringify({ // return result
                                    username:username,
                                    uid:uid,
                                    hash_key:results[i].hash_key
                                }));
                            }else{
                                // hash_key is null
                                callback(JSON.stringify({error:'invalid request'}));
                            }
                        }else{
                            // Not logged in steemconnect
                            callback(JSON.stringify({error:'invalid request'}));
                        }
                    }else{
                        // steemconnect call error
                        callback(JSON.stringify({error:'invalid request'}));
                    }
                });
            }
        }
    );
}
function SetHash(uid,username,callback){
    // Create random hash_key
    const hash = crypto.randomBytes(20).toString('hex');
    //call to steemconnect
    api.me(function (err, ress) {
        if(!err && ress){
            if(ress.account && ress.account.id == uid){
                //logged in steemconnect
                const username = ress.user;
                con.query('INSERT INTO `users`(`uid`, `username`, `hash_key`) VALUES (?,?,?)',[uid,username,hash],
                    function (error, results, fields){
                        callback(JSON.stringify({ //return result
                            username:username,
                            uid:uid,
                            hash_key:hash
                        }));
                    }
                );
            }else{
                callback(JSON.stringify({error:'invalid request'}));
            }
        }else{
            // steemconnect call error
            callback(JSON.stringify({error:'invalid request'}));
        }
    });
}
//export API
module.exports = router;

// keep MySQL connection live
setInterval(function (){
	con.query('SELECT 1', function (error, results, fields) {});
},5000);
