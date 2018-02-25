

const ziji = "_id userID userName avatar email tel createTime token status role agency";
const notoken = "_id userID userName avatar email tel createTime status role";
const postuser = "_id userID userName avatar createTime status role";

const Router = require('express').Router,
    passport = require('passport'),
    User = require('./../../models/user'),
    bcrypt = require('bcrypt-nodejs'),
    Unit_jwt = require('./../../config/Unit_jwt'),
    config = require('./../../config/config'),
    router = new Router(),
    jpush =  require('./../jpush/index'),
    Post = require('./../../models/post'),
    Collection = require('./../../models/collection');

router.get('/', (req, res)=>{
    res.json({message: `${req.originalUrl} -- me api`, user: req.user});
});


/*
* 所有需要 token 验证的,验证失败都会返回 code 100 错误
*    {
*       "code": 100,
*       "msg": "token 错误!"
*     }
* */

/**
 * @swagger
 * /v1/me/register:
 *   post:
 *     operationId: register
 *     tags:
 *       - 账户模块
 *     description: 用户注册
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: 注册需要邮箱和密码
 *         required: true
 *         schema:
 *           $ref: '#/definitions/Login'
 *     responses:
 *       200:
 *         description: >-
 *           ```
 *            错误返回
 *                  {code: 1, msg: "服务器错误!"}
 *                  {code: 2, msg: '必须输入参数!'}
 *                  {code: 3, msg: '用户已经存在!'}
 *            正确返回
 *                  {code: 0, data: "注册成功,快去登录吧!"}
 *            ```
 */

router.post('/register', (req, res, next)=>{

    if (req.body.email && req.body.password) {

        User.findOne({email: req.body.email}).exec((err, auser)=>{
            if(err){
                return next(err);
            }

            if(auser){
                return res.send({code: 3, msg: '用户已经存在!'});
            }

            const salt = bcrypt.genSaltSync();
            let newUser = new User({
                email: req.body.email.toLowerCase(),
                password: bcrypt.hashSync(req.body.password, salt),
            });

            newUser.save((aerr, newUser) => {
                if (aerr) {
                    return next(aerr);
                }
                newUser.password = "";
                return res.json({code: 0, data: "注册成功,快去登录吧!"});
            });
        });

    } else {
        return res.json({code: 2, msg: '必须输入参数!'});
    }
});


/**
 * @swagger
 * /v1/me/login:
 *   post:
 *     operationId: login
 *     tags:
 *       - 账户模块
 *     description: 用户登录
 *     consumes:
 *        - application/json
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: 登录需要邮箱和密码
 *         required: true
 *         schema:
 *           $ref: '#/definitions/Login'
 *     responses:
 *       200:
 *         description: >-
 *           ```
 *              错误返回
 *                  {code: 1, msg: "服务器错误!"}
 *                  {code: 2, msg: "输入邮箱不对!"}
 *                  {code: 3, msg: "输入密码和邮箱不匹配!"}
 *                  {code: 4, msg: "缺少邮箱或者密码!"}
 *              正确返回
 *                  {code: 0, data: user}
 *            ```
 */
router.post('/login', (req, res, next)=>{
    // 通过 passport 做登录认证
    passport.authenticate('local', {session : false}, function(err, user, info){
        if (err) {return next(err)}

        if (!user) {
            console.log(info);
            switch (info.failMessage) {
                case "Incorrect email." :
                    return res.json({code: 2, msg: "输入邮箱不对!"});
                case "Incorrect password." :
                    return res.json({code: 3, msg: "输入密码和邮箱不匹配!"});
            }
            if(info.message === 'Missing credentials' ){
                return res.json({code: 4, msg: "缺少邮箱或者密码!"});
            }
        }

        req.logIn(user, function(err) {

            if (err) { return next(err) }

            let token = Unit_jwt.generateToken({
                _id : user._id,
                email : user.email,
            });

            user.password=undefined;
            user.token=token;

            User.findByIdAndUpdate(user._id, {token: token}, {new: true, select: ziji}, function (err, auser) {
                if (err) {
                    return next(err);
                } else {
                    return res.json({
                        code: 0,
                        data: auser
                    });
                }
            });
        })
    })(req, res, next);
});

/**
 * @swagger
 * /v1/me/syncstatus:
 *   get:
 *     operationId: syncstatus
 *     tags:
 *       - 账户模块
 *     description: 同步服务器登录状态 app 小程序 专用
 *     security:
 *       - token: []
 *     responses:
 *       200:
 *         description: >-
 *           ```
 *              错误返回
 *                  {code: 1, msg: "服务器错误!"}
 *              正确返回
 *                  {code: 0, data: user}
 *            ```
 */
router.get('/syncstatus', (req, res, next)=>{
    return res.json({code: 0, data: req.user});
});


