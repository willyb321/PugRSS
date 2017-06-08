const express = require('express');
const router = express.Router();
const PouchDB = require('pouchdb');
const db = new PouchDB('RSS_Feeds');
const _ = require('underscore');
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
/* GET home page. */
router.get('/', ensureLoggedIn, (req, res, next) => {
	db.compact().then(function (result) {
		console.log(result)
		db.allDocs({include_docs: true}).then(docs => {
			console.log(docs);
			docs.rows = _.filter(docs.rows, (doc) => {
				return !_.contains(doc.doc, '_deleted')
			});
			res.render('managefeed', {title: 'PugRSS Feed Manage', feeds: docs.rows});
		}).catch(err => {
			console.log(err);
		});
	}).catch(function (err) {
		console.log(err);
	});
});

module.exports = router;
