


const Router = require('express').Router;
const router = new Router();

router.get('/', (req, res)=>{
    res.json({message: `${req.originalUrl} -- list api`});
});


module.exports = router;