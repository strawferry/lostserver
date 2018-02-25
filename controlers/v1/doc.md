
domain: 本地调试 localhost:port

`http://localhost:5566`

# v1 版本 接口文档

## 1. 数据结构

 post 的数据结构

```js
    const PostSchema = new Schema({
        postID: { type: Number }, // 自增字段
        postDate: { type: Date, default: Date.now },
        changeDate: { type: Date },
        title: { type: String, required: true, trim: true},
        desc: { type: String, required: true, trim: true},
        type: { type: Number, required: true },
        location: { type: String, required: true, trim: true },
        date: { type: Date, required: true },
        images: [String],
        mainImage: { type: String, required: true },
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        status: { type: Number, default: 0 },
        lostStatus: { type: Number, default: 0 },
    });

     {
                "_id": "594bdc318352a91ecc970914",
                "postID": 35,
                "title": "笑命者卡用疑。？",
                "desc": "量继长亡展女汉脚片属杀肯。景示业双树盛姆顶章批持电喜？归叶毫戏病便助要没食识票抱善今范者？",
                "type": 0,
                "location": "段普公课兵门历查府排引。",
                "date": "2017-06-22T15:03:13.658Z",
                "mainImage": "https://unsplash.it/800/600?random",
                "user": {
                    "_id": "594a23889f75391caaec1541",
                    "email": "admin.@mail.com",
                    "__v": 0,
                    "agency": [],
                    "collections": [],
                    "status": 1,
                    "createTime": "2017-06-21T07:43:04.367Z",
                    "avatar": "https://dn-coding-net-production-static.qbox.me/82b7ce57-96ef-4faf-a480-bb0645ab2a1a.jpg",
                    "userName": "data随机名称"
                },
                "__v": 0,
                "updateAt": "2017-06-22T15:03:13.674Z",
                "createAt": "2017-06-22T15:03:13.658Z",
                "lostStatus": 0,
                "status": 1,
                "images": [
                    "https://unsplash.it/800/600?random",
                    "https://unsplash.it/800/600?random",
                    "https://unsplash.it/800/600?random"
                ],
                "postDate": "2017-06-22T15:03:13.658Z"
     }
```

user 数据结构

```js
    const UserSchema = new Schema({
        userName: { type: String, default: '未设置名字' },
        avatar: { type: String, default: 'https://dn-coding-net-production-static.qbox.me/82b7ce57-96ef-4faf-a480-bb0645ab2a1a.jpg' },
        email: { type: String, required: true },
        tel: { type: String },
        password: { type: String },
        createTime: { type: Date, default: Date.now},
        updateTime: { type: Date },
        token: { type: String },
        status: { type: Number, default: 1 },
        collections: [Schema.Types.ObjectId],
        agency: [Schema.Types.Mixed],
    });

    {
        "_id" : ObjectId("594a23889f75391caaec1541"),
        "email" : "admin.@mail.com",
        "agency" : [

        ],
        "collections" : [

        ],
        "status" : NumberInt(1),
        "createTime" : ISODate("2017-06-21T07:43:04.367+0000"),
        "avatar" : "https://dn-coding-net-production-static.qbox.me/82b7ce57-96ef-4faf-a480-bb0645ab2a1a.jpg",
        "userName" : "data随机名称",
        "__v" : NumberInt(0)
    }
```

## 1. 获取数据列表

1. 默认不带参数 `GET /v1/post/list` 返回最新的10条数据,部分遗失结束状态;

2. 获取在某条上下的数据 `GET /v1/post/list?postID=10&sort=more` postID 传入 sort: more 更多的数据 new 较新的数据;

3. 获取确定其实状态的数据 `GET /v1/post/list?lostStatus=0` lostStatus 0 未结束 1 已结束;

4. 获取确定条数的数据 `GET /v1/post/list?limit=15` limit 15 条数;

5. 参数可以叠加 `GET /v1/post/list?postID=10&sort=more&lostStatus=0&limit=15`;

status 为 0 说明有错误, 会有 errorMsg;
status 为 1 说明正常, 会有 posts 数据;

如果有错误返回 `{status: 0, errorMsg: '服务器出错!'}`;

有数据是返回 `{status: 1, posts: [post]}`, 没有数据返回 posts 数组为空 `{status: 1, posts: []}`;


## 2. 获取某条数据的详情

`GET /v1/post/:id --  /v1/post/594bdc2aac95ea1ec93765bd` id 为该条数据为对象 post 的 _id;

如果有错误返回 `{status: 0, errorMsg: '没有该信息!'}`;

有数据是返回 `{status: 1, post: post}`;

