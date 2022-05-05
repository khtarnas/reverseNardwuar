// Import Modules
import express from 'express'; // Express web server framework
import request from 'request'; // "Request" library
import cors from 'cors';
import querystring from 'querystring';
import cookieParser from 'cookie-parser';
import fetch from 'node-fetch';

const PORT = process.env.PORT || 8888; //for deployment

// Get directory path
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import functions from other files
import { getArtistInformation, getArtistSongs, getCollaborators } from './CollaborationGuess/collaborationGuess.js';
import { access } from 'fs';
import { strictEqual } from 'assert';

// Set important spotify api accoutn information
let client_id = 'a3aa685edb1e44249fec2c5871c69c46'; // Your client id
let client_secret = '7237be6e49bc4eb4bb10b70cdf9af5a9';
let redirect_uri;
if (PORT == 8888) {
  redirect_uri = 'http://localhost:8888/callback';
} else {
  redirect_uri = 'https://the-reverse-nardwuar.herokuapp.com/callback' // change depending on deployed link!
}
let stateKey = 'spotify_auth_state';
let access_token;
let refresh_token;
let userName;
let needsToAuthorize = true; // if we go to the route '/' do we need to authorize first?

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

const isPostiveInteger = function (str) {
  const val = Number(str);

  // check if integer and positive
  if (Number.isInteger(val) && val >= 0) {
    return true;
  }
  return false;
}

const replaceNonEnglishCharacters = function (str) {
  let allAcceptable = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '

  // Check that every character is in the set of acceptable characters
  for (let i = str.length - 1; i >= 0; i--) {
    if (!allAcceptable.includes(str[i])) {

      // remove the character if it is not acceptable
      str = str.replace(str[i], '');
    }
  }

  // replace all spaces with pluses
  str = str.replaceAll(' ', '+');

  return str;
}

app.get('/', function(req, res) {

  // check if we have gotten an access_token
  if (!needsToAuthorize && access_token) {
    needsToAuthorize = true;
    res.sendFile('CollaborationGuess/collaborationGuess.html', { root: __dirname })
  } else {

    // send to authorize first
    needsToAuthorize = false;
    console.log("Must authorize first!");
    res.redirect('/authorize');
  }
});

// *only meant to be called dynamically by jquery*
app.get('/username', async function(req, res) { 
  if (userName) {
    res.send(JSON.stringify({
      userName
    }));
  } else {
    res.send(JSON.stringify({
      userName: 'unknown...'
    }));
  }
})