/*
 * 修改密码
 * /me/forgot
 * 错误返回
 * {code: 1, msg: "服务器错误!"}
 * {code: 2, msg: "新密码不能和旧密码一样!"}
 * {code: 3, msg: "旧密码输入有误!"}
 * {code: 4, msg: '邮箱输入有误!请核对后再输入!'}
 * {code: 5, msg:  "参数不能为空!"}
 * 正确返回
 * {code: 0, data: user}
 * */
router.post('/forgot', (req, res, next)=>{

    if (req.body.email && req.body.oldpassword && req.body.newpassword) {

        if (req.body.oldpassword === req.body.newpassword){
            return res.json({code: 2, msg: "新密码不能和旧密码一样!"})
        }else {

            User.findOne({email: req.body.email}).exec((err, auser) => {
                if (err) {
                    return next(err);
                }
                if (auser) {
                    const salt = bcrypt.genSaltSync();
                    const token = Unit_jwt.generateToken({
                        _id: auser._id,
                        email: auser.email,
                    });

                    auser.comparePassword(req.body.oldpassword, (err, isMatch) => {
                        if (err)
                            return next(err);
                        if (isMatch){
                            auser.password = bcrypt.hashSync(req.body.newpassword, salt);
                            auser.token = token;

                            auser.save((err, newUser) => {
                                if (err) {
                                    return next(err);
                                }
                                newUser.password = "";
                                return res.json({code: 0, data: newUser});

                            });
                        }else{
                            res.json({code: 3, msg: "旧密码输入有误!"});
                        }

                    });

                } else {
                    res.json({code: 4, msg: '邮箱输入有误!请核对后再输入!'});
                }

            });

        }

    } else {
        return res.json({code: 5, msg:  "参数不能为空!"});
    }
});

/*
 * 找回密码,通过邮件发送修改密码链接,传去 id 点击直接改密码;
 * 通过控制时间来控制,发送邮件记录时间,同时控制次数,以防发送垃圾邮件;
 * 在点击过程中发邮件有个 第一次时间记录,再次时间
 *
 * 裆疼
 * 考虑一下 redis;这块先不做;
 * */
router.post('/findpwd', (req, res)=>{
    // 1. 判断数据的可靠性

    // 2. 查库,是否有该用户,是否验证码正确

    // 3. 密码加盐保护

    // 4. 返回信息

    if (req.body.email !== undefined && req.body.email !== "" && req.body.oldpassword!== undefined && req.body.oldpassword !== "" && req.body.newpassword!== undefined && req.body.newpassword !== "") {

        if (req.body.oldpassword === req.body.newpassword){
            return res.json({
                success: false,
                message: "新密码不能和旧密码一样"
            })
        }else {

            User.findOne({email: req.body.email}).exec((err, auser) => {
                if (err) {
                    return res.status(500).send({success: false})
                }

                if (auser) {
                    const salt = bcrypt.genSaltSync();
                    const token = Unit_jwt.generateToken({
                        _id: auser._id,
                        email: auser.email,
                    });

                    auser.comparePassword(req.body.oldpassword, (err, isMatch) => {
                        if (err)
                            return done(null, false, {failMessage: err});
                        if (isMatch){
                            auser.password = bcrypt.hashSync(req.body.newpassword, salt);
                            auser.token = token;

                            auser.save((err, newUser) => {
                                if (err) {
                                    return res.status(500).send({success: false})
                                }
                                newUser.password = "";
                                return res.status(200).json(newUser);

                            });
                        }else{
                            res.json({error: "旧密码输入有误!"})
                        }

                    });

                } else {
                    res.json({error: '邮箱输入有误!请核对后再输入!'})
                }

            });

        }

    } else {
        return res.status(400).send({
            success: false,
            message: "参数不能为空!"
        })
    }
    // res.json({post: "修改密码"});
});


/**
 * @swagger
 * /v1/me/addcollection/{id}:
 *   get:
 *     operationId: addcollection
 *     tags:
 *       - 操作
 *     description: 收藏启事
 *     security:
 *       - token: []
 *     produces:
 *       - application/json
 *     parameters:
 *     - name: id
 *       in: path
 *       description: 启事 id
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: >-
 *            ```
 *              错误返回
 *                  {code: 1, msg: "服务器错误!"}
 *                  {code: 2, msg: '您已经收藏过该启事!'}
 *                  {code: 3, msg: "收藏失败,服务器错误!"}
 *                  {code: 4, msg: "传入参数有误"}
 *                  {code: 5, msg: "启事id不能为空!"}
 *              正确返回
 *                  {code: 0, data: '收藏成功!'}
 *            ```
 */
