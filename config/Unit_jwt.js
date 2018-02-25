/*
 *
 *
 * */


const jwt = require('jsonwebtoken'),
    User = require('./../models/user'),
    config = require('./config');


class Unit_jwt {

    static generateToken(payload) {
        // expire in 2 days
        return jwt.sign(payload, config.secret, {expiresIn: 10})
    };



    static verifyToken(token, req, res, next) {
        const user = jwt.verify(token, config.secret, {ignoreExpiration: true});

        User.findOne({_id: user._id}, "_id userID userName avatar email tel createTime token status role agency").exec((err, theuser)=>{
            if (err){next(err)}
            if (theuser) {
                // theuser.password = '';

                /*
                * 单端登录,或者可以设置 3-5 端登录;
                * */
                // if (theuser.token === token){
                //     req.user = theuser;
                //     next();
                // }else{
                //     return res.status(401).json({error: "token 过期或者失效了,请重新登录!"});
                // }
                if(theuser.status === 0){
                    res.json({code: 200, msg: '您涉嫌违规操作,账户被停用,如有异议请联系我们!'})
                }else{
                    req.user = theuser;
                    next();
                }

            } else {
                return res.json({code: 100, msg: 'can\'t find the user'});
            }
        });
    };


}

module.exports = Unit_jwt;
