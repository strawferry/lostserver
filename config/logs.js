const log4js = require("log4js");

log4js.configure({
    appenders: [
        {type: 'console',},
        {type: 'dateFile', filename: 'logs/app/app.log', category: 'app'},
        {type: 'dateFile', filename: 'logs/error/error.log', category: 'error'},
        {type: 'dateFile', filename: 'logs/data/data.log', category: 'data'},
        {type: 'dateFile', filename: 'logs/debug/debug.log', category: 'debug'},
    ],
    replaceConsole: true
});


const app = log4js.getLogger('app');
app.setLevel('INFO');
const error = log4js.getLogger('error');
const data = log4js.getLogger('data');
const debug = log4js.getLogger('debug');


exports.appinfo = app;
exports.errorlog = error;
exports.datalog = data;
exports.debuglog = debug;