const express = require("express");
const path = require("path");
require("dotenv").config();
const mysql = require("mysql2");

const PORT = process.env.PORT || 5001;

const cors = require("cors");


const url = require('url');
const dbUrl = new URL(process.env.DATABASE_URL);

const pool = mysql.createPool({
  host: dbUrl.hostname,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.substr(1),
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

app.get("/", async (req, res) => {
  try {
    const connection = await pool.promise().getConnection();
    const [rows] = await connection.query("SHOW TABLES");

    const tableNames = rows.map((row) => row[`Tables_in_${process.env.MYSQL_DATABASE}`]);

    const results = {};

    for (const tableName of tableNames) {
      const [rows] = await connection.query(`SELECT * FROM ${tableName}`);
      results[tableName] = rows;
    }

    res.json(results);

    connection.release();
  } catch (err) {
    console.error(err);
    res.send("Error " + err);
  }
});

app.listen(PORT, () => console.log(`Listening on ${PORT}`));