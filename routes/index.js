const express = require('express');
const router = express.Router();
const PouchDB = require('pouchdb');
const request = require('request');
const FeedParser = require('feedparser');
const _ = require('underscore');
const moment = require('moment');
const he = require('he');
const redisdown = require('redisdown');
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
const passport = require('passport');
process.on('uncaughtException', err => {
	console.log(err);
});
const env = {
	AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
	AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
	AUTH0_CALLBACK_URL: process.env.AUTH0_CALLBACK_URL || 'http://localhost:3000/callback'
};
process.on('unhandledRejection', err => {
	console.log(err);
});
PouchDB.plugin(require('pouchdb-upsert'));

function render() {
	return new Promise((resolve, reject) => {
		let urls;
		const feeds = new PouchDB('RSS_Feeds', {db: redisdown, url: process.env.REDIS_URL});
		feeds.allDocs({include_docs: true}).then(docs => {
			urls = docs;
			if (urls) {
				for (const i in urls.rows) {
					console.log('we got them');
					const feedreq = request(urls.rows[i].doc.url);
					const feedparser = new FeedParser();
					feedparser.on('meta', meta => {
						console.log('===== %s =====', meta.title);
					});
					feedreq.on('error', error => {
						console.error(error);
					});

					feedreq.on('response', function (res) {
						const stream = this; // `this` is `req`, which is a stream
						// console.log(stream)
						if (res.statusCode !== 200) {
							this.emit('error', new Error('Bad status code'));
						} else {
							console.log('piping: ');
							stream.pipe(feedparser);
						}
					});

					feedparser.on('error', error => {
						console.error(error);
					});

					feedparser.on('readable', function () {
						// This is where the action is!
						const stream = this; // `this` is `feedparser`, which is a stream
						const meta = stream.meta; // **NOTE** the "meta" is always available in the context of the feedparser instance
						let item;

						while (item = stream.read()) {
							console.log('item');
							new PouchDB('RSS_Content', {
								db: redisdown,
								url: process.env.REDIS_URL
							}).putIfNotExists(item.title, item).then(response => {
							}).catch(err => {
								if (err) {
									console.log(err);
								}
							});
						}
					});
				}
			}
			resolve('hi');
		});
	});
}

router.get('/login',
	(req, res) => {
		res.render('login', {env});
	});

router.get('/logout', (req, res) => {
	req.logout();
	res.redirect('/');
});

router.get('/callback',
	passport.authenticate('auth0', {failureRedirect: '/'}),
	(req, res) => {
		res.redirect(req.session.returnTo || '/');
	});

/* GET home page. */
router.get('/', ensureLoggedIn, async (req, res, next) => {
	const db = new PouchDB('RSS_Content', {db: redisdown, url: process.env.REDIS_URL});
	await render();
	db.allDocs({include_docs: true}).then(result => {
		const pubdates = [];
		result.rows = _.sortBy(result.rows, o => {
			return new Date(o.doc.pubdate);
		});
		_.each(result.rows, (elem, index) => {
			elem.doc.description = he.decode(elem.doc.description);
			elem.doc.title = he.decode(elem.doc.title);
			pubdates.push(moment(elem.doc.pubdate).fromNow());
		});
		result.rows = result.rows.reverse();
		res.render('index', {title: 'PugRSS', docs: result.rows, dates: pubdates.reverse(), env});
		db.close();
	});
});

module.exports = router;
