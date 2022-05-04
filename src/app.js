// Import Modules
import express from 'express'; // Express web server framework
import request from 'request'; // "Request" library
import cors from 'cors';
import querystring from 'querystring';
import cookieParser from 'cookie-parser';
import path from 'path';

// Get directory path
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
let access_token = 'BQAQ1CZnpvbf0tq7-LiMCBFsaZK-ZYme8bPdISLVtB0pzz6FD1pPnp9gB2hsWN0M8su_bUTHegYp6Ayi5_re899WGbXW3MVKuB0Xa_TOBmX4YmFgU5tQK2w-0mlpr5DHfRAXdiUvVYekzn6g7rGL_vzW7qFU6yUThW4ldfO4NPPxtr40jkvDNA';

let app = express();
app.use(cors())
   .use(cookieParser());

// Import middleware to handle body and url data sending
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  }),
);

/**
 * Functions for the Reverse Nardwuar feature
 */
app.get('/', function(req, res) {

  // check if we have gotten an access_token
  if (req.query.access_token) {

    access_token = req.query.access_token;
    res.sendFile('CollaborationGuess/collaborationGuess.html', { root: __dirname })
  } else {

    // send to authorize first
    console.log("Must authorize first!");
    res.redirect('/authorize');
  }
});

app.get('/collaboratonGuess', async function(req, res) {
  let { artist1, artist2, depth } = req.query;

  let artist1Parsable = artist1.replace(' ', '+');
  let artist2Parsable = artist2.replace(' ', '+');

  // Get artist1 information, error if not a real artist
  let artist1Info = await getArtistInformation(artist1Parsable, access_token);
  if (!artist1Info) {
    res.send(JSON.stringify({
      message: 'ERROR: Artist 1 was given as "' + artist1 + '" but no such artist was found...'
    }));
  } else {

    // get artist1's collaborators and send them
    let artist1name = artist1Info.name;
    let artist1Songs = await getArtistSongs(artist1Info.id, access_token);
    let artist1Collaborators = getCollaborators(artist1, artist1Songs);
    res.send(JSON.stringify({
      message: 'Artist 1 was given as "' + artist1 + '" and "' + artist1name + '" was found!',
      collaborators: artist1Collaborators
    }));
  }
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