router.get('/addcollection/:id', (req, res, next)=>{

    if (req.params.id){
        Post.findById(req.params.id)
            .populate("user", notoken)
            .populate({path: 'beCollection', select: notoken})
            .exec(function (err, post) {
                if (err) {
                    return next(err);
                } else {
                    if (post){

                        Collection.findOne({user: req.user._id , post: post._id}).exec(function (err, acollect) {
                            if(err) {
                                return next(err);
                            }else{
                                // console.log(acollect);
                                if(acollect){
                                    return res.json({code: 2, msg: '您已经收藏过该启事!'});
                                }else{
                                    let collection = new Collection({
                                        user: req.user._id,
                                        post: post._id
                                    });
                                    let temp = [];
                                    if(post.beCollection){
                                        temp = post.beCollection;
                                    }
                                    temp.push(req.user._id);
                                    post.beCollection = temp;
                                    post.save((err, npost)=>{
                                        if(err) {return next(err);}
                                    });

                                    collection.save(function (err, collect) {
                                        if(err) {
                                            return  res.json({code: 3, msg: "收藏失败,服务器错误!"});
                                        }else{
                                            return res.json({code: 0, data: '收藏成功!'});
                                        }
                                    })
                                }
                            }
                        });


                    }else{
                        return res.json({code: 4, msg: "传入参数有误"})
                    }
                }

            });

    }else{
        return res.json({code: 5, msg: "启事id不能为空!"});
    }
});


/**
 * @swagger
 * /v1/me/delcollection/{id}:
 *   get:
 *     operationId: delcollection
 *     tags:
 *       - 操作
 *     description: 取消收藏启事
 *     security:
 *       - token: []
 *     produces:
 *       - application/json
 *     parameters:
 *     - name: id
 *       in: path
 *       description: 启事 id
 *       required: true
 *       type: string
 *     responses:
 *       200:
 *         description: >-
 *            ```
 *              错误返回
 *                  {code: 1, msg: "服务器错误!"}
 *                  {code: 2, msg: '您还未收藏该启事,所以不能取消收藏!'}
 *                  {code: 3, msg: "收藏失败,服务器错误!"}
 *                  {code: 4, msg: "传入参数有误"}
 *                  {code: 5, msg: "启事id不能为空!"}
 *              正确返回
 *                  {code: 0, data: '取消收藏成功!'}
 *            ```
 */
router.get('/delcollection/:id', (req, res, next)=>{

    if (req.params.id){
        Post.findById(req.params.id)
            .populate("user", notoken)
            // .populate({path: 'beCollection', select: notoken})
            .exec(function (err, post) {
                if (err) {
                    return next(err);
                } else {
                    if (post){

                        Collection.findOne({ user: req.user._id , post: post._id }).exec(function (err, acollect) {
                            if(err) {
                                return next(err);
                            }else{
                                if(acollect){

                                    Collection.findByIdAndRemove(acollect._id).exec(function (err) {
                                        if (err){
                                            return res.json({code: 3, msg: "收藏失败,服务器错误!"});
                                        }else{
                                            let temp = post.beCollection;
                                            temp.splice(temp.indexOf(req.user._id), 1);
                                            post.beCollection = temp;
                                            post.save((err, npost)=>{
                                                if(err) {return next(err);}
                                            });
                                            return res.json({code: 0, data: '取消收藏成功!'});
                                        }
                                    });
                                }else{
                                    return res.json({code: 2, msg: '您还未收藏该启事,所以不能取消收藏!'});
                                }
                            }
                        });
                    }else{
                        return res.json({code: 4, msg: "传入参数有误"})
                    }
                }

            });

    }else{
        return res.json({code: 5, msg: "启事id不能为空!"});
    }
});


/**
 * @swagger
 * /v1/me/myxwlist:
 *   get:
 *     operationId: myxwlist
 *     tags:
 *       - 我的列表
 *     description: 我的寻物启事
 *     security:
 *       - token: []
 *     produces:
 *       - application/json
 *     parameters:
 *      - name: postID
 *        in: query
 *        description: 启事 id
 *        required: false
 *        type: string
 *      - name: sort
 *        in: query
 *        description: 上拉加载 more ,下拉刷新 new
 *        required: false
 *        type: string
 *        enum:
 *          - more
 *          - new
 *      - name: lostStatus
 *        in: query
 *        description: 启事状态 0 未结束 1 已结束
 *        required: false
 *        type: string
 *        enum:
 *          - 0
 *          - 1
 *      - name: limit
 *        in: query
 *        description: 分页 条数
 *        required: false
 *        type: string
 *     responses:
 *       200:
 *         description: >-
 *            ```
 *              limit 每次请求多少条,可空,默认 10 条
 *              postID 传过来的 postID
 *              sort 加载方式 more 上拉加载更多, new 下拉,加载更新的
 *              lostStatus 启事的状态,默认是全部状态都展示, 传入 0 为未结束 传入 1 为已结束
 *              最新数据,就是往 postId 大的,反之往 postId 小的
 *              没有数据返回空数组,自己前端判断
 *              错误返回
 *                  {code: 1, msg: "服务器错误!"}
 *              正确返回
 *                  {code: 0, data: posts}
 *            ```
 */

