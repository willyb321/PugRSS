const express = require('express');
const router = express.Router();
const PouchDB = require('pouchdb');
const redisdown = require('redisdown');
const db = new PouchDB('RSS_Feeds', { db: redisdown, url: process.env.REDIS_URL || 'redis://redis' });
const _ = require('underscore');
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
/* GET home page. */
router.get('/', ensureLoggedIn, (req, res, next) => {
	db.compact().then(result => {
		console.log(result);
		db.allDocs({include_docs: true}).then(docs => {
			console.log(docs);
			docs.rows = _.filter(docs.rows, doc => {
				return !_.contains(doc.doc, '_deleted');
			});
			res.render('managefeed', {title: 'PugRSS Feed Manage', feeds: docs.rows});
		}).catch(err => {
			console.log(err);
		});
	}).catch(err => {
		console.log(err);
	});
});

module.exports = router;
