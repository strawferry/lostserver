const Router = require('express').Router,
    router = new Router(),
    path = require('path'),
    fs = require('fs'),
    uuid = require('node-uuid'),
    formidable = require('formidable'),
    config = require('./../../config/config'),
    qiniu = require('./../../config/qiniu'),
    unit = require('./../../config/unit'),
    jpush = require('./../jpush/index'),
    Collection = require('./../../models/collection'),
    Post = require('./../../models/post');
const notoken = "_id userID userName avatar email tel createTime status role";


/**
 * @swagger
 * /v1/post/list:
 *   get:
 *     operationId: list
 *     tags:
 *       - 获取详情
 *     description: 首页列表
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
 *        description: 启事的状态 0 未结束 1 已结束, lostStatus,type,status 三者,只能其一存在
 *        required: false
 *        type: string
 *        enum:
 *          - 0
 *          - 1
 *      - name: type
 *        in: query
 *        description: 启事类型 0 寻物启事 1 招领启事, lostStatus,type,status 三者,只能其一存在
 *        required: false
 *        type: string
 *        enum:
 *          - 0
 *          - 1
 *      - name: status
 *        in: query
 *        description: 启事的审核状态, 0 待审核 1 审核通过 2 审核不通过,不显示前端,邮件通知发布者, lostStatus,type,status 三者,只能其一存在
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
 *              lostStatus 启事的状态,默认是全部状态都展示, 传入 0 为未结束 传入 1 为已结束, lostStatus,type,status 三者,只能其一存在
 *              type: 启事类型 0 寻物启事 1 招领启事, lostStatus,type,status 三者,只能其一存在
 *              status 启事的审核状态, 0 待审核 1 审核通过 2 审核不通过,不显示前端,邮件通知发布者, lostStatus,type,status 三者,只能其一存在
 *              最新数据,就是往 postId 大的,反之往 postId 小的
 *              没有数据返回空数组,自己前端判断
 *              错误返回
 *                  {code: 1, msg: "服务器错误!"}
 *              正确返回
 *                  {code: 0, data: posts}
 *            ```
 */

router.get('/list', (req, res, next) => {

    let option = {},
        limit = req.query.limit ? Number(req.query.limit) : 10,
        postID = req.query.postID ? req.query.postID : null,
        sort = req.query.sort ? req.query.sort : null,
        sortStatus = -1;

    console.log(req.query);

    req.query.lostStatus ? option.lostStatus = Number(req.query.lostStatus) : null;
    req.query.type ? option.type = Number(req.query.type) : null;
    req.query.status ? option.status = Number(req.query.status) : option.status = 1;
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
        .populate('user', notoken)
        .exec(function (err, posts) {
            if (err) {
                return next(err);
            } else {
                if (sort === "new") {
                        res.json({code: 0, data: posts});

                } else {
                    // setTimeout(()=>{

                        res.json({code: 0, data: posts});
                    // }, 1000);
                }
            }

        });
});

/**
 * @swagger
 * /v1/post/detail/{id}:
 *   get:
 *     operationId: detail
 *     tags:
 *       - 获取详情
 *     description: 启事详情
 *     produces:
 *       - application/json
 *     parameters:
 *      - name: id
 *        in: path
 *        description: 启事 id,必填
 *        required: true
 *        type: string
 *     responses:
 *       200:
 *         description: >-
 *            ```
 *              根据启事 id,获取详情;
 *              错误返回
 *                  {code: 1, msg: '服务器错误!'}
 *              正确返回
 *                  {code: 0, data: post}
 *            ```
 */
router.get('/detail/:id', (req, res, next) => {

    Post.findById(req.params.id)
        .populate('user', notoken)
        .exec(function (err, post) {
            if (err) {
                return next(err);
            } else {
                // setTimeout(()=>{
                        return res.json({code: 0, data: post});
                    // },2000);

            }

        });
});