// *only called dynamically by jquery*
app.get('/collaboratonGuess', async function(req, res) {
  let { artist1, artist2, depth } = req.query;
  depth = depth - 1; // I want depth with an offset of 0 , but I want the user to have an offset of 1

  if (artist1 === '' || artist2 === '' || depth === '') {
    res.send(JSON.stringify({
      message: 'ERROR: You must enter a value for every field!',
      likelihood: '~0%'
    }));
  } else {

    let artist1Parsable = replaceNonEnglishCharacters(artist1);
    let artist2Parsable = replaceNonEnglishCharacters(artist2);

    // Get artist information
    let artist1Info = await getArtistInformation(artist1Parsable, access_token);
    let artist2Info = await getArtistInformation(artist2Parsable, access_token);

    // Parameter error check
    if (artist1Info === 'token expired' || artist2Info === 'token expired') {
      res.send(JSON.stringify({
        message: 'ERROR: Token has expired, please re-login!',
        likelihood: 'null'
      }));
    } else if (!artist1Info) {
      res.send(JSON.stringify({
        message: 'ERROR: Artist 1 was given as "' + artist1 + '" but no such artist was found...',
        likelihood: '~0%'
      }));
    } else if (!artist2Info) {
      res.send(JSON.stringify({
        message: 'ERROR: Artist 2 was given as "' + artist2 + '" but no such artist was found...',
        likelihood: '~0%'
      }));

    } else if (!isPostiveInteger(depth)) {
      res.send(JSON.stringify({
        message: 'ERROR: depth must be given as a positive integer...',
        likelihood: '~0%'
      }));

    // If both the artists and depth are valid then find collaborators down for given depth
    }else {

      // get artist1's collaborators
      let artist1name = artist1Info.name;
      let artist1Songs = await getArtistSongs(artist1Info.id, access_token);
      let collaborators = getCollaborators(artist1, artist1Songs);
      
      // Check if artist 1 has any collaborators at all
      if (collaborators.length === 0) {
        res.send(JSON.stringify({
          message: 'Artist 1 (given as "' + artist1 + '") was found, but has no collaborating artists...',
          likelihood: '~0%'
        }));
      
      // Check if artist 2 has any collaborators at all
      } else {
        // get artist2's collaborators
        let artist2name = artist2Info.name;
        let artist2Songs = await getArtistSongs(artist2Info.id, access_token);
        let tempCollaborators = getCollaborators(artist2, artist2Songs);

        // boolean representing whether artist2 was found among artist1's collaborators
        let found = false;

        // Check if artist2 has any collaborators at all
        if (tempCollaborators.length === 0) {
          res.send(JSON.stringify({
            message: 'Artist 2 (given as "' + artist2 + '") was found, but has no collaborating artists...',
            likelihood: '~0%'
          }));
        } else {
          console.log('All parameters verified!');

          // If other artist in inital list of collaborators, then they have already collaborated!
          for (let j = 0; j < collaborators.length; j++) {
            if (collaborators[j] === artist2name) {
              found = true;
              res.send(JSON.stringify({
                message: 'These artists have already collaborated!',
                likelihood: '100%'
              }));
              break;
            }
          }

          /**
           * NOTE: this next part is BFS, it searchs down a graph, breadth first!
           */

          // Artists have not collaborated, check if they have some connection further down
          if (!found) {
            for (let i = 0; i < depth; i++) {
              console.log('At depth of ' + i);
              let new_collaborators = []
              
              // go through collaborators, get their collaborators and add to list
              for (let j = 0; j < collaborators.length; j++) {
                console.log('Attending to artist #' + j + ' of ' + collaborators.length + ' at this depth');

                // Otherwise get the new collaborators for this user
                let artistInfo = await getArtistInformation(replaceNonEnglishCharacters(collaborators[j]), access_token);
                let artistSongs = await getArtistSongs(artistInfo.id, access_token);
                let artistCollaborators = getCollaborators(collaborators[j], artistSongs);

                // Add all the collaborators to the list of new collaborators TODO: forEach this bitch?
                for (let k = 0; k < artistCollaborators.length; k++) {

                  // Check if this collaborator is the one we are looking for
                  if (artistCollaborators[k] === artist2name) {
                    found = true;
                    res.send(JSON.stringify({
                      message: 'FOUND in depth ' + (i + 2),
                      // NOTE: below is my own formula for a version of Strong Triadic Closure that allows a probabilistic result!
                      likelihood: (Math.pow(0.5, (i + 1)) * 100) + '%' 
                    }));
                    break;
                  }
                  new_collaborators.push(artistCollaborators[k]);
                }

                // If the user was found, don't continue
                if (found) {
                  break;
                }
              }

              // If the user was found, don't continue
              if (found) {
                break;
              }

              // User was not found: set up collaborators for the next run
              collaborators = [...new Set(new_collaborators)];
            }
          }
        }

        // If artist2 wasn't found at any point, we'll say its a ~0% chance
        if (!found) {
          res.send(JSON.stringify({
            message: 'Artist 1 was searched as "' + artist1name + '" and Artist 2 was searched as "' + artist2name + '".' +
              ' There were a total of ' + collaborators.length + ' at the final depth of ' + (depth + 1) + '.',
            likelihood: '~0%'
          }));
        }
      }
    }
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
const generateRandomString = function(length) {
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

app.get('/callback', async function(req, res) {

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

    request.post(authOptions, async function(error, response, body) {
      if (!error && response.statusCode === 200) {

        // Set access token and refresh token (they'll be held in this file)
        // TODO: sessions would be a better way to do this
        access_token = body.access_token;
        refresh_token = body.refresh_token;

        // use the access token to access the Spotify Web API
        const selfQuery = await fetch('https://api.spotify.com/v1/me', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + access_token,
          },
          json: true
        });
        const results = await selfQuery.json();
        userName = results.display_name;

        // we can also pass the token to the browser to make requests from there
        res.redirect('/');
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
app.listen(PORT, () => {
  console.log('Listening on ' + PORT);
});
