var router = require('express').Router();
var asyncHandler = require('express-async-handler');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
var passport = require('passport');
var request = require('request');
var moment = require('moment');
var promiseLimit = require('promise-limit');
var limit = promiseLimit(45);

var rp = require('request-promise');

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

const LABELS = [{
        name: "Impuls: Status - Applied",
        color: "#a4c2f4",
        messageLabel: "Applied"
    },
    {
        name: "Impuls: Status - Rejected",
        color: "#fb4c2f",
        messageLabel: "Rejected"
    },
    {
        name: "Impuls: Status - Interviewing",
        color: "#434343",
        messageLabel: "Interviewing"
    },
    {
        name: "Impuls: Status - Offer received :)",
        color: "#16a766",
        messageLabel: "Offer received :)"
    }
];

passport.use(new GoogleStrategy({
        clientID: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        callbackURL: process.env.CALLBACK,
        passReqToCallback: true
    },
    async function (req, accessToken, refreshToken, profile, done) {
        try {
            done(JSON.stringify(await performSequence(accessToken)));
        } catch (e) {
            console.log(e);
            done(`Error! Something went wrong. Could it be an invalid or expired 'accessCode' query?`);
        }
    }));

async function performSequence(accessToken) {
    console.log(`ACCESS CODE: ${accessToken}`);
    await resetLabels(accessToken);
    var emailsList = await getEmailsList(accessToken);
    var rawEmailObjects = await Promise.all(analyzeEmails(accessToken, emailsList));
    var parsedEmailObjects = getFields(rawEmailObjects);
    var labelIds = await getLabelIds(accessToken);
    var labelEmailReqs = labelEmails(accessToken, parsedEmailObjects, labelIds);
    await Promise.all(labelEmailReqs);
    var mergedResult = await mergeDomains(parsedEmailObjects);
    return mergedResult;
}

function labelEmails(accessToken, parsedEmailObjects, labelIds) {
    var labelReqs = [];
    var labelReqOptions = [];
    for (var index = 0; index < parsedEmailObjects.length; index++) {
        var currentEmail = parsedEmailObjects[index];
        var options = {
            method: 'POST',
            url: `https://www.googleapis.com/gmail/v1/users/me/messages/${currentEmail.id}/modify`,
            headers: {
                authorization: 'Bearer ' + accessToken,
                'content-type': 'application/json'
            },
            body: {
                "addLabelIds": labelIds.filter(current => current.messageLabel == currentEmail.status).map(current => current.id),
            },
            json: true
        };
        labelReqOptions.push(options);
        labelReqs.push(limit(() => rp(options)));
    }
    return labelReqs;
}

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
    if (typeof req.query.accessToken != 'undefined' && req.query.accessToken != '') {
        try {
            res.json(await performSequence(req.query.accessToken));
        } catch (e) {
            console.log(e);
            res.status(500).send(`Error! Something went wrong. Could it be an invalid or expired 'accessToken' query?`);
        }
    } else {
        res.status(404).send(`Missing 'accessToken' query.`);
    }
}));

router.get('/auth',
    passport.authenticate('google', {
        scope: ['https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://mail.google.com/',
            'https://www.googleapis.com/auth/gmail.labels'
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

function getEmailsList(accessToken) {
    var options = {
        method: 'GET',
        url: `https://www.googleapis.com/gmail/v1/users/me/messages`,
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

function analyzeEmails(accessToken, messageList) {
    var reqs = [];
    messageList.messages.forEach(function (currentMessage) {
        var options = {
            method: 'GET',
            url: `https://www.googleapis.com/gmail/v1/users/me/messages/${currentMessage.id}`,
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
        ret.id = emailObject.id;
        ret.snippet = emailObject.snippet + "...";
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
        var currentDomain = uniqueDomains[index];
        var current = {};
        current.domain = currentDomain;
        var domainInfo = await getDomainInfo(current.domain);
        current.name = domainInfo.name;
        current.logo = domainInfo.logo;
        current.website = "https://" + current.domain;
        try {
            current.location = `${domainInfo.geo.city}, ${domainInfo.geo.stateCode}`;
        } catch (e) {
            current.location = `U.S.A.`;
        }
        current.emails = emailInfo.filter(function (currentMessage) {
            var currentEmail = currentMessage.from.email;
            return emailMatchesDomain(currentEmail, current.domain);
        });
        current.app_type = current.emails.length >= 5 ? "common" : "individual";
        current.recent_date = current.emails[0].date;
        current.recent_status = current.emails[0].status;
        for (var emailIndex = 1; emailIndex < current.emails.length; emailIndex++) {
            if (moment(current.emails[emailIndex].date).isAfter(moment(current.recent_date))) {
                current.recent_date = current.emails[emailIndex].date;
                current.recent_status = current.emails[emailIndex].status;
            }
        }
        finalRet.push(current);
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

function addLabel(accessToken, name, color) {
    var options = {
        method: 'POST',
        url: `https://www.googleapis.com/gmail/v1/users/me/labels`,
        headers: {
            authorization: 'Bearer ' + accessToken,
            'content-type': 'application/json'
        },
        body: {
            "labelListVisibility": "labelShow",
            "messageListVisibility": "show",
            "name": name,
            "color": {
                "backgroundColor": color,
                "textColor": "#ffffff"
            }
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

async function resetLabels(accessToken) {
    var options = {
        method: 'GET',
        url: 'https://www.googleapis.com/gmail/v1/users/me/labels',
        headers: {
            authorization: 'Bearer ' + accessToken
        },
        json: true
    };
    var gmailLabels = await new Promise((resolve, reject) => {
        request(options, function (error, response, body) {
            if (error)
                reject(error);
            else
                resolve(body);
        });
    });
    const labelsToDelete = gmailLabels.labels.filter(function (currentLabel) {
        return LABELS.map(current => current.name).indexOf(currentLabel.name) != -1;
    });
    var reqs = [];
    labelsToDelete.forEach(function (current) {
        reqs.push(new Promise((resolve, reject) => {
            var options = {
                method: 'DELETE',
                url: `https://www.googleapis.com/gmail/v1/users/me/labels/${current.id}`,
                headers: {
                    authorization: 'Bearer ' + accessToken
                },
                json: true
            };
            request(options, function (error, response, body) {
                if (error)
                    reject(error);
                else
                    resolve(body);
            });
        }));
    });
    await Promise.all(reqs);
    var addLabelRequests = [];
    LABELS.forEach(function (currentLabel) {
        addLabelRequests.push(addLabel(accessToken, currentLabel.name, currentLabel.color));
    });
    await Promise.all(addLabelRequests);
}

function getLabelIds(accessToken) {
    var options = {
        method: 'GET',
        url: 'https://www.googleapis.com/gmail/v1/users/me/labels',
        headers: {
            authorization: 'Bearer ' + accessToken
        },
        json: true
    };
    return new Promise((resolve, reject) => {
        request(options, function (error, response, body) {
            if (error)
                reject(error);
            else {
                var newLabels = LABELS.slice(0);
                for (var i = 0; i < body.labels.length; i++) {
                    for (var j = 0; j < newLabels.length; j++) {
                        if (body.labels[i].name == newLabels[j].name) {
                            newLabels[j].id = body.labels[i].id;
                        }
                    }
                }
                resolve(newLabels);
            }
        });
    });
}

module.exports = router;