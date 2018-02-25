'use strict';
const config = require('./config');
const qiniu_sdk = require('qiniu');
qiniu_sdk.conf.ACCESS_KEY = config.qiniu.ACCESS_KEY;
qiniu_sdk.conf.SECRET_KEY = config.qiniu.SECRET_KEY;
//构建bucketmanager对象
const client = new qiniu_sdk.rs.Client();

exports.uploadFile = function (localFile, key, call) {
    let extra = new qiniu_sdk.io.PutExtra();
    //extra.params = params;
    //extra.mimeType = mimeType;
    //extra.crc32 = crc32;
    //extra.checkCrc = checkCrc;

    qiniu_sdk.io.putFile(uptoken(config.qiniu.public.bucketName), key, localFile, extra, function (err, ret) {
        if (!err) {
            // 上传成功， 处理返回值
            // console.log(config.qiniu.domain+ret.key);
            call(null, config.qiniu.public.domain + ret.key);
            // ret.key & ret.hash
        } else {
            // 上传失败， 处理返回代码
            // console.log(err);
            //console.log("上传七牛文件失败：" + JSON.stringify(err));
            call(err);
            // http://developer.qiniu.com/docs/v6/api/reference/codes.html
        }
    });
};

const uptoken = exports.uptoken = function (bucketname) {
    let putPolicy = new qiniu_sdk.rs.PutPolicy(bucketname);
    //putPolicy.callbackUrl = callbackUrl;
    //putPolicy.callbackBody = callbackBody;
    //putPolicy.returnUrl = returnUrl;
    //putPolicy.returnBody = returnBody;
    //putPolicy.asyncOps = asyncOps;
    //putPolicy.expires = expires;

    return putPolicy.token();
};

//删除资源
exports.removeKey = function (bucket,key,call) {
    client.remove(bucket, key, function(err, ret) {
        if(err){//err={ code: 612, error: 'no such file or directory' }
           call(err);
        }else{
            call();
        }
    });
};

