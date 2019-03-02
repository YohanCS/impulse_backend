const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

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
  const {client_secret, client_id, redirect_uris} = credentials.installed;
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

  const gmail = google.gmail({version: 'v1', auth});

  //list messages and id numbers, and use those id numbers to get each message
  gmail.users.messages.list({
    'userId': 'me'
  }, (err, res) => {
    if(err) return console.log("Error: " + err);
    const messages = res.data.messages;
    //console.log(messages);
    // now parse through each message
    for(let i = 0; i < messages.length; i++) {
      //getEmails(gmail, messages[i]['id']);
      gmail.users.messages.get({
        'userId': 'me',
        'id': messages[i]['id']
      }, async (err, res) => {
        if(err) return console.log(err);
        //else no error so decode the base64 message inside the email
        //but make sure its not an empty email
        if(res.data.payload.parts[0].body.data != null) {
          await body.push(new Buffer.from(res.data.payload.parts[0].body.data, 'base64').toString() + "\n");
        } else { //email has multimedia so its pushed to somewhere else
          await body.push(new Buffer.from(res.data.payload.parts[0].parts[0].body.data, 'base64').toString());
        }

        //runs into a problem where result will execute too fast or some messages
        //are skippede over from gmail
        result(messages.length, i);
      }); //ends particular gmail.messages.get

    } //ends for loop

  }); //ends messages.list

}

//prints email. needed to do this as a callback function
//print only if a == b
function result(a, b) {
  if(a - 1 == b) {
    fs.writeFileSync("emailOUTPUT", body);
  }
}
