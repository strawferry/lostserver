



const Router = require('express').Router;
const router = new Router();

router.get('/', (req, res)=>{
    res.json({message: `${req.originalUrl} -- post api`});
});


module.exports = router;