router.get('/myxwlist', (req, res, next)=>{

    let option = {type: 0, user: req.user._id}, // 寻物启事
        limit = req.query.limit ? Number(req.query.limit) : 10,
        postID = req.query.postID ? req.query.postID : null,
        sort = req.query.sort ? req.query.sort : null,
        sortStatus = -1;

    req.query.lostStatus ? option.lostStatus = Number(req.query.lostStatus) : null;
    // 最新数据 大到小排列
    if (postID) {
        if (sort) {
            if (sort === "more") {
                option._id = {$lt: postID};
                sortStatus = -1;
            } else if (sort === "new") {
                option._id = {$gt: postID};
                sortStatus = 1;
            }
        }
    }

    // 1. 默认情况下,第一次加载,无 postID, sort 默认为 -1
    // 2. 有 postID sort=more,加载更多,获取比 postID 小的数据  sort 为 -1,数据方向正确,直接传给前端,直接 push 进数组
    // 3. 有 postID sort=new,获取比他更新的数据,或者说是 postID 大的数据 sort 为 1,数据方向相反,数据 reverse 传给前端,直接 shift 进数组

    Post.find(option)
        .sort({"_id": sortStatus})
        .limit(limit)
        .populate('user', postuser)
        .exec(function (err, posts) {
            if (err) {
                return next(err);
            } else {
                if (sort === "new") {
                    res.json({code: 0, data: posts.reverse()});
                } else {

                    res.json({code:  0, data: posts});
                }
            }
        });
});


/**
 * @swagger
 * /v1/me/myzllist:
 *   get:
 *     operationId: myzllist
 *     tags:
 *       - 我的列表
 *     description: 我的招领启事
 *     security:
 *       - token: []
 *     produces:
 *       - application/json
 *     parameters:
 *      - name: postID
 *        in: query
 *        description: 启事 id
 *        required: false
 *        type: string
 *      - name: sort
 *        in: query
 *        description: 上拉加载 more ,下拉刷新 new
 *        required: false
 *        type: string
 *        enum:
 *          - more
 *          - new
 *      - name: lostStatus
 *        in: query
 *        description: 启事状态 0 未结束 1 已结束
 *        required: false
 *        type: string
 *        enum:
 *          - 0
 *          - 1
 *      - name: limit
 *        in: query
 *        description: 分页 条数
 *        required: false
 *        type: string
 *     responses:
 *       200:
 *         description: >-
 *            ```
 *              limit 每次请求多少条,可空,默认 10 条
 *              postID 传过来的 postID
 *              sort 加载方式 more 上拉加载更多, new 下拉,加载更新的
 *              lostStatus 启事的状态,默认是全部状态都展示, 传入 0 为未结束 传入 1 为已结束
 *              最新数据,就是往 postId 大的,反之往 postId 小的
 *              没有数据返回空数组,自己前端判断
 *              错误返回
 *                  {code: 1, msg: "服务器错误!"}
 *              正确返回
 *                  {code: 0, data: posts}
 *            ```
 */
router.get('/myzllist', (req, res, next)=>{

    let option = {type: 1, user: req.user._id}, // 招领启事
        limit = req.query.limit ? Number(req.query.limit) : 10,
        postID = req.query.postID ? req.query.postID : null,
        sort = req.query.sort ? req.query.sort : null,
        sortStatus = -1;

    req.query.lostStatus ? option.lostStatus = Number(req.query.lostStatus) : null;
    // 最新数据 大到小排列
    if (postID) {
        if (sort) {
            if (sort === "more") {
                option._id = {$lt: postID};
                sortStatus = -1;
            } else if (sort === "new") {
                option._id = {$gt: postID};
                sortStatus = 1;
            }
        }
    }

    // 1. 默认情况下,第一次加载,无 postID, sort 默认为 -1
    // 2. 有 postID sort=more,加载更多,获取比 postID 小的数据  sort 为 -1,数据方向正确,直接传给前端,直接 push 进数组
    // 3. 有 postID sort=new,获取比他更新的数据,或者说是 postID 大的数据 sort 为 1,数据方向相反,数据 reverse 传给前端,直接 shift 进数组

    Post.find(option)
        .sort({"_id": sortStatus})
        .limit(limit)
        .populate('user', postuser)
        .exec(function (err, posts) {
            if (err) {
                return next(err);
            } else {
                if (sort === "new") {
                    res.json({code: 0, data: posts.reverse()});
                } else {

                    res.json({code:  0, data: posts});
                }
            }
        });
});


