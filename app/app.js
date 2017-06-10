const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const sassMiddleware = require('node-sass-middleware');
const passport = require('passport');
const Auth0Strategy = require('passport-auth0');
const index = require('./routes/index');
const addfeed = require('./routes/addfeed');
const add = require('./routes/add');
const remove = require('./routes/remove');
const managefeed = require('./routes/managefeed');
const user = require('./routes/user');
const uuidV4 = require('uuid/v4');
const RedisStore = require('connect-redis')(session);

const app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
const strategy = new Auth0Strategy({
	domain: process.env.AUTH0_DOMAIN,
	clientID: process.env.AUTH0_CLIENT_ID,
	clientSecret: process.env.AUTH0_CLIENT_SECRET,
	callbackURL: process.env.AUTH0_CALLBACK_URL || 'http://localhost:3000/callback'
}, (accessToken, refreshToken, extraParams, profile, done) => {
	// AccessToken is the token to call Auth0 API (not needed in the most cases)
	// extraParams.id_token has the JSON Web Token
	// profile has all the information from the user
	return done(null, profile);
});

passport.use(strategy);

// This can be used to keep a smaller payload
passport.serializeUser((user, done) => {
	done(null, user);
});

passport.deserializeUser((user, done) => {
	done(null, user);
});
app.use(session({
	store: new RedisStore({url: process.env.REDIS_URL || 'redis://redis'}),
	secret: uuidV4(),
	resave: true,
	saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
// Uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(sassMiddleware({
	src: path.join(__dirname, 'public'),
	dest: path.join(__dirname, 'public'),
	indentedSyntax: true, // True = .sass and false = .scss
	sourceMap: true
}));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/managefeed', managefeed);
app.use('/logout', index);
app.use('/login', index);
app.use('/callback', index);
app.use('/addfeed', addfeed);
app.use('/add', add);
app.use('/remove', remove);
app.use('/user', user);
// Catch 404 and forward to error handler
app.use((req, res, next) => {
	const err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// Error handler
app.use((err, req, res, next) => {
  // Set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Render the error page
	res.status(err.status || 500);
	res.render('error');
});

module.exports = app;
