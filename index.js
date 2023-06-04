const express = require("express");
const path = require("path");
require("dotenv").config();

const PORT = process.env.PORT || 5001;

const { Pool } = require("pg");

const cors = require("cors");


let sslOptions = null;

if (process.env.NODE_ENV === "production") {
  sslOptions = {
    rejectUnauthorized: false,
  };
}

const pool = new Pool({
  connectionString: process.env.CLEARDB_DATABASE_URL,
  ssl: sslOptions,
});

express()
  .use(express.json())
  .use(
    express.urlencoded({
      extended: true,
    })
  )
  .use(
    cors({
      origin: ["http://localhost:3000"],
    })
  )
  .use(express.static(path.join(__dirname, "public")))
  .get("/", async (req, res) => {
    try {
      const client = await pool.connect();
      const tableNamesResult = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );
      const tableNames = tableNamesResult.rows.map((row) => row.table_name);

      const results = {};

      for (const tableName of tableNames) {
        const query = `SELECT * FROM ${tableName}`;
        const result = await client.query(query);
        results[tableName] = result.rows;
      }

      res.json(results);
      client.release();
    } catch (err) {
      console.error(err);
      res.send("Error " + err);
    }
  })
  .listen(PORT, () => console.log(`Listening on ${PORT}`));
