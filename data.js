// 随机插入大量文章数据
const config = require('./config/config'),
    glob = require('glob'),
    chinesegen = require('chinesegen'),
    mongoose = require('mongoose');

mongoose.connect(config.db);
const db = mongoose.connection;
db.on('error', function () {
    throw new Error('unable to connect to database at ' + config.db);
});

function rand(n,m){
    let c = m-n+1;
    return Math.floor(Math.random() * c + n);
}

const models = glob.sync('./models/*.js');
models.forEach(function (model) {
    require(model);
});

const Post = mongoose.model('Post');
const User = mongoose.model('User');


User.findOne(function (err, user) {
    if (err) {
        return console.log('cannot find user');
    }
    if(user){
        for (let i = 1; i < 11; i++) {
            User.findOne({userName: `user-${i}`}).exec((err, auser) => {
                if (err) {
                    console.log(err);
                }
                if(auser){
                    for (let j = 0; j < 5; j++) {
                        let title = chinesegen({count: 8, freq: true});
                        let location = chinesegen({count: 12, freq: true});
                        let desc = chinesegen({count: 45, freq: true});
                        let post = new Post({
                            title: title.text,
                            desc: desc.text,
                            type: rand(0,1),
                            location: location.text,
                            date: Date.now(),
                            status: rand(0,2),
                            lostStatus: rand(0,1),
                            images: [
                                'https://unsplash.it/800/600?random',
                                'https://unsplash.it/800/600?random',
                                'https://unsplash.it/800/600?random'
                            ],
                            mainImage: 'https://unsplash.it/800/600?random',
                            user: auser._id,
                        });
                        post.save();
                    }
                }
            });
        }


        console.log('-----生成post成功--------退出---------');
        return process.exit();
    }else{
        for (let i = 0; i < 11; i++) {
            if(i === 0){
                const user = new User();
                user.userName = `超级管理员`;
                user.email = `admin@163.com`;
                user.password = '$2a$10$/CO16qMIZvdpnL9iz7CnmeDrE4l19JP6TEYQ7GjZDVTQvWpPR8qqi';
                user.status = 1;
                user.avatar = 'https://unsplash.it/800/600?random';
                user.role = 2;
                user.save();
            }else{
                const user = new User();
                user.userName = `user-${i}`;
                user.email = `user${i}@163.com`;
                user.password = '$2a$10$/CO16qMIZvdpnL9iz7CnmeDrE4l19JP6TEYQ7GjZDVTQvWpPR8qqi';
                user.status = rand(0, 1);
                user.avatar = 'https://unsplash.it/800/600?random';
                user.role = rand(0, 2);
                user.save();
            }
        }
        console.log('-----生成用户成功--------------再次运行本代码生成 post-------------');
        return process.exit();
    }

});



