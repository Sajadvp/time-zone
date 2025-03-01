const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("./config/passport");
require("dotenv").config();
const db = require("./config/db");
const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter");
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.KeyId,
  key_secret: process.env.SecretKey,
});

// Connect to the database
db();

// Initialize the app
const app = express();

// Middleware
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// Session configuration
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is missing");
}
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000, // 72 hours
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Disable caching
app.use((req, res, next) => {
  res.set("cache-control", "no-store");
  next();
});

// View engine and static files
app.set("view engine", "ejs");
// app.set("views", path.join(__dirname, "views/user"));
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/", userRouter);
app.use("/admin", adminRouter);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(">>>>> Server running on port " + PORT + " <<<<<");
});

module.exports = app;
