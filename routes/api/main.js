var router = require('express').Router();
var errors = require('../../misc/errors/errorHandler');

router.get('/', function (req, res, next) {
    var response = (errors.getResponseJSON('ENDPOINT_FUNCTION_SUCCESS', "This is the main sub-API for impuls! :)"));
    res.status(response.code).send(response.res);
});

router.get('/ping', function (req, res, next) {
    var response = errors.getResponseJSON('ENDPOINT_FUNCTION_SUCCESS', "pong");
    res.status(response.code).send(response.res);
});

module.exports = router;