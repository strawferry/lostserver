

const Router = require('express').Router;
const router = new Router();

const list = require('./list');
const me = require('./me');
const post = require('./post');

router.route('/').get((req, res) => {
    res.json({ message: `Welcome to v2 api --- ${req.originalUrl}` });
});

router.use('/list', list);
router.use('/post', post);
router.use('/me', me);


module.exports = router;
