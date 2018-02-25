

const Router = require('express').Router;
const router = new Router();

const me = require('./me');
const post = require('./post');

router.route('/').get((req, res) => {
    res.json({ message: `Welcome to v1 api --- ${req.originalUrl}` });
});

router.use('/post', post);
router.use('/me', me);


module.exports = router;


/**
 * @swagger
 *
 * securityDefinitions:
 *   token:
 *      type: apiKey
 *      name: x-access-token
 *      in: header
 * tags:
 *   - name: 账户模块
 *     description: 登录,注册,同步账户
 *   - name: 我的列表
 *     description: 我的收藏列表,发布列表
 *   - name: 管理员列表
 *     description: 启事审核,人员审核列表
 *   - name: 操作
 *     description: 审核,设置权限,改变启事状态等
 *   - name: 获取详情
 *     description: 获取首页了用户,列表,启事详情或列表
 *   - name: 发布启事
 *     description: 获取首页了用户,列表,启事详情或列表
 * definitions:
 *   User:
 *     description: 用户模型
 *     properties:
 *       userName:
 *         type: string
 *       avatar:
 *         type: string
 *       email:
 *         type: integer
 *       tel:
 *         type: integer
 *       createTime:
 *         type: string
 *         format: date-time
 *       token:
 *         type: string
 *       openid:
 *         type: string
 *       role:
 *         type: integer
 *         enum:
 *           - 0
 *           - 1
 *           - 2
 *       status:
 *         type: integer
 *         enum:
 *           - 0
 *           - 1
 *
 *   Post:
 *     description: 启事模型
 *     properties:
 *       postDate:
 *         type: string
 *       title:
 *         type: string
 *       desc:
 *         type: integer
 *       type:
 *         type: integer
 *       location:
 *         type: string
 *       date:
 *         type: string
 *       images:
 *         type: string
 *       mainImage:
 *         type: integer
 *       user:
 *         $ref: '#/definitions/User'
 *       status:
 *         type: string
 *       lostStatus:
 *         type: integer
 *       beCollection:
 *         type: integer
 *
 *   Collection:
 *     description: 收藏模型
 *     properties:
 *       user:
 *        $ref: '#/definitions/User'
 *       post:
 *        $ref: '#/definitions/Post'
 *       date:
 *         type: string
 *         format: date-time
 *
 *   Login:
 *     description: 注册登录模型
 *     properties:
 *       email:
 *        type: string
 *        default: swagger@163.com
 *       password:
 *        type: string
 *        default: 111111
 *
 *   Info:
 *     description: 设置用户信息 body
 *     properties:
 *       userName:
 *         description: 用户昵称
 *         type: string
 *       avatar:
 *         description: 用户头像
 *         type: string
 *       tel:
 *         description: 手机号码
 *         type: string
 *   PostBody:
 *     description: 发送启事 body
 *     properties:
 *       title:
 *         description: 启事标题
 *         type: string
 *       desc:
 *         description: 启事描述
 *         type: string
 *       type:
 *         description: 启事类型
 *         type: string
 *       location:
 *         description: 地点
 *         type: string
 *       date:
 *         description: 时间
 *         type: string
 *         format: date-time
 *       images:
 *         description: 图片
 *         type: array
 *         items:
 *           type: string
 *       user:
 *         description: 发布者
 *         type: string
 *
 *
 */