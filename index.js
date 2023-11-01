const express = require("express");
const path = require("path");
require("dotenv").config();
const mysql = require("mysql2");
const PORT = process.env.PORT || 5001;
const cors = require("cors");
const dbUrl = new URL(process.env.DATABASE_URL);
const helmet = require('helmet');
const session = require('express-session');
const lusca = require('lusca');
const rateLimit = require("express-rate-limit");

// DB Connection Setup

const pool = mysql.createPool({
  host: dbUrl.hostname,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  connectionLimit: 10,
  ssl: {
    rejectUnauthorized: false,
  },
});

const app = express();

// MIDDLEWARE

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "http://localhost:5173", "https://www.ridereadybike.com"],
    imgSrc: ["'self'", "http://localhost:5173", "https://www.ridereadybike.com"],
    connectSrc: ["'self'", "http://localhost:5173", "https://www.ridereadybike.com"],
  },
}));

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
	legacyHeaders: false,
})
app.use(limiter);

app.use(
  cors({
    origin: ["http://localhost:5173", "https://www.ridereadybike.com"],
    credentials: true,
  })
);

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  // Cookie needs to be secure false when running on local env
  cookie: { secure: true, sameSite: "none" }
}));

// May want to move CSP to Lusca below and delete Helmet
app.use(lusca({
  csrf: true,
  csp: false,
  xframe: 'SAMEORIGIN',
  p3p: false,
  hsts: {maxAge: 31536000, includeSubDomains: true, preload: true},
  xssProtection: true,
  nosniff: true,
  referrerPolicy: 'same-origin'
}));

// Logs all request info
// app.use((req, res, next) => {
//   console.log('Headers:', req.headers);
//   console.log("Session ID:", req.sessionID);
//   console.log('Session:', req.session);
//   console.log("Body:", req.body);
//   next();
// });

// ENDPOINTS

app.get("/csrf-token", (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.get("/suspension/:user_id", async (req, res) => {
  try {
    const { user_id: userId } = req.params;
    const connection = await pool.promise().getConnection();
    const [suspension] = await connection.query("SELECT * FROM suspension WHERE user_id = ?", [userId]);
    res.status(200).json({ suspension: suspension });
    connection.release();
  } catch (err) {
    console.error(err);
    res.status(500).send(`Error with suspension query for userID: ${err}`);
  }
});

app.post("/suspension", async (req, res) => {
  try {
    const newSus = req.body.sus;
    const connection = await pool.promise().getConnection();

    const [existingSus] = await connection.query(
      "SELECT * FROM suspension WHERE id = ? AND user_id = ?",
      [newSus.id, newSus.user_id]
    );

    if (existingSus.length > 0) {
      res.status(200).json("Suspension already in database");
      connection.release();
    } else {
      const [result] = await connection.query(
        "INSERT INTO suspension (id, user_id, rebuild_life, rebuild_date, sus_data_id, on_bike_id, date_created, last_ride_calculated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [newSus.id, newSus.user_id, newSus.rebuild_life, newSus.rebuild_date, newSus.sus_data_id, newSus.on_bike_id, newSus.date_created, newSus.last_ride_calculated]
      );

      res.status(201).json({ "New suspension added to DB": newSus });
      connection.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).send(`Error adding suspension to DB: ${err}`);
  }
});

app.patch("/suspension/:id", async (req, res) => {
  try {
    const suspensionId = req.params.id;
    const { rebuild_date, rebuild_life, last_ride_calculated } = req.body.sus;

    const connection = await pool.promise().getConnection();
    
    const [result] = await connection.query(
      "UPDATE suspension SET rebuild_date = ?, rebuild_life = ?, last_ride_calculated = ? WHERE id = ?",
      [rebuild_date, rebuild_life, last_ride_calculated, suspensionId]
    );

    res.status(200).json(`Suspension ${suspensionId} updated successfully`);
    connection.release();
  } catch (err) {
    console.error(err);
    res.status(500).send(`Error updating suspension: ${err}`);
  }
});

app.delete("/suspension/:id", async (req, res) => {
  try {
    const suspensionId = req.params.id;
    
    const connection = await pool.promise().getConnection();
    
    const [result] = await connection.query(
      "DELETE FROM suspension WHERE id = ?",
      [suspensionId]
    );

    res.status(200).json("Suspension deleted successfully");
    connection.release();
  } catch (err) {
    console.error(err);
    res.status(500).send(`Error deleting suspension: ${err}`);
  }
});

// Logs a req causing errors
app.use((err, req, res, next) => {
  if (err) {
    console.log('ERROR LOG');
    console.log("Rec'd headers:", req.headers);
    console.log("Rec'd Body:", req.body)
  }
  next(err);
});

app.listen(PORT, () => console.log(`Listening on ${PORT}`));
