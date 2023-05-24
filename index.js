const express = require("express");
require('dotenv').config();


const mysql = require('mysql2');
const app = express();

const password = process.env.DB_PASSWORD;


const pool = mysql.createPool({
  host: '34.70.242.8', // MySQL instance IP address
  user: 'root', // MySQL username
  password: `${password}`, // MySQL password
  database: 'data', // Name of your MySQL database
});

app.get('/data', (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      return res.status(500).json({ error: 'Error connecting to MySQL' });
    }

    console.log('Connected to MySQL database.');

    // Fetch table names
    const showTablesQuery = 'SHOW TABLES';
    connection.query(showTablesQuery, (error, results) => {
      if (error) {
        console.error('Error fetching table names:', error);
        connection.release();
        return res.status(500).json({ error: 'Error fetching table names' });
      }

      const tableNames = results.map((row) => Object.values(row)[0]);

      const dataPromises = tableNames.map((tableName) => {
        return new Promise((resolve, reject) => {
          const selectQuery = `SELECT * FROM ${tableName}`;
          connection.query(selectQuery, (error, results) => {
            if (error) {
              reject(error);
            } else {
              resolve({ tableName, data: results });
            }
          });
        });
      });

      Promise.all(dataPromises)
        .then((tableData) => {
          connection.release(); // Release the connection back to the pool
          res.json(tableData);
        })
        .catch((error) => {
          console.error('Error fetching table data:', error);
          connection.release();
          res.status(500).json({ error: 'Error fetching table data' });
        });
    });
  });
});

app.listen(process.env.PORT || 3000, () =>
  console.log('App running on http://localhost:3000')
);
