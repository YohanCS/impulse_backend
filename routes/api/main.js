var router = require('express').Router();
var errors = require('../../misc/errors/errorHandler');
var asyncHandler = require('express-async-handler');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
var passport = require('passport');
var request = require('request');

const CLIENT_ID = "177279057869-n5j48p4vn7aucbkvjvcst1qc2j61mgsn.apps.googleusercontent.com";
const CLIENT_SECRET = "G-nCcH6MBOstMSgLqDTKwiRX";

const testData = {
    internshipObjects: [{
            name: "Amazon",
            domain: "amazon.com",
            role: "SWE Intern",
            status: "Accepted"
        },
        {
            name: "Honey",
            domain: "joinhoney.com",
            role: "SWE Intern",
            status: "Interview"
        },
        {
            name: "Facebook",
            domain: "facebook.com",
            role: "SWE Intern",
            status: "Rejected"
        },
        {
            name: "Spotify",
            domain: "spotify.com",
            role: "SWE Intern",
            status: "Applied"
        },
        {
            name: "Honey",
            domain: "joinhoney.com",
            role: "SWE Intern",
            status: "Interview"
        },
        {
            name: "Facebook",
            domain: "facebook.com",
            role: "SWE Intern",
            status: "Rejected"
        },
        {
            name: "Spotify",
            domain: "spotify.com",
            role: "SWE Intern",
            status: "Applied"
        },
        {
            name: "Facebook",
            domain: "facebook.com",
            role: "SWE Intern",
            status: "Rejected"
        },
        {
            name: "Spotify",
            domain: "spotify.com",
            role: "SWE Intern",
            status: "Applied"
        }
    ]
};

passport.use(new GoogleStrategy({
        clientID: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        callbackURL: process.env.CALLBACK,
        passReqToCallback: true
    },
    async function (req, accessToken, refreshToken, profile, done) {
        var options = {
            method: 'GET',
            url: `https://www.googleapis.com/gmail/v1/users/${profile.id}/messages`,
            headers: {
                'Authorization': 'Bearer ' + accessToken
            },
            json: true
        };

        var messageList = await new Promise(function (resolve, reject) {
            request(options, function (error, response, body) {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });
        var reqs = [];
        messageList.messages.forEach(function (currentMessage) {
            var options = {
                method: 'GET',
                url: `https://www.googleapis.com/gmail/v1/users/${profile.id}/messages/${currentMessage.id}`,
                headers: {
                    'Authorization': 'Bearer ' + accessToken
                },
                json: true
            };

            reqs.push(new Promise(function (resolve, reject) {
                request(options, function (error, response, body) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(body);
                    }
                });
            }));
        });
        var results = await Promise.all(reqs);
        var payloadParts = [];
        results.forEach(function (currentMessage) {
            var currentPayload = "";
            currentMessage.payload.parts.forEach(function (current) {
                currentPayload += current.body.data + Buffer.from("\n").toString('base64');
            });
            payloadParts.push(currentPayload.trim());
        });
        var strRet = "";
        payloadParts.forEach(function (current) {
            strRet += Buffer.from(current, 'base64').toString('ascii') + "\n-------------------\n";
        });
        strRet = strRet.trim();
        done(strRet);
    }));

router.get('/', function (req, res, next) {
    res.send("This is the main sub-API for Impuls! :)");
});

router.get('/ping', function (req, res, next) {
    res.send("pong");
});

router.get('/get_emails', asyncHandler(async (req, res, next) => {
    if (typeof req.query.accessCode != 'undefined' && req.query.accessCode != '' && req.query.userId != 'undefined' && req.query.userId != '') {
        res.json(testData);
    } else {
        res.status(402).send(`Missing "accessCode" and/or "userId" query.`);
    }
}));

router.get('/auth',
    passport.authenticate('google', {
        scope: ['https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ]
    }));

router.get('/callback',
    passport.authenticate('google', {
        failureRedirect: '/'
    }),
    function (req, res) {
        // Successful authentication, redirect home.
        console.log("SUCCESS AUTH");
        res.redirect('/');
    });
module.exports = router;