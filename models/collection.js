// Post model

const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const CollectionSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    post: { type: Schema.Types.ObjectId, ref: 'Post' },
    date: { type: Date, default: Date.now }
});





module.exports = mongoose.model('Collection', CollectionSchema);