/**
 * @swagger
 * /v1/post/add:
 *   post:
 *     operationId: add
 *     tags:
 *       - 发布启事
 *     description: 发布启事
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
 *          $ref: '#/definitions/PostBody'
 *     responses:
 *       200:
 *         description: >-
 *            ```
 *              设置用户信息,用户昵称,头像,手机号码;
 *               * {
 *                      title: str
 *                      desc: str
 *                      type: 0 // 0 寻物启事 1 招领启事
 *                      location: str // 捡到东西地址
 *                      date: // 捡到时间,手输入或者设置
 *                      images: // 多图数组,数组[0]为首图
 *                  }
 *              错误返回
 *                  {code: 1, msg: '不能修改自己的权限!'}
 *                  {code: 2, msg: '发布失败,服务器异常!'}
 *                  {code: 3, msg: '发布的内容必须认真填写满!'}
 *              正确返回
 *                  {code: 0, data: user}
 *            ```
 */
router.post('/add', (req, res, next) => {
    console.log(req.body);
    if (req.body.title
        && req.body.desc
        && req.body.type !== null
        && req.body.location
        && req.body.date
        && req.body.images && req.body.images.length > 0
    ){
        let title = req.body.title,
            desc = req.body.desc,
            type = req.body.type,
            location = req.body.location,
            date = req.body.date,
            images = req.body.images,
            mainImage = images[0],
            user = req.user._id;

        let post = new Post({
            changeDate: Date.now(),
            title: title,
            desc: desc,
            type: type,
            location: location,
            date: date,
            images: images,
            mainImage: mainImage,
            user: user,
        });
        post.save(function (err, apost) {
            if (err) {
                return next(err);
            }
            if(apost){

                // 通知管理员, role tags
                jpush.tags('role', `有条新启事,需要审核:${unit.strsub(apost.title)}`, 1, {type: "post", post: apost._id})
                    .then((res)=>{
                    console.log(res)
                    })
                    .catch((err)=>{
                        console.log(err)
                    });

                return res.json({code: 0, data: apost});
            }else{
                return res.json({code: 2, msg: '发布失败,服务器异常!'})
            }

        });
    }else{
        res.json({code: 3, msg: '发布的内容必须认真填写满!'});
    }
});


/**
 * @swagger
 * /v1/post/repost/{id}:
 *   post:
 *     operationId: repost
 *     tags:
 *       - 发布启事
 *     description: 修改启事
 *     security:
 *       - token: []
 *     produces:
 *       - application/json
 *     parameters:
 *      - name: id
 *        in: path
 *        description: 原有启事 id
 *        required: true
 *        type: string
 *      - in: body
 *        name: body
 *        description: 设置用户信息,用户昵称,头像,手机号码;
 *        required: true
 *        schema:
 *          $ref: '#/definitions/PostBody'
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
router.post('/repost/:id', (req, res, next) => {
    if(req.params._id){
        if (req.body.title
            && req.body.desc
            && req.body.type
            && req.body.location
            && req.body.date
            && req.body.images !== undefined && req.body.images.length > 0
        ){
            let title = req.body.title,
                desc = req.body.desc,
                type = req.body.type,
                location = req.body.location,
                date = req.body.date,
                images = req.body.images,
                mainImage = images[0],
                user = req.user._id;

            Post.findById(id)
                .populate("user", notoken)
                .exec((err, post)=>{
                    if (err){ return next(err)}
                    if(post){
                        post.title = title;
                        post.desc = desc;
                        post.type = type;
                        post.location = location;
                        post.date = date;
                        post.images = images;
                        post.mainImage = images[0];
                        post.changeDate = Date.now();

                        post.save(function (err, apost) {
                            if (err) {
                                return next(err);
                            }
                            if(apost){
                                return res.json({code: 0, data: apost});
                            }else{
                                return res.json({code: 2, msg: '发布失败,服务器异常!'})
                            }
                        });
                    }else{
                        res.json({code: 5, msg: '传入的启事 id 有误!'});
                    }
                });
        }else{
            res.json({code: 3, msg: '发布的内容必须认真填写完整!'});
        }
    }else{
        res.json({code: 4, msg: '必须传入原本启事的 id!'});
    }

});

/**
 * @swagger
 * /v1/post/uploadFile:
 *   post:
 *     operationId: uploadFile
 *     tags:
 *       - 发布启事
 *     description: 上传图片文件等
 *     security:
 *       - token: []
 *     consumes:
 *       - multipart/form-data
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: file
 *         in: formData
 *         description: file to upload
 *         required: false
 *         type: file
 *       - name: files
 *         in: formData
 *         description: Additional data to pass to server
 *         required: true
 *         type: string
 *
 *
 *     responses:
 *       200:
 *         description: >-
 *            ```
 *              设置用户信息,用户昵称,头像,手机号码;
 *              错误返回
 *                  {code: 1, msg: '不能修改自己的权限!'}
 *                  {code: 2, msg: '图片大小超过3M,请选取其他图片!'}
 *                  {code: 3, msg: "请先选择图片!"}
 *              正确返回
 *                  {code: 0, data: result}
 *            ```
 */
