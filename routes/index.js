var router = require('express').Router();
const constants = require('../config');

router.use(constants.express.GLOBAL_ENDPOINT + '/main', require('./api/main'));

module.exports = router;