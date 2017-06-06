const express = require('express');
const router = express.Router();
const PouchDB = require('pouchdb');
const request = require('request');
const FeedParser = require('feedparser');
const _ = require('underscore');

process.on('uncaughtException', err => {
	console.log(err);
});

process.on('unhandledRejection', err => {
	console.log(err);
});
PouchDB.plugin(require('pouchdb-upsert'));

function render() {
	return new Promise((resolve, reject) => {
		let urls;
		const feeds = new PouchDB('RSS_Feeds');
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
							new PouchDB('RSS_Content').putIfNotExists(item.title, item).then(response => {
							}).catch(err => {
								if (err) {
									console.log(err);
								}
							});
						}
					});
				}
				resolve('hi');
			}
		});
	});
}
/* GET home page. */
router.get('/', async (req, res, next) => {
	const db = new PouchDB('RSS_Content');
	await render();
	db.allDocs({include_docs: true}).then(result => {
		res.render('index', {title: 'PugRSS', docs:  _.sortBy(result.rows, function(o) { return new Date(o.doc.pubdate); })});
		db.close();
	});
});

module.exports = router;