router.route('/uploadFile').post(function (req, res, next) {
    let fileNewName = uuid.v4() + ".jpg";
    let form = new formidable.IncomingForm();
    form.uploadDir = "./files";

    //设置上传数据的编码
    form.encoding = 'utf-8';
    //设置是否保持上传文件的拓展名
    form.keepExtensions = true;
    //文件上传过程中触发可以做上传进度查看
    form.on('progress', function (bytesReceived, bytesExpected) {
        if (bytesExpected > 1024 * 1024 * 3) {
            // this.emit('error', "文件过大");
            return res.json({code: 2, msg: '图片大小超过3M,请选取其他图片!'})
        }
    });
    //文件上传成功后触发
    form.on('file', function (name, file) {});
    form.on('error', function (err) {
        // res.send({
        //     success: false,
        //     msg: err
        // });
        return next(err);
    });
    //执行文件上传任务
    form.parse(req, function (err, fields, files) {
        console.log(files.files);
        if (files.files) {
            let filePath = files.files.path;
            if(config.qiniu.ACCESS_KEY === "you_access_key"){
                return res.json({code: 0, data: 'https://unsplash.it/800/600?random'})
            }else{
                qiniu.uploadFile(filePath, fileNewName, function (err, result) {
                    fs.unlink(filePath);
                    if (err){
                        return next(err);
                    } else {
                        return res.json({code: 0, data: result})
                    }
                });
            }
        } else {
            return res.json({code: 3, msg: "请先选择图片!"});
        }
    });
});

/**
 * @swagger
 * /v1/post/setstatus:
 *   get:
 *     operationId: setstatus
 *     tags:
 *       - 操作
 *     description: 更改启事审核状态
 *     security:
 *       - token: []
 *     produces:
 *       - application/json
 *     parameters:
 *      - name: _id
 *        in: query
 *        description: 启事 id,必填
 *        required: true
 *        type: string
 *      - name: status
 *        in: query
 *        description: 启事审核状态 0 待审核 1 审核通过 2 审核不通过
 *        required: false
 *        type: string
 *        enum:
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
 *                  {code: 3, msg: '参数有误,必须传入你要修改的 status!'}
 *                  {code: 4, msg: '参数有误,必须传入启事 id!'}
 *                  {code: 5, msg: '您没有权限查看该数据!'}
 *              正确返回
 *                  {code: 0, data: post}
 *            ```
 */
router.get('/setstatus', (req, res, next)=>{
    if(req.user.role > 0){
        let id = req.query._id,
            status = req.query.status;
        if (id){
            if (status){

                    Post.findById(id)
                        .populate("user", notoken)
                        .exec((err, post)=>{
                        if (err){ return next(err)}
                        if(post){
                                if(post.status == status){
                                    return res.json({code: 2, msg: '您修改的 status 不变,没有必要修改!'});
                                }else{
                                    post.status = status;
                                    post.save((err, npost)=>{
                                        if (err){ return next(err)}
                                        if(npost){
                                            let alert = '您的启事已经审核通过了!';
                                            if(npost.status == 2){
                                                alert = '您的启事审核不通过!';
                                            }
                                            jpush.alias([String(npost.user._id)], alert, 0, {type: "post", post: npost._id}).then((data)=>{
                                                console.log(data);
                                            }).catch((err)=>{
                                                console.log(err);
                                            });
                                            return res.json({code: 0, data: npost});
                                        }
                                    });

                                }
                        }else {
                            return res.json({code: 2, msg: '启事 id 有误!'});
                        }
                    }) ;

            }else{
                res.json({code: 3, msg: '参数有误,必须传入你要修改的 status!'});
            }
        }else{
            res.json({code: 4, msg: '参数有误,必须传入启事 id!'});
        }

    }else{
        res.json({code: 5, msg: '您没有权限查看该数据!'});
    }

});

