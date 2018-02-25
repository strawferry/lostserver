

const Router = require('express').Router;
const router = new Router();


const v1 =  require('./controlers/v1');
const v2 =  require('./controlers/v2');

router.use('/v1', v1);
router.use('/v2', v2);

module.exports = router;
