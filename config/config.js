const path = require('path'),
    rootPath = path.normalize(__dirname + '/../..'),
    port = process.env.PORT || 5566,
    host = process.env.HOST || `localhost:5566`,
    secret = "SECRET_TOKEN",
    env = process.env.NODE_ENV || 'dev',
    qiniu = {
        ACCESS_KEY: "you_access_key",
        SECRET_KEY: "you_secret_key",
        public: {
            bucketName: "you_bucketName",
            domain: "you_domain"
        }
    },
    jpush = {
        APP_KEY: "you_app_key",
        MASTER_SECRET: "you_master_secret"
    };
const config = {
    dev: {
        env: 'dev',
        secret,
        qiniu,
        jpush,
        root: rootPath,
        port: port,
        host: host,
        db: "mongodb://localhost:27017/lostserver"
    },
    prod: {
        env: 'prod',
        secret,
        qiniu,
        jpush,
        root: rootPath,
        port: port,
        host: host,
        db: "mongodb://localhost:37017/lostserver"
    }
};
module.exports = config[env];
