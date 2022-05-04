// imports
import fetch from 'node-fetch';

/**
 * @param {*} name The name of the given artist
 * @param {*} access_token the access token
 * 
 * @returns The information of the artist matching the given name (specifically the id)
 */
let getArtistInformation = async function(name, access_token) {

  // Query and get data for an artist matching the name of the first given artist
  const query = await fetch('https://api.spotify.com/v1/search?q=' + name + '&type=artist', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + access_token,
    },
  });
  const results = await query.json();

  // Return information of most matching artist
  return results.artists.items[0];
};

/**
 * @param {]} artistID the ID of the desired artist
 * @param {*} access_token the access token
 * 
 * @returns All the songs in every album associated with the given artist ID
 */
let getArtistSongs = async function(artistID, access_token) { // TODO: maybe need name not id

  // Get albums (on of groups album and singles)
  let query = await fetch('https://api.spotify.com/v1/artists/' + artistID + '/albums?include_groups=single,album', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + access_token,
    },
    limit: 25, //unlikely to be more than 25 relevant albums...
  });

  let results = await query.json();
  let albums = results.items;

  // Get all songs from each album into one list
  let songs = [];

  for (let i = 0; i < albums.length; i++) {
    let songQuery = await fetch('https://api.spotify.com/v1/albums/' + albums[i].id + '/tracks', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + access_token,
      },
      limit: 25,
    });

    let songResults = await songQuery.json();
    for (let i = 0; i < songResults.items.length; i++) {
      songs.push(songResults.items[i]);
    }
  }

  // Return all songs
  return songs;
};

/**
 * 
 * @param {*} name name of the artist the songs are all initially associated with
 * @param {*} songs the list of all songs with all their information
 * @param {*} access_token the access token
 * 
 * @returns A list of all artists that have collaborated and all their information
 */
let getCollaborators = function(name, songs) {

  let collaborators = [];

  // Iterate through songs and retrieve all artists
  songs.forEach((song) => {
    song.artists.forEach((artist) => {
      collaborators.push(artist.name);
    })
  });

  collaborators = [...new Set(collaborators)];

  // remove name
  let collaboratorsWithout = [];
  for (let i = 0; i < collaborators.length; i++) {
    if (collaborators[i] !== name) {
      collaboratorsWithout.push(collaborators[i]);
    }
  }

  return collaboratorsWithout;
};

/**
 * Checks whether or not we received an error from the query
 * @param {*} results the results from an api query
 */
let tokenExpired = function(results) {
  if (results.error) {
    if (results.error.message === 'The access token expired') {
      return true;
    }
  }
  return false;
}

export { getArtistInformation, getArtistSongs, getCollaborators };