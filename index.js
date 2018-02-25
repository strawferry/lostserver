/*
 * server 入口;
 * */

/*
 * 创建 logs 日志文件夹
 * */
try {
    require('fs').mkdirSync('./logs');
    require('fs').mkdirSync('./files');
    require('fs').mkdirSync('./logs/app');
    require('fs').mkdirSync('./logs/error');
    require('fs').mkdirSync('./logs/data');
    require('fs').mkdirSync('./logs/debug');
} catch (e) {
    if (e.code !== 'EEXIST') {
        console.error("Could not set up log directory, error was: ", e);
        process.exit(1);
    }
}

const {appinfo, errorlog, datalog, debuglog} = require('./config/logs');

global.APP = appinfo;
global.ERROR = errorlog;
global.DATA = datalog;
global.DEBUG = debuglog;


const express = require('express'),
    config = require('./config/config'),
    glob = require('glob'),
    helmet = require('helmet'),
    favicon = require('serve-favicon'),
    log4js = require('log4js'),
    routes = require('./routes'),
    bodyParser = require('body-parser'),
    mongoose = require('mongoose');

mongoose.Promise = require('bluebird');

const cors = require('cors');

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;


// if(config.env !== "prod"){
//     // 核心代码，是否开启测试
//     mongoose.set('debug', true);
// }



const db = mongoose.connection;

// If the connection throws an error
db.on('error', function () {
    ERROR.error(`unable to connect to database at ${config.db}`);
    throw new Error('unable to connect to database at ' + config.db);
});
// When the connection is disconnected
db.on('disconnected', function () {
    APP.info('Mongoose default connection to DB :' + config.db + ' disconnected');
});


const gracefulExit = function() {
    db.close(function () {
        console.log('Mongoose default connection with DB :' + config.db + ' is disconnected through app termination');
        process.exit(0);
    });
};

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', gracefulExit).on('SIGTERM', gracefulExit);

try {
    APP.info(`connet to mongodb : ${config.db}`);
    mongoose.connect(config.db, {auto_reconnect: true, poolSize: 10, native_parser: true, replset: {socketOptions: { keepAlive: 1 }}, server: {socketOptions: { keepAlive: 1 }}});
} catch (err) {
    console.log("Sever initialization failed " , err.message);
}



const models = glob.sync(config.root + '/models/*.js');
models.forEach(function (model) {
    require(model);
});
const app = express();
app.use(cors());
app.use(helmet());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());



const User = require('./models/user');
/*
* passport 设置
* */

app.use(passport.initialize());

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, (email, password, done)=>{
    User.findOne({email: email}, (err, user) => {
        if (err) {
            return done(err)
        }
        if (!user) {
            return done(null, false, {failMessage: 'Incorrect email.'})
        }
        return user.comparePassword(password, (err, isMatch) => {
            if (err)
                return done(null, false, {failMessage: err});
            if (!isMatch)
                return done(null, false, {failMessage: 'Incorrect password.'});
            return done(null, user)
        })
    })
}));

passport.serializeUser(function(user, done){
    done(null, user.email)
});
passport.deserializeUser(function(userEmail, done){
    User.findOne({email : userEmail}, function(err, user){
        if(err){
            return done(err, null)
        }
        user.password = '';
        done(null, user)
    })
});

/*
* 需要 token 的 router 设置
* */

const Unit_jwt = require('./config/Unit_jwt');

const PROTECTED_ENDPOINT_LIST = [
    // {url : '/v1/me', method : 'GET'},
    {url : '/v1/me/addcollection/', method : 'GET'},
    {url : '/v1/me/delcollection/', method : 'GET'},
    {url : '/v1/me/myxwlist', method : 'GET'},
    {url : '/v1/me/myzllist', method : 'GET'},
    {url : '/v1/me/mycollection', method : 'GET'},
    {url : '/v1/me/syncstatus', method : 'GET'},
    {url : '/v1/me/tweetlist', method : 'GET'},
    {url : '/v1/me/userlist', method : 'GET'},
    {url : '/v1/me/setstatus', method : 'GET'},
    {url : '/v1/me/setperson', method : 'POST'},

    {url : '/v1/post/add', method : 'POST'},
    {url : '/v1/post/repost', method : 'POST'},
    {url : '/v1/post/setstatus', method : 'GET'},
    {url : '/v1/post/setloststatus', method : 'GET'},
    {url : '/v1/post/uploadFile', method : 'POST'},

];

app.use(function(req, res, next){
    let alreadySend = false;
    for(let i =0; i < PROTECTED_ENDPOINT_LIST.length; i++){
        if (req.url.indexOf(PROTECTED_ENDPOINT_LIST[i].url) !== -1
            && req.method === PROTECTED_ENDPOINT_LIST[i].method){
            console.log('------PROTECTED_ENDPOINT_LIST--------' + req.url);
            // check header or url parameters or post parameters for token
            let token = req.body.token || req.query.token || req.headers['x-access-token']||false;

            if(!token){
                return res.json({code: 1, msg: '该接口必须要有 token 参数!'});
            }else {
                Unit_jwt.verifyToken(token,req, res, next);
            }
            alreadySend = true;
        }
    }
    if(!alreadySend){
        return next();
    }
});

app.use(favicon('./public/img/favicon.ico'));
app.use(log4js.connectLogger(APP, { level: 'auto'}));

app.use(express.static('public'));

const swaggerJSDoc = require('swagger-jsdoc'),
      swaggerTools = require('swagger-tools');

// swagger definition
const swaggerDefinition = {
    info: {
        title: 'lost100 失物招领 API 接口文档',
        version: '1.0.0',
        description: '失物招领 API 接口文档,接口覆盖 H5, APP, 小程序等,可做测试用; 所有需要 token 验证的,验证失败都会返回 code 100 错误 {"code": 100,"msg": "token 错误!"}',
    },
    host: config.host,
    basePath: '/',
};

// options for the swagger docs
const options = {
    // import swaggerDefinitions
    swaggerDefinition: swaggerDefinition,
    // path to the API docs
    apis: ['./controlers/v1/*.js'],
};

// initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

// Initialize the Swagger middleware
swaggerTools.initializeMiddleware(swaggerSpec, (middleware) => {


    app.get("/api/ping", function (req, res) {
        res.json({back: "pong"});
    });
    app.use('/', routes);

    // Interpret Swagger resources and attach metadata to request - must be first in swagger-tools middleware chain
    app.use(middleware.swaggerMetadata());

    // Validate Swagger requests
    app.use(middleware.swaggerValidator({
        validateResponse: false
    }));

    // Route validated requests to appropriate controller
    app.use(middleware.swaggerRouter({
        // controllers: './controllers',  // To enable Mock, you shuold also comment this
        useStubs: /*process.env.NODE_ENV === 'development' ?*/ false /*: false*/ // Conditionally turn on stubs (mock mode)
    }));

    // Serve the Swagger documents and Swagger UI
    app.use(middleware.swaggerUi());


    app.use(function (req, res, next) {
        const err = new Error('Not Found');
        err.status = 404;
        next(err);
    });

    if (app.get('env') === 'development') {
        app.use(function (err, req, res, next) {
            res.status(err.status || 500);
            return res.send({
                message: err.message,
                error: err,
                title: 'error'
            });
        });
    }

    app.use(function (err, req, res, next) {
        if (err.name && err.name === "JsonWebTokenError"){
            return res.json({code: 100, msg: "token 错误!"});
        }else{
            return res.json({code: 1, msg: "服务器错误!"});
        }

    });

});

app.listen(config.port, function () {
    APP.info('Express server listening on port http://localhost:' + config.port);
});



