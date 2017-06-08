const express = require('express');
const router = express.Router();
const PouchDB = require('pouchdb');
const db = new PouchDB('RSS_Feeds');
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
/* GET home page. */
router.get('/', ensureLoggedIn, (req, res, next) => {
	res.render('addfeed', {title: 'PugRSS Add Feed'});
});

module.exports = router;