/**
 * @swagger
 * /v1/me/mycollection:
 *   get:
 *     operationId: mycollection
 *     tags:
 *       - 我的列表
 *     description: 我的收藏列表
 *     security:
 *       - token: []
 *     produces:
 *       - application/json
 *     parameters:
 *      - name: collection_id
 *        in: query
 *        description: 收藏 id
 *        required: false
 *        type: string
 *      - name: sort
 *        in: query
 *        description: 上拉加载 more ,下拉刷新 new
 *        required: false
 *        type: string
 *        enum:
 *          - more
 *          - new
 *      - name: limit
 *        in: query
 *        description: 分页 条数
 *        required: false
 *        type: string
 *     responses:
 *       200:
 *         description: >-
 *            ```
 *              limit 每次请求多少条,可空,默认 10 条
 *              collection_id 传过来的 collection_id
 *              sort 加载方式 more 上拉加载更多, new 下拉,加载更新的
 *              lostStatus 启事的状态,默认是全部状态都展示, 传入 0 为未结束 传入 1 为已结束
 *              最新数据,就是往 collection_id 大的,反之往 collection_id 小的
 *              没有数据返回空数组,自己前端判断
 *              错误返回
 *                  {code: 1, msg: "服务器错误!"}
 *              正确返回
 *                  {code: 0, data: collections}
 *            ```
 */
router.get('/mycollection', (req, res, next)=>{

    let option = {user: req.user._id}, // 招领启事
        limit = req.query.limit ? Number(req.query.limit) : 10,
        collection_id = req.query.collection_id ? req.query.collection_id : null,
        sort = req.query.sort ? req.query.sort : null,
        sortStatus = -1;

    // 最新数据 大到小排列
    if (collection_id) {
        if (sort) {
            if (sort === "more") {
                option._id = {$lt: collection_id};
                sortStatus = -1;
            } else if (sort === "new") {
                option._id = {$gt: collection_id};
                sortStatus = 1;
            }
        }
    }

    // 1. 默认情况下,第一次加载,无 postID, sort 默认为 -1
    // 2. 有 postID sort=more,加载更多,获取比 postID 小的数据  sort 为 -1,数据方向正确,直接传给前端,直接 push 进数组
    // 3. 有 postID sort=new,获取比他更新的数据,或者说是 postID 大的数据 sort 为 1,数据方向相反,数据 reverse 传给前端,直接 shift 进数组

    Collection.find(option, "post collection_id date")
        .sort({"_id": sortStatus})
        .limit(limit)
        .populate('post')
        .exec(function (err, collections) {
            if (err) {
                return next(err);
            } else {
                if (sort === "new") {
                    res.json({code: 0, data: collections.reverse()});
                } else {
                    res.json({code:  0, data: collections});
                }
            }
        });
});


/**
 * @swagger
 * /v1/me/tweetlist:
 *   get:
 *     operationId: tweetlist
 *     tags:
 *       - 管理员列表
 *     description: 启事审核列表
 *     security:
 *       - token: []
 *     produces:
 *       - application/json
 *     parameters:
 *      - name: postID
 *        in: query
 *        description: 启事 id
 *        required: false
 *        type: string
 *      - name: sort
 *        in: query
 *        description: 上拉加载 more ,下拉刷新 new
 *        required: false
 *        type: string
 *        enum:
 *          - more
 *          - new
 *      - name: status
 *        in: query
 *        description:  启事的审核状态, 0 待审核 1 审核通过 2 审核不通过,不显示前端,邮件通知发布者
 *        required: false
 *        type: string
 *        enum:
 *          - 0
 *          - 1
 *          - 2
 *      - name: limit
 *        in: query
 *        description: 分页 条数
 *        required: false
 *        type: string
 *     responses:
 *       200:
 *         description: >-
 *            ```
 *              limit 每次请求多少条,可空,默认 10 条
 *              postID 传过来的 postID
 *              sort 加载方式 more 上拉加载更多, new 下拉,加载更新的
 *              status 启事的审核状态, 0 待审核 1 审核通过 2 审核不通过,不显示前端,邮件通知发布者
 *              最新数据,就是往 postId 大的,反之往 postId 小的
 *              没有数据返回空数组,自己前端判断
 *              错误返回
 *                  {code: 1, msg: "服务器错误!"}
 *                  {code: 2, msg: '您没有权限查看该数据!'}
 *              正确返回
 *                  {code: 0, data: posts}
 *            ```
 */
router.get('/tweetlist', (req, res, next)=>{
    if(req.user.role > 0){
        let option = {},
            limit = req.query.limit ? Number(req.query.limit) : 10,
            postID = req.query.postID ? req.query.postID : null,
            sort = req.query.sort ? req.query.sort : null,
            sortStatus = -1;

        req.query.status ? option.status = Number(req.query.status) : option.status = 0;
        // 最新数据 大到小排列
        if (postID) {
            if (sort) {
                if (sort === "more") {
                    option._id = {$lt: postID};
                    sortStatus = -1;
                } else if (sort === "new") {
                    option._id = {$gt: postID};
                    sortStatus = 1;
                }
            }
        }
        Post.find(option)
            .sort({"_id": sortStatus})
            .limit(limit)
            .populate('user', postuser)
            .exec((err, posts)=>{
                if (err) {
                    return next(err);
                } else {
                    if (sort === "new") {
                        res.json({code: 0, data: posts.reverse()});

                    } else {
                        // setTimeout(()=>{
                        res.json({code: 0, data: posts});
                        // }, 1000);
                    }
                }
        })

    }else{
        res.json({code: 2, msg: '您没有权限查看该数据!'})
    }

});

