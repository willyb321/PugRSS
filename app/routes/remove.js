const express = require('express');
const router = express.Router();
const PouchDB = require('pouchdb');
const redisdown = require('redisdown');
const db = new PouchDB('RSS_Feeds', {db: redisdown, url: process.env.REDIS_URL || 'redis://redis'});
const FeedParser = require('feedparser');
const request = require('request');
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
PouchDB.plugin(require('pouchdb-upsert'));

router.post('/', ensureLoggedIn, (req, res, next) => {
	const toRemove = req.body.toremove;
	console.log(toRemove);
	db.get(toRemove).then(doc => {
		return db.remove(doc);
	}).then(result => {
		console.log(result);
		res.json(result);
	}).catch(err => {
		console.log(err);
		res.json(err);
	});
});

router.get('/', (req, res, next) => {
	res.redirect('/');
});

module.exports = router;
