// ========================================================================
// Server init
// ========================================================================

// Filesystem reading functions
const fs = require('fs-extra');

// Load settings
try {
	stats = fs.lstatSync('settings.json');
} catch (e) {
	// If settings do not yet exist
	if (e.code == "ENOENT") {
		try {
			fs.copySync(
				'settings.example.json',
				'settings.json'
			);
			console.log("Created new settings file.");
		} catch(e) {
			console.log(e);
			throw "Could not create new settings file.";
		}
	// Else, there was a misc error (permissions?)
	} else {
		console.log(e);
		throw "Could not read 'settings.json'.";
	}
}

// Load settings into memory
const settings = require("./settings.json");

// Setup basic express server
var express = require('express');
var app = express();

const https = require("https");
const http = require("http");

app.get('/ivona-eric', async function(req, res) {
	if (req.query.text) {
					const body = new URLSearchParams({
						but1: req.query.text,
						butS: "0",
						butP: "0",
						butPauses: "0",
						butt0: "Submit",
					}).toString();
					const rq = https.request(
						{
							hostname: "readloud.net",
							path: "/english/american/3-male-voice-eric.html",
							method: "POST",
							headers: {
								"Content-Type": "application/x-www-form-urlencoded"
							}
						},
						(r) => {
							let buffers = [];
							r.on("error", (e) => console.error(e));
							r.on("data", (b) => buffers.push(b));
							r.on("end", () => {
								const html = Buffer.concat(buffers);
								const beg = html.indexOf("/tmp/");
								const end = html.indexOf("mp3", beg) + 3;
								const sub = html.subarray(beg, end).toString();
	
								https.get(`https://readloud.net${sub}`, async (r2) => {
									await r2.pipe(res);
									return res.writeHead(200, {
									'Content-Type': 'audio/mp3'
									});
								});
							});
						}
					).on("error", (e) => console.error(e));
					rq.end(body);
	} else {
	  res.send("Hello World")
	}
  })
app.get('/ivona-jennifer', async function(req, res) {
	if (req.query.text) {
					const body = new URLSearchParams({
						but1: req.query.text,
						butS: "0",
						butP: "0",
						butPauses: "0",
						butt0: "Submit",
					}).toString();
					const rq = https.request(
						{
							hostname: "readloud.net",
							path: "/english/american/28-female-voice-jennifer.html",
							method: "POST",
							headers: {
								"Content-Type": "application/x-www-form-urlencoded"
							}
						},
						(r) => {
							let buffers = [];
							r.on("error", (e) => console.error(e));
							r.on("data", (b) => buffers.push(b));
							r.on("end", () => {
								const html = Buffer.concat(buffers);
								const beg = html.indexOf("/tmp/");
								const end = html.indexOf("mp3", beg) + 3;
								const sub = html.subarray(beg, end).toString();
	
								https.get(`https://readloud.net${sub}`, async (r2) => {
									await r2.pipe(res);
									return res.writeHead(200, {
									'Content-Type': 'audio/mp3'
									});
								});
							});
						}
					).on("error", (e) => console.error(e));
					rq.end(body);
	} else {
	  res.send("Hello World")
	}
  })
app.get('/voiceforge', function(req, res) {
	if (req.query.text && req.query.voice) {
	  var random = Math.random();
	  const q = new URLSearchParams({
		msg: req.query.text,
		voice: req.query.voice,
		email: "null"
	  }).toString();
  
	  https.get({
		hostname: "api.voiceforge.com",
		path: `/swift_engine?${q}`,
		headers: {
		  "User-Agent": "just_audio/2.7.0 (Linux;Android 11) ExoPlayerLib/2.15.0",
		  "HTTP_X_API_KEY": "8b3f76a8539",
		  "Accept-Encoding": "identity",
		  "Icy-Metadata": "1",
		}
	  }, async (r) => {
		r.pipe(res);
	  });
	} else {
	  res.send("Hello World")
	}
	return res.writeHead(200, {
	  'Content-Type': 'audio/wav'
	});
  })

if (settings.express.serveStatic)
	app.use(express.static('./build/www'));
var server = require('http').createServer(app);

// Init socket.io
var io = require('socket.io')(server,{
  allowEIO3: true,
  connectTimeout: 9999999,
  pingTimeout: 9999999
});
var port = process.env.PORT || settings.port;

exports.io = io;

// Init sanitize-html
var sanitize = require('sanitize-html');

// Init winston loggers (hi there)
const Log = require('./log.js');
Log.init();
const log = Log.log;

// Load ban list
const Ban = require('./ban.js');
Ban.init();

// Start actually listening
server.listen(port, function () {
	console.log(
		"Welcome to BonziWORLD Revived! Time to meme!\nServer listening at port " + port
	);
});
app.use(express.static(__dirname + '/public'));

// ========================================================================
// Banning functions
// ========================================================================

// ========================================================================
// Helper functions
// ========================================================================

const Utils = require("./utils.js")

// ========================================================================
// The Beef(TM)
// ========================================================================

const Meat = require("./meat.js");
Meat.beat();

// Console commands
const Console = require('./console.js');
Console.listen();
