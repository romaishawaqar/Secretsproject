require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const pg = require("pg");
// const md5 = require("md5");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const session = require('express-session');
const passport = require("passport");
const passportlocal = require("passport-local");
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  
}));
app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "permalist",
    password: "sajid123",
    port: 5432,
  });
db.connect();
function User(email, password) {
    this.email = email;
    this.password = password;
  }

const users = [];

var user = {
  email:""
};

const LocalStrategy = passportlocal.Strategy;

passport.use("local-register" , new LocalStrategy( async(username, password, done) => {
    try{
        const hash_password = await db.query("SELECT * from users WHERE email=$1",[username]);
        if(hash_password.rowCount == 0){
          bcrypt.hash(password, saltRounds, async (err, hash) => {
            if(err){
              return done(err);
            }else{
              await db.query("INSERT INTO users(email,password) VALUES($1,$2);",[username,hash]);
              user.email=username;
              return done(null,user);
            }
          });
        }else{
          return done(null, false);
        }
    }catch(err){
      return done(err);
    }
  }
));

passport.use("local-login" , new LocalStrategy( async(username, password, done) => {
  try{
      const hash_password = await db.query("SELECT * from users WHERE email=$1",[username]);
      if(hash_password.rowCount == 0){
        return done(null,false,{message:"User name or password is incorrect."});
      }else{
        bcrypt.compare(password,hash_password.rows[0].password, (err,result)=>{
            if(err){
              return done(err);
            }
            else if(result==false){
              return done(null,false,{message:"User name or password is incorrect."});
            }else{
              return done(null, hash_password.rows[0]);
            }
        });
      }
  }catch(err){
    return done(err);
  }
}
));

passport.serializeUser((user, done) => {
  done(null, user.email);
});

passport.deserializeUser( async(email, done) => {
  const result = await db.query("SELECT * FROM users WHERE email=$1",[email]);
  done(null, result.rows[0]);
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets"
},
async function(accessToken, refreshToken, profile, cb) {
    try{
      const result = await db.query("SELECT * FROM users WHERE email=$1",[profile.id]);
      if(result.rowCount > 0){
        return cb(null, result.rows[0]);
      }else{
        await db.query("INSERT INTO users (email) VALUES ($1)",[profile.id]);
        user.email=profile.id;
        return cb(null,user);
      }
    }
    catch(err){
      return cb(null,err);
    }
}
));


app.get("/",(req,res)=>{
    res.render("home");
});
app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] }));

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/login",(req,res)=>{
    res.render("login");
});
app.get("/register",(req,res)=>{
    res.render("register");
});
app.get("/secrets",async(req,res)=>{
  if(req.isAuthenticated()){
    const result = (await db.query("SELECT * FROM secrets WHERE user_email=$1",[req.user.email])).rows;
    const result2 = (await db.query("SELECT * FROM secrets WHERE user_email!=$1",[req.user.email])).rows;
    const your_secret = result;
    res.render("secrets", {text : your_secret,text2:result2});
  }else{
    res.redirect("login");
  }
});

app.get("/submit",(req,res)=>{
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect("login");
  }
});

app.post("/submit",async(req,res)=>{
    const submittedsecret = req.body.secret;
    const curuser = req.user;
    const secret = await db.query("INSERT INTO secrets (secrettext, user_email) VALUES($1,$2)",[submittedsecret,curuser.email]);
    res.redirect("/secrets");
});

app.get("/logout",(req,res)=>{
  req.logout(function(err){
    if(err){
      return next(err);
    }else{
      res.redirect("/");
    }
  })
});


app.post("/login", passport.authenticate("local-login", {
  successRedirect: '/secrets',
  failureRedirect: 'login'
}));

app.post("/register", passport.authenticate("local-register", {
  successRedirect: '/secrets',
  failureRedirect: '/register'
}));





app.listen(3000,()=>{
    console.log(`Server is ruuning on port 3000.`);
})
