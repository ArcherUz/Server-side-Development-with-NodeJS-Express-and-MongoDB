var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var User = require('./models/user');
var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;
var jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens
var FacebookTokenStrategy = require('passport-facebook-token');

var config = require('./config.js'); //secrete key and mongodbUrl

exports.local = passport.use(new LocalStrategy(User.authenticate()));
//store and retrieve user information from Session
passport.serializeUser(User.serializeUser()); // converted to a unique identifier(ID number) stored in session
passport.deserializeUser(User.deserializeUser()); //takes the identifier and retrieve the corresponding user object from the database

/*
encode user information by jwt using secretkey
the signed JWT can be sent to the client for authentication of users
*/
exports.getToken = function(user) {
    return jwt.sign(user, config.secretKey,
        {expiresIn: 3600});
};


var opts = {};
//extract jwt from the request
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken(); //extract jwt from authenticate header
opts.secretOrKey = config.secretKey;

//configure jwt authentication strategy by using passport.js library
//find user in jwt_payload(decoded jwt)
exports.jwtPassport = passport.use(new JwtStrategy(opts,
    (jwt_payload, done) => {
        console.log("JWT payload: ", jwt_payload);
        User.findOne({_id: jwt_payload._id}, (err, user) => {
            if (err) {
                return done(err, false);
            }
            else if (user) {
                return done(null, user);
            }
            else {
                return done(null, false);
            }
        });
    }));

//use jwt previously configured to vertify users and protect routes
exports.verifyUser = passport.authenticate('jwt', {session: false});

exports.verifyAdmin = function(req, res, next) {
    User.findOne({_id: req.user._id})
    .then((user) => {
        console.log("User: ", req.user);
        if (user.admin) {
            next();
        }
        else {
            err = new Error('You are not authorized to perform this operation!');
            err.status = 403;
            return next(err);
        } 
    }, (err) => next(err))
    .catch((err) => next(err))
}

exports.FacebookTokenStrategy = passport.use(new FacebookTokenStrategy({
    clientID: config.facebook.clientId,
    clientSecret: config.facebook.clientSecret},
    (accessToken, refreshToken, profile, done) =>{
        User.findOne({facebookId: profile.id}, (err,user) =>{
            if (err) {
                return done(err,false);
            }
            if(!err && user !== null){
                return done(null,user);
            }
            else{
                user = new User({ username: profile.displayName});
                user.facebook = profile.id;
                user.firstname = profile.name.givenName;
                user.lastname = profile.name.familyName;
                user.save((err,user) =>{
                    if(err){
                        return done(err,false);
                    }
                    else{
                        return done(null,user);
                    }
                });
            }
        });
    }
));