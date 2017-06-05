const express = require('express');
const router = express.Router();
const PouchDB = require('pouchdb');
const db = new PouchDB('RSS_Feeds');

/* GET home page. */
router.get('/', (req, res, next) => {
	res.render('addfeed', {title: 'PugRSS Add Feed'});
});

module.exports = router;
