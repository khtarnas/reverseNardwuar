The Reverse Nardwuar app for guessing if two artists will collaborate.
More information Info/summary.text and Info/user_manuel.txt.

The following is an explanation of the file structure of this project:
- Info: a folder with information about the project
- src: where all the actual code lives
	- app.js: where all the routing and main logic goes
	- Authorization: all files having to do with authorization
	- CollaborationGuess: all files having to do with the main function of guesing collaborators
		- collaborationGuess.js: all the main logic for connecting with Spotify's API
- node_modules: all of the packages created by "npm install" installing packages specified in package.json
