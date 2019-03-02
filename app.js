// PACKAGE IMPORTS
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var timeout = require('connect-timeout');
var helmet = require('helmet');
var cluster = require('express-cluster');
var toobusy = require('express-toobusy')();
var responseTime = require('response-time');
var errorCodes = require('./misc/errors/errorCodes');
var errors = require('./misc/errors/errorHandler');

const constants = require('./config');
//EXPRESS THREAD COUNT SET UP
var threadCount;
if (process.env.THREAD_COUNT == "CPU_COUNT" || process.env.THREAD_COUNT == "CPU") {
    threadCount = require('os').cpus().length;
} else {
    try {
        threadCount = parseInt(process.env.THREAD_COUNT);
    } catch (e) {
        console.log("INVALID \"INSTANCE_COUNT\" environment variable. Exiting...");
        process.exit();
    }
}


// EXPRESS SET UP
var app = express();
const globalEndpoint = constants.express.GLOBAL_ENDPOINT;

cluster(function (worker) {
    app.enable("trust proxy");

    app.use(timeout(constants.express.RESPONSE_TIMEOUT_MILLI));
    app.use(toobusy);
    app.use(bodyParser.urlencoded({
        extended: false
    }));
    app.use(bodyParser.json());
    app.use(cors());
    app.use(helmet());
    app.use(responseTime());

    // MAIN ENDPOINTS
    app.get(globalEndpoint + '/', function (req, res) {
        var response = errors.getResponseJSON('ENDPOINT_FUNCTION_SUCCESS', "Welcome to the API! :)");
        res.status(response.code).send(response.res);
    });

    app.get(globalEndpoint + '/ping', function (req, res, next) {
        var response = errors.getResponseJSON('ENDPOINT_FUNCTION_SUCCESS', "pong");
        res.status(response.code).send(response.res);
    });

    app.use(require('./routes'));

    app.use(haltOnTimedout);
    // app.use(errorHandler);
    // app.use(haltOnTimedout);

    // function errorHandler(error, req, res, next) {
    //     if (error.message == "Response timeout") {
    //         response = errors.getResponseJSON('RESPONSE_TIMEOUT', "Please check API status at status.trya.space");
    //         res.status(response.code).send(response.res);
    //     } else {
    //         if (process.env.NODE_ENV == "dev") {
    //             console.log(JSON.stringify("ERROR: " + JSON.stringify(error)));
    //             res.status(500).send(error);
    //         } else {
    //             response = errors.getResponseJSON('GENERAL_SERVER_ERROR', "Please check API status at status.trya.space");
    //             res.status(response.code).send(response.res);
    //         }
    //     }
    // }

    function haltOnTimedout(req, rew, next) {
        if (!req.timedout)
            next();
    }

    // Check that all error codes in errorCodes.js are unique
    function runTests() {
        var responseCodes = [];
        for (var currentError in errorCodes) {
            if (responseCodes.includes(errorCodes[currentError].RESPONSE_CODE))
                return 1;
            responseCodes.push(errorCodes[currentError].RESPONSE_CODE);
        }
        return (typeof process.env.PORT != 'undefined' && process.env.PORT != null) ? 0 : 1;
    }

    // Start server
    if (runTests() == 0) {
        var server = app.listen(process.env.PORT, function () {
            if (worker.id == 1) {
                console.log('Listening on port ' + server.address().port + ' with ' + threadCount + ' threads.');
            }
        });
    } else {
        console.error("Please check that process.ENV.PORT is set and that all error codes in errorCodes.js are unique.");
    }
}, {
    count: threadCount
});