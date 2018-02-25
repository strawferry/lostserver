// Post model

const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const PostSchema = new Schema({
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
    beCollection: [{type: Schema.Types.ObjectId, ref: 'User'}],
});


module.exports = mongoose.model('Post', PostSchema);
