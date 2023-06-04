const express = require("express");
const path = require("path");
require("dotenv").config();
const mysql = require("mysql2");

const PORT = process.env.PORT || 5001;

const cors = require("cors");


const dbUrl = new URL(process.env.DATABASE_URL);

const pool = mysql.createPool({
  host: dbUrl.hostname,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1),
  connectionLimit: 10,
  ssl: {
    rejectUnauthorized: false
  }
});

const app = express();

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);
app.use(
  cors({
    origin: ["http://localhost:3000"],
  })
);
app.use(express.static(path.join(__dirname, "public")));

app.get("/users", async (req, res) => {
  try {
    const connection = await pool.promise().getConnection();

    const users = await connection.query(`SELECT * FROM users`);

    res.status(200).json({'users': users[0]});

    connection.release();
  } catch (err) {
    console.error(err);
    res.status(500).send("Error " + err);
  }
});

app.listen(PORT, () => console.log(`Listening on ${PORT}`));