/**
 * @swagger
 * /v1/post/setloststatus:
 *   get:
 *     operationId: setloststatus
 *     tags:
 *       - 操作
 *     description: 更改启事状态
 *     security:
 *       - token: []
 *     produces:
 *       - application/json
 *     parameters:
 *      - name: _id
 *        in: query
 *        description: 启事 id,必填
 *        required: true
 *        type: string
 *      - name: lostStatus
 *        in: query
 *        description: 启事状态 0 未结束 1 已结束
 *        required: false
 *        type: string
 *        enum:
 *          - 0
 *          - 1
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
 *                  {code: 3, msg: '参数有误,必须传入你要修改的 status!'}
 *                  {code: 4, msg: '参数有误,必须传入启事 id!'}
 *                  {code: 5, msg: '您没有权限查看该数据!'}
 *              正确返回
 *                  {code: 0, data: post}
 *            ```
 */
router.get('/setloststatus', (req, res, next)=>{

        let id = req.query._id,
            lostStatus = req.query.lostStatus;

        if (id){
            if (lostStatus){
                Post.findById(id)
                    .populate("user", notoken)
                    .exec((err, post)=>{
                        if (err){ return next(err)}
                        if(post){

                            let req_id = String(req.user._id);
                            let post_id = String(post.user._id);

                            if(req_id === post_id){

                                if(post.lostStatus == lostStatus){
                                    return res.json({code: 2, msg: '您修改的 lostStatus 不变,没有必要修改!'});
                                }else{
                                    post.lostStatus = lostStatus;
                                    post.save((err, npost)=>{
                                        if (err){ return next(err)}
                                        if(npost){
                                            Collection.find({post: npost._id}, 'user')
                                                .exec((err, data)=>{
                                                    if(err){next(err)}
                                                    if(data){
                                                        if(data.length > 0){
                                                            jpush.alias(filterAlais(data), `您收藏的启事状态已经发生改变,快来看吧!`, 1, {type: "post", post: npost._id})
                                                                .then((res)=>{
                                                                    console.log(res)
                                                                })
                                                                .catch((err)=>{
                                                                    console.log(err)
                                                                });
                                                        }
                                                    }
                                                });
                                            return res.json({code: 0, data: npost});
                                        }
                                    });

                                }

                            }else if(req.user.role > 0){

                                if(post.lostStatus == lostStatus){
                                    return res.json({code: 2, msg: '您修改的 lostStatus 不变,没有必要修改!'});
                                }else{
                                    post.lostStatus = lostStatus;
                                    post.save((err, npost)=>{
                                        if (err){ return next(err)}
                                        if(npost){
                                            Collection.find({post: npost._id}, 'user')
                                                .exec((err, data)=>{
                                                if(err){next(err)}
                                                if(data){
                                                    if(data.length > 0){
                                                        jpush.alias(filterAlais(data), `您收藏的启事状态已经发生改变,快来看吧!`, 1, {type: "post", post: npost._id})
                                                            .then((res)=>{
                                                                console.log(res)
                                                            })
                                                            .catch((err)=>{
                                                                console.log(err)
                                                            });
                                                    }
                                                }
                                            });
                                            return res.json({code: 0, data: npost});
                                        }
                                    });

                                }
                            }else{
                                res.json({code: 2, msg: '您没有权限查看该数据!'});
                            }
                        }else {
                            return res.json({code: 2, msg: '启事 id 有误!'});
                        }
                    }) ;

            }else{
                res.json({code: 2, msg: '参数有误,必须传入你要修改的 lostStatus!'});
            }
        }else{
            res.json({code: 2, msg: '参数有误,必须传入启事 id!'});
        }
});

function filterAlais(data) {
    let temp = [];
    for (let i = 0; i < data.length; i++){
        let dd = data[i];
        temp.push(String(dd.user));
    }
    return temp;
}





module.exports = router;