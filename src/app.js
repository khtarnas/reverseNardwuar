// Import Modules
import express from 'express'; // Express web server framework
import request from 'request'; // "Request" library
import cors from 'cors';
import querystring from 'querystring';
import cookieParser from 'cookie-parser';

// Get directory
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import functions from other files
import { getArtistInformation, getArtistSongs, getCollaborators } from './CollaborationGuess/collaborationGuess.js';

// Set important spotify api accoutn information
let client_id = 'a3aa685edb1e44249fec2c5871c69c46'; // Your client id
let client_secret = '7237be6e49bc4eb4bb10b70cdf9af5a9';
let redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri
let stateKey = 'spotify_auth_state';
let access_token = 'BQBVJiyBWZz4AcIuEgvb0LOuFWv1izmuetoSS2tlhwOlAzAMNPVc2t05G1C-5140aD1WaD-yRM_NBOKem-ICrN9CghTeud4sNUy49F1kpj0mWEK_WmSHw4TWtan8PPcg3GKM8WOy7aDu_5Lar2lCIpDwc6OcopWLI4AiRAV-H9hRlbdepAriaA';

let app = express();
app.use(cors())
   .use(cookieParser())
   .use(express.urlencoded({extended:false}));

/**
 * Functions for the Reverse Nardwuar feature
 */
app.get('/', function(req, res) {

  // check if we have gotten an access_token
  if (req.query.access_token) {

    const access = req.query.access_token;
    res.sendFile('CollaborationGuess/collaborationGuess.html', {root: __dirname })
  } else {

    // send to authorize first
    console.log("Must authorize first!");
    res.redirect('/authorize');
  }
});

app.get('/test', function(req, res) {
  console.log(req.query);
});

app.get('/x', async function(req, res) {
  
  let name1 = 'Bruno Major'.replace(' ', '+');
  let name2 = 'Bruno Mars'.replace(' ', '+');

  let artist1 = await getArtistInformation(name2, access_token);
  let artist1Songs = await getArtistSongs(artist1.id, access_token);
  let artist1Collaborators = getCollaborators('Bruno Mars', artist1Songs);

  console.log(artist1Collaborators);
});




/**
 * Functions for Authorization
 */
app.get('/authorize', function(req, res) {
  res.sendFile('Authorization/authorization.html', {root: __dirname })
});

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
 let generateRandomString = function(length) {
  let text = '';
  let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

app.get('/login', function(req, res) {

  let state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  let scope = 'user-read-private user-read-email';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  let code = req.query.code || null;
  let state = req.query.state || null;
  let storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/?' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    let authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        let access_token = body.access_token,
            refresh_token = body.refresh_token;

        let options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/?' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/?' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  let refresh_token = req.query.refresh_token;
  let authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      let access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});


/**
 * Starting the app
 */
app.listen(8888, () => {
  console.log('Listening on 8888');
  console.log('Visit: http://localhost:8888/')
});
