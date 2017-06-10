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
const Promise = require('bluebird');
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

const fetch = url => {
	return new Promise((resolve, reject) => {
		if (!url) {
			return reject(new Error(`Bad URL (url: ${url}`));
		}

		const
			feedparser = new FeedParser(),
			items = [];

		feedparser.on('error', e => {
			return reject(e);
		}).on('readable', () => {
			// This is where the action is!
			let item;

			while (item = feedparser.read()) {
				items.push(item);
			}
		}).on('end', () => {
			resolve({
				meta: feedparser.meta,
				records: items
			});
		});

		request({
			method: 'GET',
			url
		}, (e, res, body) => {
			if (e) {
				return reject(e);
			}

			if (res.statusCode !== 200) {
				return reject(new Error(`Bad status code (status: ${res.statusCode}, url: ${url})`));
			}

			feedparser.end(body);
		});
	});
};

router.get('/login',
	(req, res) => {
		res.render('login', { env });
	});

router.get('/logout', (req, res) => {
	req.logout();
	res.redirect('/');
});

router.get('/callback',
	passport.authenticate('auth0', { failureRedirect: '/' }),
	(req, res) => {
		res.redirect(req.session.returnTo || '/');
	});

/* GET home page. */
router.get('/', ensureLoggedIn, async (req, res, next) => {
	const db = new PouchDB('RSS_Content', { db: redisdown, url: process.env.REDIS_URL });
	const feeds = new PouchDB('RSS_Feeds', { db: redisdown, url: process.env.REDIS_URL });
	feeds.allDocs({ include_docs: true }).then(docs => {
		const feedsURL = [];
		_.each(docs.rows, elem => {
			feedsURL.push(elem.doc.url);
		});
		Promise.map(feedsURL, url => fetch(url), { concurrency: 4 }) // Note that concurrency limit
			.then(feedsContent => {
				console.log('doing things');
				_.each(feedsContent, elem => {
					_.each(elem.records, records => {
						records._id = records.title;
						console.log(records._id);
						db.putIfNotExists(records._id, records).then(bulkRes => {
							console.log('Updated doc: ' + bulkRes.updated);
						}).catch(bulkErr => {
							console.log(bulkErr);
						});
					});
				});
				const pubdates = [];
				db.allDocs({ include_docs: true }).then(docs => {
					docs.rows = _.sortBy(docs.rows, o => {
						return new Date(o.doc.pubdate);
					});
					_.each(docs.rows, (elem, index) => {
						if (elem.doc.description) {
							elem.doc.description = he.decode(elem.doc.description);
						}
						if (elem.doc.title) {
							elem.doc.title = he.decode(elem.doc.title);
						}
						pubdates.push(moment(elem.doc.pubdate).fromNow());
					});
					res.render('index', { title: 'PugRSS', docs: docs.rows.reverse(), dates: pubdates.reverse(), env });
				});
			});
	});
});

router.post('/', ensureLoggedIn, async (req, res, next) => {
	const db = new PouchDB('RSS_Content', { db: redisdown, url: process.env.REDIS_URL });
	const feeds = new PouchDB('RSS_Feeds', { db: redisdown, url: process.env.REDIS_URL });
	feeds.allDocs({ include_docs: true }).then(docs => {
		const feedsURL = [];
		_.each(docs.rows, elem => {
			feedsURL.push(elem.doc.url);
		});
		Promise.map(feedsURL, url => fetch(url), { concurrency: 4 }) // Note that concurrency limit
			.then(feedsContent => {
				_.each(feedsContent.records, (elem, ind) => {
					elem._id = elem.title
				});
				db.bulkDocs(feedsContent.records).then(bulkRes => {
					console.log(bulkRes);
				}).catch(bulkErr => {
					console.log(bulkErr);
				})
				const pubdates = [];
				db.allDocs({ include_docs: true }).then(docs => {
					docs.rows = _.sortBy(docs.rows, o => {
						return new Date(o.doc.pubdate);
					});
					_.each(docs.rows, (elem, index) => {
						if (elem.doc.description) {
							elem.doc.description = he.decode(elem.doc.description);
						}
						if (elem.doc.title) {
							elem.doc.title = he.decode(elem.doc.title);
						}
						pubdates.push(moment(elem.doc.pubdate).fromNow());
					});
					res.json(docs.rows);
				});
			});
	});
});

module.exports = router;
