const express = require('express');
const passport = require('passport');
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
const router = express.Router();

// Get the user profile
router.get('/', ensureLoggedIn, (req, res, next) => {
	res.render('user', {user: req.user});
});

module.exports = router;