/**
 * @swagger
 * /v1/me/userlist:
 *   get:
 *     operationId: userlist
 *     tags:
 *       - 管理员列表
 *     description: 人员审核列表
 *     security:
 *       - token: []
 *     produces:
 *       - application/json
 *     parameters:
 *      - name: userID
 *        in: query
 *        description: 用户 id
 *        required: false
 *        type: string
 *      - name: sort
 *        in: query
 *        description: 上拉加载 more ,下拉刷新 new
 *        required: false
 *        type: string
 *        enum:
 *          - more
 *          - new
 *      - name: status
 *        in: query
 *        description: 用户状态0 删除,违规用户 1 正常用户
 *        required: false
 *        type: string
 *        enum:
 *          - 0
 *          - 1
 *      - name: limit
 *        in: query
 *        description: 分页 条数
 *        required: false
 *        type: string
 *     responses:
 *       200:
 *         description: >-
 *            ```
 *              limit 每次请求多少条,可空,默认 10 条
 *              postID 传过来的 postID
 *              sort 加载方式 more 上拉加载更多, new 下拉,加载更新的
 *              lostStatus 启事的状态,默认是全部状态都展示, 传入 0 为未结束 传入 1 为已结束
 *              最新数据,就是往 postId 大的,反之往 postId 小的
 *              没有数据返回空数组,自己前端判断
 *              错误返回
 *                  {code: 1, msg: "服务器错误!"}
 *                  {code: 2, msg: '您没有权限查看该数据!'}
 *              正确返回
 *                  {code: 0, data: posts}
 *            ```
 */
router.get('/userlist', (req, res, next)=>{
    if(req.user.role > 0){
        let option = {},
            limit = req.query.limit ? Number(req.query.limit) : 10,
            userID = req.query.userID ? req.query.userID : null,
            sort = req.query.sort ? req.query.sort : null,
            sortStatus = -1;

        req.query.status ? option.status = Number(req.query.status) : option.status = 0;
        if (req.query.role){
            if(req.user.role > 1){
                req.query.role ? option.role = Number(req.query.role) : option.role = 0;
            }else{
                return res.json({code: 2, msg: 'req.user.role > 1您没有权限查看该数据!'})
            }
        }




        // 最新数据 大到小排列
        if (userID) {
            console.log(req.query.userID);
            if (sort) {
                console.log(req.query.sort);
                if (sort === "more") {
                    option._id = {$lt: userID};
                    sortStatus = -1;
                } else if (sort === "new") {
                    option._id = {$gt: userID};
                    sortStatus = 1;
                }
            }
        }

        console.log(userID);
        console.log(sort);
        console.log('------option------');
        console.log(option, sortStatus);
        User.find(option, notoken)
            .sort({"_id": sortStatus})
            .limit(limit)
            .exec((err, users)=>{
                if (err) {
                    return next(err);
                } else {
                    console.log(users);
                    if (sort === "new") {
                        res.json({code: 0, data: users.reverse()});
                    } else {
                        // setTimeout(()=>{
                        res.json({code: 0, data: users});
                        // }, 1000);
                    }
                }
            })

    }else{
        res.json({code: 2, msg: 'role > 0 您没有权限查看该数据!'});
    }

});

/**
 * @swagger
 * /v1/me/setstatus:
 *   get:
 *     operationId: setstatus
 *     tags:
 *       - 操作
 *     description: 更改人员权限,和状态
 *     security:
 *       - token: []
 *     produces:
 *       - application/json
 *     parameters:
 *      - name: _id
 *        in: query
 *        description: 用户 id,必填
 *        required: true
 *        type: string
 *      - name: status
 *        in: query
 *        description: 用户状态 0 删除,违规用户 1 正常用户, role 和 status 二者必须选填其一
 *        required: false
 *        type: string
 *        enum:
 *          - 0
 *          - 1
 *      - name: role
 *        in: query
 *        description: 人员权限 0 正常用户, 1 管理员-审核文章 2 超级管理员-可以添加管理员以及审核文章, role 和 status 二者必须选填其一
 *        required: false
 *        type: string
 *        enum:
 *          - 0
 *          - 1
 *          - 2
 *     responses:
 *       200:
 *         description: >-
 *            ```
 *              limit 每次请求多少条,可空,默认 10 条
 *              postID 传过来的 postID
 *              sort 加载方式 more 上拉加载更多, new 下拉,加载更新的
 *              lostStatus 启事的状态,默认是全部状态都展示, 传入 0 为未结束 传入 1 为已结束
 *              最新数据,就是往 postId 大的,反之往 postId 小的
 *              没有数据返回空数组,自己前端判断
 *              错误返回
 *                  {code: 1, msg: '不能修改自己的权限!'}
 *                  {code: 2, msg: '您修改的 status 不变,没有必要修改!'}
 *                  {code: 3, msg: '您权限低于该用户,所以无权修改!'}
 *                  {code: 4, msg: '用户 id 有误!'}
 *                  {code: 5, msg: '您修改的 role 不变,没有必要修改!'}
 *                  {code: 6, msg: '不能设置超级管理员权限!'}
 *                  {code: 7, msg: '参数有误,必须传入你要修改的 status 或者 role!'}
 *                  {code: 8, msg: '参数有误,必须传入用户id!'}
 *                  {code: 9, msg: '您没有权限查看该数据!'}
 *              正确返回
 *                  {code: 0, data: user}
 *            ```
 */
