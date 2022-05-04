// imports
import fetch from 'node-fetch';

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

  let songs = [];
  albums.forEach((album) => {

  })

  // OR SUPPOSEDLY https://api.spotify.com/v1/search?type=track&q=artist:ArtistName works better
  // This method works, but it gets ALLL songs including every repeat, every remix, etc.
  // This method uses NAME not ID
  // let offset = 0
  // while (true) {

  //   // query for the given artist and offset
  //   let query = await fetch('https://api.spotify.com/v1/search?type=track&limit=20&offset=' + offset + '&q=artist:' + artistID, {
  //     method: 'GET',
  //     headers: {
  //       'Authorization': 'Bearer ' + access_token,
  //     },
  //   });
  //   let results = await query.json();

  //   // Check if that result was good, add if yes, move on if no
  //   if (results.err || results.tracks.items.length == 0) {
  //     break;
  //   } else {
  //     offset += 20;
  //     songs.push(results.tracks.items);
  //   }
  // }

  // // Return all songs
  // return songs;
};

/**
 * 
 * @param {*} name name of the artist the songs are all initially associated with
 * @param {*} songs the list of all songs with all their information
 * @param {*} access_token the access token
 * 
 * @returns A list of all artists that have collaborated and all their information
 */
let getCollaborators = async function(name, songs, access_token) {

  let collaborators = [];

  // Iterate through songs and retrieve all artists
  songs.forEach((song) => {
    collaborators.push(song.artists);
  });

  // remove name
  collaborators.splice(name);

  return collaborators;
};

export { getArtistInformation, getArtistSongs, getCollaborators };