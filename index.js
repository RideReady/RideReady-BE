const express = require("express");
require('dotenv').config();


const mysql = require('mysql2');
const app = express();
const cors = require("cors");

const password = process.env.DB_PASSWORD;

app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(cors({
  origin: ['http://localhost:3000']
}));


const pool = mysql.createPool({
  host: '34.70.242.8',
  user: 'root',
  password: `${password}`,
  database: 'data',
});

app.get('/data', (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error connecting to database:', err);
      return res.status(500).json({ error: 'Error connecting to database' });
    }

    console.log('Connected to database.');

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
          connection.release();
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

app.post('/users', (req, res) => {
  const user = req.body;
  console.log(user)

  // Test for slower connections and set timeout here?
  // Slow connection was causing this post to fail - 500

  // Check if the user exists
  pool.query('SELECT * FROM users WHERE userId = ?', [user.userId], (err, results) => {
    if (err) {
      console.error("Error:", err);
      return res.status(500).json({ error: 'Error connecting to database' });
    }
    
    // If the user doesn't exist, insert the new user
    if (results.length === 0) {
      pool.query('INSERT INTO users SET ?', user, (err, result, fields) => {
        if(err) {
          console.error("Error:", err);
          return res.status(500).json({ error: 'Error inserting user into database' });
        }
        res.status(201).send('User added successfully');
      });
    } else {
      res.status(409).send('Database connection successful. User already exists.');
    }
  });
});


app.listen(process.env.PORT || 3001, () =>
  console.log('App running on http://localhost:3001')
);