router.get('/setstatus', (req, res, next)=>{
    if(req.user._id == req.query._id){
        res.json({code: 1, msg: '不能修改自己的权限!'});
    }else{
    if(req.user.role > 0){
        let id = req.query._id,
            status = req.query.status,
            role = req.query.role;
        if (id){
            if (status || role){
                if(status){
                    User.findById(id, (err, user)=>{
                        if (err){ return next(err)}
                        if(user){
                            if(req.user.role > user.role){
                                if(user.status == status){
                                    return res.json({code: 2, msg: '您修改的 status 不变,没有必要修改!'});
                                }else{
                                    User.findByIdAndUpdate(id, { status: status}, {new: true, select: notoken}, (err, newUser)=>{
                                        if (err){ return next(err)}
                                        if(newUser){

                                            if(newUser.status === 0){
                                                console.log('---set alias---');
                                                jpush.alias([String(newUser._id)], "您的账户目前已经被限制操作!", 0, {type: "user", user: newUser._id}).then((data)=>{
                                                    console.log(data);
                                                }).catch((err)=>{
                                                    console.log(err);
                                                });
                                            }else if(newUser.status === 1){
                                                console.log('---set alias---');
                                                jpush.alias([String(newUser._id)], "您的账户目前已经解除限制操作!", 0, {type: "user", user: newUser._id}).then((data)=>{
                                                    console.log(data);
                                                }).catch((err)=>{
                                                    console.log(err);
                                                });
                                            }
                                            return res.json({code: 0, data: newUser});
                                        }else{
                                            return res.json({code: 1, msg: '服务器错误!'});
                                        }
                                    })
                                }

                            }else{
                                return res.json({code: 3, msg: '您权限低于该用户,所以无权修改!'});
                            }


                        }else {
                            return res.json({code: 4, msg: '用户 id 有误!'});
                        }
                    });
                }

                if(role){
                    if(role < 2){
                        User.findById(id, (err, user)=>{
                            if (err){ return next(err)}
                            if(user){
                                if(req.user.role > user.role){
                                    if(user.role == role){
                                        return res.json({code: 5, msg: '您修改的 role 不变,没有必要修改!'});
                                    }else{
                                        User.findByIdAndUpdate(id, { role: role}, {new: true, select: notoken}, (err, newUser)=>{
                                            if (err){ return next(err)}
                                            if(newUser){
                                                console.log(newUser);
                                                if(newUser.role === 0){
                                                    console.log('---set alias---');
                                                    jpush.alias([String(newUser._id)], "您已经被解除管理员权限!", 0, {type: "user", user: newUser._id}).then((data)=>{
                                                        console.log(data);
                                                    }).catch((err)=>{
                                                        console.log(err);
                                                    });
                                                }else if(newUser.role === 1){
                                                    console.log('---set alias---');
                                                    jpush.alias([String(newUser._id)], "您已经加入管理员权限!", 0, {type: "user", user: newUser._id}).then((data)=>{
                                                        console.log(data);
                                                    }).catch((err)=>{
                                                        console.log(err);
                                                    });
                                                }
                                                return res.json({code: 0, data: newUser});
                                            }else{
                                                return res.json({code: 1, msg: '服务器错误!'});
                                            }
                                        })
                                    }

                                }else{
                                    return res.json({code: 3, msg: '您权限低于该用户,所以无权修改!'});
                                }


                            }else {
                                return res.json({code: 4, msg: '用户 id 有误!'});
                            }
                        });
                    }else{
                        res.json({code: 6, msg: '不能设置超级管理员权限!'});
                    }
                }

            }else{
                res.json({code: 7, msg: '参数有误,必须传入你要修改的 status 或者 role!'});
            }
        }else{
            res.json({code: 8, msg: '参数有误,必须传入用户id!'});
        }

    }else{
        res.json({code: 9, msg: '您没有权限查看该数据!'});
    }
    }

});

/**
 * @swagger
 * /v1/me/setperson:
 *   post:
 *     operationId: setperson
 *     tags:
 *       - 操作
 *     description: 设置个人信息
 *     security:
 *       - token: []
 *     produces:
 *       - application/json
 *     parameters:
 *      - in: body
 *        name: body
 *        description: 设置用户信息,用户昵称,头像,手机号码;
 *        required: true
 *        schema:
 *          $ref: '#/definitions/Info'
 *     responses:
 *       200:
 *         description: >-
 *            ```
 *              设置用户信息,用户昵称,头像,手机号码;
 *              错误返回
 *                  {code: 1, msg: '不能修改自己的权限!'}
 *                  {code: 2, msg:  "参数不能为空!"}
 *              正确返回
 *                  {code: 0, data: user}
 *            ```
 */
