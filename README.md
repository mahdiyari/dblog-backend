# dblog-backend
The back-end for dblog.io - A decentralized blogging platform on the Steem blockchain
---
#### Commands:
```
npm install
npm run start // will start api.js by pm2 process manager
npm run logs // application logs
npm run restart //you should restart api.js after any changes
npm run stop // you should stop api.js in the end
```
---
#### Explaining the structure of dblog-backend:
Main server file is api.js which will be started with npm start  
The config file is config.js which includes all needed variables!  
Under the /conf/ folder, needed configurations will be added. Currently, we have `steemconnect/index.js` for initializing steemconnect and `/mysql/index.js` for creating a MySql connection.  
Under the `/blockchain_apis/` needed RPC calls will be added. Currently, there is a database API `get_dynamic_global_properties.js`  
Under the `/login_apis/` needed functions for the login process will be added. Currently, we added a `confirm_process.js` for assigning a unique hex string (called `hashKey`) to the logged in users.  
We will keep that unique `hashKey` instead of `access_token` (access_token provided by steemconnect and used to upvote, comment, and etc) in the database for validating other operations which will help to reduce security concerns.  
`confirm_process` will check to see there is any `hashKey` in the request, then it will check that `hashKey` against the database. if there was not a `hashKey` in the request, confirm_process will assign a new `hashKey` for that user after checking login credentials.  
We will use `dynamic_global_properties` in the front-end for some calculations. Like converting VESTS to the STEEM  
