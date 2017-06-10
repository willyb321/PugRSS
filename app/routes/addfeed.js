const express = require('express');
const router = express.Router();
const PouchDB = require('pouchdb');
const redisdown = require('redisdown');
const db = new PouchDB('RSS_Feeds', { db: redisdown, url: process.env.REDIS_URL || 'redis://redis' });
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
/* GET home page. */
router.get('/', ensureLoggedIn, (req, res, next) => {
	res.render('addfeed', {title: 'PugRSS Add Feed'});
});

module.exports = router;
