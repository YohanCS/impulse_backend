const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
//Import the Google Cloud Natural language Processing library
const language = require('@google-cloud/language');
const languageClient = new language.LanguageServiceClient();

//TRYING OUT NATURAL LANGUAGE PROCESSING FOR ORGANIZATIONS
var nlp = require('compromise')

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Gmail API.
    authorize(JSON.parse(content), listLabels);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const {
        client_secret,
        client_id,
        redirect_uris
    } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getNewToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error retrieving access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

//subject for email titles, body for the content
var body = [];

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listLabels(auth) {

    const gmail = google.gmail({
        version: 'v1',
        auth
    });

    //list messages and id numbers, and use those id numbers to get each message
    var res = await new Promise(function (resolve, reject) {
        gmail.users.messages.list({
            'userId': 'me'
        }, (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });

    // FORMING REQUESTS
    var reqs = [];
    res.data.messages.forEach(function (message) {
        reqs.push(new Promise(function (resolve, reject) {
            gmail.users.messages.get({
                'userId': 'me',
                'id': message.id
            }, function (err, res) {
                if (err) {
                    reject(err);
                } else {
                  resolve(res);
                }
            });
        }));
    });
    console.log(`LENGTH: ${res.data.messages.length}`);

    // GETTING MESSAGES
    var results = await Promise.all(reqs);
    console.log(`LENGTH OF RETURNED EMAILS: ${results.length}`);

    console.log(results.length);

    // FILE OUTPUT
    // iterate through results and analyze each text
    results.forEach( (currentEmail) => {
      analyzeText(currentEmail);
    });

    // commented out as we dont need to write to a txt file
    /*var textOutput = "";
    results.forEach(function (currentEmail) {
        textOutput += currentEmail;
    });
    await new Promise((resolve, reject) => {
        fs.writeFile('output-email.txt', textOutput, function (err) {
            if (err)
                reject(err);
            else
                resolve();
        });

    });*/
}

let arrayOfEmails = []; // emails with intern or position word in them
let parentObject = {
  emails: arrayOfEmails
};

//function to analyze text of an object
// @param an entire email's data
async function analyzeText(res) {

  // GRAB SUBJECT OF TEXT
  let subject = res.data.payload.headers;
  subject.forEach( (name) => {
    if(name['name'] == 'Subject') {
      subject = name['value'];
    }
  });

  // PUT CONTENT INTO READABLE TEXT
  let text = null; //used later
  if (res.data.payload.parts[0].body.data != null) {
      text = new Buffer.from(res.data.payload.parts[0].body.data, 'base64').toString();
  } else { //email has multimedia so its pushed to somewhere else
      text = new Buffer.from(res.data.payload.parts[0].parts[0].body.data, 'base64').toString();
  }

  //Only get emails with "Position" or "Intern" in the email
  let internREGEX = /intern|position/i;
  if(!internREGEX.test(text)) {
    //dont want to execute rest of the function :^)
    return ;
  }

  // INITIALIZE EMAILOBJECT TO STORE LATER
  let emailObject = {};
  let document = {
    content: text,
    type: 'PLAIN_TEXT'
  };

  // ANALYZE SENTIMENT OF EACH TEXT
  const [result] = await languageClient.analyzeSentiment({document:document});
  //console.log(result);
  const sentiment = result.documentSentiment;

  //regex to find Capital words
  let senderREGEX = /(?<=\s)([A-Z]+[a-z]*)(?=\s)/gm;
  possibleOrgs = subject;
  //possibleOrgs = nlp(possibleOrgs[0]).organizations().out('topk'); // organizations
  //console.log("POSSIBLE ORGS:");
  //console.log(possibleOrgs);

  emailObject.subject = subject; //possible ORG
  emailObject.text = text;
  emailObject.sentiment = sentiment;

  //append to big array which parentObject contains
  arrayOfEmails.push(emailObject);

  // CLASSIFY TEXT INTO CATEGORIES
  let nextStageRegex = /Congratulation|challenge|problem|algorithm/;
  if(nextStageRegex.test(text)) {
    //probably a bad review
    emailObject.status = 'NEXT STAGE';
  } else {
    //probably a good review
    emailObject.status = 'DECLINED';
  }
  /*const [results] = await languageClient.classifyText({document: document});
  console.log(results);
  const analysis = results.categories;

  console.log('Categories:' );
  analysis.forEach( (category) => {
    console.log(`Name: ${category.name}, Confidence: ${category.confidence}`);
  });*/

  //WRITE TO FILE OUTPUT
  await new Promise((resolve, reject) => {
      fs.writeFile('emailOUTPUT.json', JSON.stringify(parentObject, null, 2), function (err) {
          if (err)
              reject(err);
          else
              resolve();
      });

  });  //REMOVE COMMENT LATER
}

// Things we need in JSON file after filtering emails
// message
// sender
// domain of sender (the end of the email) - the company
// status (later)
