# BonziWORLD Patched

This respository is a fork of the [original](https://github.com/heyjoeway/BonziWORLD). It will be updated frequently to be fully secure and fix problems with either the server or the client.

This project was discontinued by heyjoeway due to his time being taken up by other responsibilities.

All the source code for the server and client is publically available here. If you want to run your own BonziWORLD, by all means go ahead. Do whatever you'd like with this code. Just try to put me somewhere in the credits.

## Dependencies
- Node.js and npm
- Ruby
- Sass
- Git
- Cordova (Optional)

## Setup
In a terminal/command prompt, navigate to where you'd like BonziWORLD to be placed and run the following:
```
git clone -b 1.6.0-pre-shutdown https://github.com/Seamusmario/BonziWORLD-patched
cd BonziWORLD-patched
```

### Client
```
cd src
npm install
grunt build_www
cd ..
```

### Server
```
cd server
npm install
node index.js
```
After this, BonziWORLD will be accessible on port 3000. (http://localhost:3000/)

## Disclaimer
I'm not responsible if you screw up anything with your computer while setting this up. I have no idea how you would, but someone will find a way. I also will not provide support for installing dependencies. If you have everything installed properly, the above commands will work.

## License
MIT