router.post('/setperson', (req, res, next)=>{
    console.log(req.body);

    if (req.body.userName && req.body.avatar && req.body.tel) {
        let userName = req.body.userName,
            avatar = req.body.avatar,
            tel = req.body.tel;
        User.findByIdAndUpdate(req.user._id, { userName: userName, avatar: avatar, tel: tel }, {new: true, select: ziji}, (err, newUser)=>{
            if (err){ return next(err)}
            if(newUser){
                console.log(newUser);
                return res.json({code: 0, data: newUser});
            }else{
                return res.json({code: 1, msg: '服务器错误!'});
            }
        })
    } else {
        return res.json({code: 2, msg:  "参数不能为空!"});
    }

});

/**
 * @swagger
 * /v1/me/getperson/{id}:
 *   get:
 *     operationId: getperson
 *     tags:
 *       - 获取详情
 *     description: 获取个人信息
 *     produces:
 *       - application/json
 *     parameters:
 *      - name: id
 *        in: path
 *        description: 用户 id,必填
 *        required: true
 *        type: string
 *     responses:
 *       200:
 *         description: >-
 *            ```
 *              根据用户 id,获取信息;
 *              错误返回
 *                  {code: 1, msg: '不能修改自己的权限!'}
 *                  {code: 2, msg: '用户 id 参数缺失!'}
 *              正确返回
 *                  {code: 0, data: user}
 *            ```
 */
router.get('/getperson/:id', (req, res, next)=>{
    if(req.params.id){
        User.findById(req.params.id, notoken)
            .exec((err, newUser)=>{
            if (err){ return next(err)}
            if(newUser){
                return res.json({code: 0, data: newUser});
            }else{
                return res.json({code: 1, msg: '服务器错误!'});
            }
        });
    }else{
        return res.json({code: 2, msg: '用户 id 参数缺失!'});
    }

});

/**
 * @swagger
 * /v1/me/getyhlist/{id}:
 *   get:
 *     operationId: getyhlist
 *     tags:
 *       - 获取详情
 *     description: 用户寻物启事列表
 *     produces:
 *       - application/json
 *     parameters:
 *      - name: id
 *        in: path
 *        description: 用户 id,必填
 *        required: true
 *        type: string
 *      - name: postID
 *        in: query
 *        description: 启事 id
 *        required: false
 *        type: string
 *      - name: sort
 *        in: query
 *        description: 上拉加载 more ,下拉刷新 new
 *        required: false
 *        type: string
 *        enum:
 *          - more
 *          - new
 *      - name: limit
 *        in: query
 *        description: 分页 条数
 *        required: false
 *        type: string
 *     responses:
 *       200:
 *         description: >-
 *            ```
 *              根据用户 id,获取信息;
 *              错误返回
 *                  {code: 1, msg: '不能修改自己的权限!'}
 *                  {code: 2, msg: '用户 id 参数缺失!'}
 *              正确返回
 *                  {code: 0, data: user}
 *            ```
 */
router.get('/getyhlist/:id', (req, res, next)=>{

    if (req.params.id){
        let option = {type: req.query.type ? req.query.type: 0, user: req.params.id}, // 寻物启事
            limit = req.query.limit ? Number(req.query.limit) : 10,
            postID = req.query.postID ? req.query.postID : null,
            sort = req.query.sort ? req.query.sort : null,
            sortStatus = -1;
        // 最新数据 大到小排列
        if (postID) {
            if (sort) {
                if (sort === "more") {
                    option._id = {$lt: postID};
                    sortStatus = -1;
                } else if (sort === "new") {
                    option._id = {$gt: postID};
                    sortStatus = 1;
                }
            }
        }

        // 1. 默认情况下,第一次加载,无 postID, sort 默认为 -1
        // 2. 有 postID sort=more,加载更多,获取比 postID 小的数据  sort 为 -1,数据方向正确,直接传给前端,直接 push 进数组
        // 3. 有 postID sort=new,获取比他更新的数据,或者说是 postID 大的数据 sort 为 1,数据方向相反,数据 reverse 传给前端,直接 shift 进数组

        Post.find(option)
            .sort({"_id": sortStatus})
            .limit(limit)
            .populate('user', postuser)
            .exec(function (err, posts) {
                if (err) {
                    return next(err);
                } else {
                    if (sort === "new") {
                        res.json({code: 0, data: posts.reverse()});
                    } else {

                        res.json({code:  0, data: posts});
                    }
                }
            });
    }else{
        return res.json({code: 2, msg: '用户 id 参数缺失!'});
    }

});


const CWD = require('hookding');

router.post("/webhook", CWD());


module.exports = router;