const express = require('express');
const router = express.Router();
const PouchDB = require('pouchdb');
const redisdown = require('redisdown');
const db = new PouchDB('RSS_Feeds', {db: redisdown, url: process.env.REDIS_URL});
const FeedParser = require('feedparser');
const request = require('request');
PouchDB.plugin(require('pouchdb-upsert'));

router.post('/', (req, res, next) => {
	const url = req.body.url;
	console.log(url);
	const feedreq = request(url);
	const feedparser = new FeedParser();

	feedreq.on('error', error => {
		console.error(error);
	});

	feedreq.on('response', function (res) {
		const stream = this; // `this` is `req`, which is a stream

		if (res.statusCode !== 200) {
			this.emit('error', new Error('Bad status code'));
		}		else {
			db.putIfNotExists(url, {url}).then((err, response) => {
				if (err) {
					console.log(err);
				}
			});
			stream.pipe(feedparser);
		}
	});

	feedparser.on('error', error => {
		// Always handle errors
	});

	feedparser.on('readable', function () {
		// This is where the action is!
		const stream = this; // `this` is `feedparser`, which is a stream
		const meta = this.meta; // **NOTE** the "meta" is always available in the context of the feedparser instance
		let item;

		while (item = stream.read()) {
			new PouchDB('RSS_Content', {db: redisdown, url: process.env.REDIS_URL}).putIfNotExists(item.title, item).then((err, response) => {
				if (err) {
					console.log(err);
				}
			});
		}
	});
	res.redirect('/');
});

router.get('/', (req, res, next) => {
	res.redirect('/');
});

module.exports = router;
