var router = require('express').Router();
var asyncHandler = require('express-async-handler');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
var passport = require('passport');
var request = require('request');

const CLIENT_ID = "177279057869-n5j48p4vn7aucbkvjvcst1qc2j61mgsn.apps.googleusercontent.com";
const CLIENT_SECRET = "G-nCcH6MBOstMSgLqDTKwiRX";

const APP_STATUSES = ["Applied", "Rejected", "Interviewing", "Offer received :)"];

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
        done(JSON.stringify(await analyzeEmails(accessToken, profile.id)));
    }));

router.get('/', function (req, res, next) {
    res.send("This is the main sub-API for Impuls! :)");
});

router.get('/ping', function (req, res, next) {
    res.send("pong");
});

router.get('/get_emails', asyncHandler(async (req, res, next) => {
    if (typeof req.query.accessCode != 'undefined' && req.query.accessCode != '' && typeof req.query.userId != 'undefined' && req.query.userId != '') {
        try {
            res.json(await analyzeEmails(req.query.accessCode, req.query.userId));
        } catch (e) {
            res.status(500).send("Something went wrong. Error! Could be an invalid or expired 'userId' or 'accessCode'?");
        }
    } else {
        res.status(404).send(`Missing "accessCode" and/or "userId" query.`);
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
        res.redirect('/');
    });


async function analyzeEmails(accessToken, profileId) {
    var options = {
        method: 'GET',
        url: `https://www.googleapis.com/gmail/v1/users/${profileId}/messages`,
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
            url: `https://www.googleapis.com/gmail/v1/users/${profileId}/messages/${currentMessage.id}`,
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
    console.log(`ACCESS CODE ${accessToken} , PROFILE ID ${profileId}`);
    return await getFields(await Promise.all(reqs));
}

async function getFields(emailObjects) {
    var reqs = [];

    for (var index = 0; index < emailObjects.length; index++) {
        reqs.push(new Promise((resolve, reject) => {
            var emailObject = emailObjects[index];
            var ret = {};
            emailObject.payload.headers.forEach(function (header) {
                if (header.name == "From" || header.name == "Return-Path") {
                    ret.from = {};
                    ret.from.email = header.value;
                } else if (header.name == "To" || header.name == "Delivered-To") {
                    ret.to = header.value;
                } else if (header.name == "Subject") {
                    ret.subject = header.value;
                } else if (header.name == "Date") {
                    ret.date = header.value;
                }
            });
            ret.from.domain = ret.from.email.substring(ret.from.email.indexOf("<") + 1, ret.from.email.indexOf(">"));
            ret.from.domain = ret.from.domain.substring(ret.from.domain.indexOf("@") + 1, ret.from.domain.length);

            var randStatus = getRandomInt(4);

            ret.status = APP_STATUSES[randStatus];

            var options = {
                method: 'POST',
                url: 'https://api.fullcontact.com/v3/company.enrich',
                headers: {
                    authorization: 'Bearer O2hg5Dwms6XzvSjoqefU9OrFrjFINlgy',
                    'content-type': 'application/json'
                },
                body: {
                    domain: ret.from.domain
                },
                json: true
            };
            request(options, function (error, response, body) {
                if (error) {
                    reject(error);
                } else {
                    ret.from.name = body.name;
                    ret.from.logo = body.logo;
                    ret.from.website = body.website;
                    resolve(ret);
                }
            });

        }));
    }
    return await Promise.all(reqs);
}

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

module.exports = router;