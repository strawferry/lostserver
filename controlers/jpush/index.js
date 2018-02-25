


const JPush = require('jpush-sdk'),
    config = require('./../../config/config');
let okPush, client;
if(config.jpush.APP_KEY == 'you_app_key'){
    okPush = false;
}else{
    okPush = true;
    client = JPush.buildClient(config.jpush.APP_KEY, config.jpush.MASTER_SECRET); // 安卓 client
}


exports.all = function (alert, badge, extras) {
    return new Promise((resolve, reject)=>{
        if(okPush){
            client.push().setPlatform(JPush.ALL)
                .setAudience(JPush.ALL)
                // ios(alert,sound,badge,contentAvailable,extras)
                // android(alert, title, builder_id, extras, priority, category, style, value, alertType)
                .setNotification(
                    alert,
                    JPush.ios(alert, 'default', badge, null, extras),
                    JPush.android(alert, null, null, extras)
                )
                .send(function(err, res) {
                    if (err) {
                        reject({err: err.message});
                    } else {
                        resolve(res);
                        // console.log('Sendno: ' + res.sendno);
                        // console.log('Msg_id: ' + res.msg_id);
                    }
                });
        }else{
            resolve({msg: "未配置 JPush"});
        }

    });
};

/*
* alias 可以是数组也可以是当个字符串
* alert 推送内容
* badge 针对 iOS 的角标  null 为不变目前角标, 传入整数设置角标, 也可以设置 +1 在现有加上1
* extras 对象 添加额外信息
* */

exports.alias = function (alias, alert, badge, extras) {
    return new Promise((resolve, reject)=>{
        if(okPush) {
            client.push().setPlatform(JPush.ALL)
                .setAudience(JPush.alias(alias))
                // ios(alert,sound,badge,contentAvailable,extras)
                // android(alert, title, builder_id, extras, priority, category, style, value, alertType)
                .setNotification(
                    alert,
                    JPush.ios(alert, 'default', badge, null, extras),
                    JPush.android(alert, null, null, extras)
                )
                .send(function (err, res) {
                    if (err) {
                        reject({err: err.message});
                    } else {
                        resolve(res);
                        // console.log('Sendno: ' + res.sendno);
                        // console.log('Msg_id: ' + res.msg_id);
                    }
                });
        }else{
            resolve({msg: "未配置 JPush"});
        }
    });
};

/*
 * tags 可以是数组也可以是当个字符串
 * alert 推送内容
 * badge 针对 iOS 的角标  null 为不变目前角标, 传入整数设置角标, 也可以设置 +1 在现有加上1
 * extras 对象 添加额外信息
 * */
exports.tags = function (tags, alert, badge, extras) {
    return new Promise((resolve, reject)=> {
        if(okPush) {
        client.push().setPlatform(JPush.ALL)
            .setAudience(JPush.tag(tags))
            // ios(alert,sound,badge,contentAvailable,extras)
            // android(alert, title, builder_id, extras, priority, category, style, value, alertType)
            .setNotification(
                alert,
                JPush.ios(alert, 'default', badge, null, extras),
                JPush.android(alert, null, null, extras)
            )
            .send(function (err, res) {
                if (err) {
                    reject({err: err.message});
                } else {
                    resolve(res);
                    // console.log('Sendno: ' + res.sendno);
                    // console.log('Msg_id: ' + res.msg_id);
                }
            });
    }
    else{
            resolve({msg: "未配置 JPush"});
        }
    });
};