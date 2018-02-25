// User model

const mongoose = require('mongoose'),
    bcrypt = require('bcrypt-nodejs'),
    Schema = mongoose.Schema;

const UserSchema = new Schema({
    userName: { type: String, default: '设置个人昵称' },
    avatar: { type: String, default: 'https://dn-coding-net-production-static.qbox.me/82b7ce57-96ef-4faf-a480-bb0645ab2a1a.jpg' },
    email: { type: String },
    tel: { type: String },
    password: { type: String },
    createTime: { type: Date, default: Date.now},
    updateTime: { type: Date },
    token: { type: String },
    openid: { type: String }, // 微信授权登录
    role: {type: Number, default: 0},
    status: { type: Number, default: 1 },
});

UserSchema.methods.comparePassword = function(candidatePassword, callback) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return callback(err, false);
        return callback(null, isMatch);
    });
};




module.exports = mongoose.model('User', UserSchema);
