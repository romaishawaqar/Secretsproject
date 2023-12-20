require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
// const mongoose = require("mongoose");
const pg = require("pg");


const app = express();
console.log(process.env.API_KEY);
app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));
// mongoose.connect("mongodb://localhost:27017/userDB",{usernewUrlParser:true});
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
// const User = new db.model("User",userschema);
const users = [];


app.get("/",(req,res)=>{
    res.render("home.ejs");
})
app.get("/login",(req,res)=>{
    res.render("login.ejs");
})
app.get("/register",(req,res)=>{
    res.render("register.ejs");
})
app.post("/register",(req,res)=>{
    const newUser = new User(req.body.username, req.body.password);
    db.query('INSERT INTO users (email, password) VALUES ($1, $2)', [newUser.email, newUser.password], (error, results) => {
        if (error) {
          console.error(error);
          res.redirect("/register"); // Redirect to registration page on error
        } else {
          console.log("User registered successfully");
          res.render("secrets.ejs");
        }
      });
});

app.post("/login",async(req,res)=>{
    const username = req.body.username;
    const password = req.body.password;
    const foundUser = await db.query("SELECT * FROM users WHERE email = $1",[username]) ;


    if (foundUser.rows.length > 0) {
      if (foundUser.rows[0].password === password) {
        res.render("secrets.ejs");
      } else {
        res.send("Incorrect password");
      }
    } else {
      res.send("User not found");
    }
});





app.listen(3000,()=>{
    console.log(`Server is ruuning on port 3000.`);
})
