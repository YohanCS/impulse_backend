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
        var emailsList = await getEmailsList(accessToken, profile.id);
        var rawEmailObjects = await Promise.all(analyzeEmails(accessToken, profile.id, emailsList));
        var parsedEmailObjects = getFields(rawEmailObjects);
        var mergedResult = await mergeDomains(parsedEmailObjects);
        done(JSON.stringify(mergedResult));
    }));

router.get('/', function (req, res, next) {
    res.send("This is the main sub-API for Impuls! :)");
});

router.get('/ping', function (req, res, next) {
    res.send("pong");
});

router.get('/test_data', function (req, res, next) {
    res.json(testData);
});

router.get('/get_emails', asyncHandler(async (req, res, next) => {
    if (typeof req.query.accessCode != 'undefined' && req.query.accessCode != '' && typeof req.query.userId != 'undefined' && req.query.userId != '') {
        try {
            var accessCode = req.query.accessCode;
            var userId = req.query.userId;
            var emailsList = await getEmailsList(accessCode, userId);
            var rawEmailObjects = await Promise.all(analyzeEmails(accessCode, userId, emailsList));
            var parsedEmailObjects = getFields(rawEmailObjects);
            var mergedResult = await mergeDomains(parsedEmailObjects);
            res.json(mergedResult);
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

function getEmailsList(accessToken, profileId) {
    var options = {
        method: 'GET',
        url: `https://www.googleapis.com/gmail/v1/users/${profileId}/messages`,
        headers: {
            'Authorization': 'Bearer ' + accessToken
        },
        json: true
    };

    return new Promise(function (resolve, reject) {
        request(options, function (error, response, body) {
            if (error) {
                reject(error);
            } else {
                resolve(body);
            }
        });
    });
}

function analyzeEmails(accessToken, profileId, messageList) {
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
    return reqs;
}

function getFields(emailObjects) {
    var rets = [];
    for (var index = 0; index < emailObjects.length; index++) {
        var emailObject = emailObjects[index];
        var ret = {};
        emailObject.payload.headers.forEach(function (header) {
            if (header.name == "From" || header.name == "Return-Path") {
                ret.from = {};
                var tempEmail = header.value;
                tempEmail = tempEmail.substring(tempEmail.indexOf("<") + 1, tempEmail.indexOf(">"));
                ret.from.email = tempEmail;
                if (tempEmail.length < 5) {
                    ret.from.email = header.value;
                }
                ret.from.domain = ret.from.email.substring(ret.from.email.indexOf("@") + 1, ret.from.email.length);
            } else if (header.name == "To" || header.name == "Delivered-To") {
                ret.to = header.value;
            } else if (header.name == "Subject") {
                ret.subject = header.value;
            } else if (header.name == "Date") {
                ret.date = header.value;
            }
        });
        ret.status = APP_STATUSES[getRandomInt(4)];
        rets.push(ret);
    }
    return rets;
}

async function mergeDomains(emailInfo) {
    var finalRet = [];
    var uniqueEmails = emailInfo.map(current => current.from.email).filter(onlyUnique);
    var uniqueDomains = uniqueEmails.map(current => current.substring(current.indexOf("@") + 1, current.length));
    uniqueDomains = uniqueDomains.filter(onlyUnique);
    for (var index = 0; index < uniqueDomains.length; index++) {
        console.log(`STARTING ${index + 1} OUT OF ${uniqueDomains.length}, DOMAIN ${uniqueDomains[index]}`);
        var currentDomain = uniqueDomains[index];
        var current = {};
        current.domain = currentDomain;
        var domainInfo = await getDomainInfo(current.domain);
        current.name = domainInfo.name;
        current.logo = domainInfo.logo;
        current.website = "https://" + current.domain;
        try {
            current.location = `${domainInfo.geo.city}, ${domainInfo.geo.state}`;
        } catch (e) {
            current.location = `U.S.A.`;
        }
        current.emails = emailInfo.filter(function (currentMessage) {
            var currentEmail = currentMessage.from.email;
            return emailMatchesDomain(currentEmail, current.domain);
        });
        finalRet.push(current);
        console.log(`DONE WITH ${index + 1} OUT OF ${uniqueDomains.length}`);
    }
    return finalRet;
}

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

function emailMatchesDomain(email, domain) {
    return email.substring(email.indexOf("@") + 1, email.length).trim() == domain;
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

function getDomainInfo(domain) {
    var options = {
        method: 'GET',
        url: 'https://company.clearbit.com/v2/companies/find',
        qs: {
            domain
        },
        headers: {
            authorization: 'Bearer sk_2ad0b011e1c982db6115fe8ab4225850'
        },
        json: true
    };

    return new Promise((resolve, reject) => {
        request(options, function (error, response, body) {
            if (error) {
                reject(error);
            } else {
                resolve(body);
            }
        });
    });
}

module.exports = router;