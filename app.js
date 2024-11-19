// app.js

/*
  Copyright (c) 2024 NiansuhAI

  This software is provided under the terms of the Custom License. You may use, modify, and distribute the software under the following conditions:

  1. **Use**: You may use the software for personal, educational, or commercial purposes as long as you comply with the terms of this license.
  
  2. **Modification**: You may modify the software for internal use only. You may not distribute the modified version to third parties.

  3. **Redistribution**: You may not redistribute the software in any form, including modifications.

  4. **Proprietary Nature**: This software remains the proprietary property of NiansuhAI. All rights not expressly granted are reserved.

  5. **Warranty**: The software is provided "as-is", with no warranty of any kind, express or implied, including but not limited to the implied warranties of merchantability and fitness for a particular purpose.

  For inquiries regarding commercial licensing, please contact: contact@typegpt.net

  ---
  © 2024 NiansuhAI. All rights reserved.
*/

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const mysql = require('mysql2');
const morgan = require('morgan'); // For logging HTTP requests
const helmet = require('helmet'); // For securing HTTP headers
const { body, validationResult } = require('express-validator'); // For input validation
require('dotenv').config(); // For environment variables

const app = express();
const port = process.env.PORT || 3000;

// Middleware Setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(helmet());
app.use(morgan('combined'));
app.use(express.static('public')); // Serve static files from 'public' directory

// Database Connection Configuration with Connection Pooling
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10, // Adjust based on your requirements
  queueLimit: 0
});

// Promisify for async/await usage
const promisePool = pool.promise();

// Function to Initialize Database Tables
async function initializeDatabase() {
  try {
    // Create redemption_codes Table
    const createRedemptionCodesTable = `
      CREATE TABLE IF NOT EXISTS redemption_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code TEXT NOT NULL,
        name VARCHAR(255),
        quota INT,
        count INT,
        user_ip VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await promisePool.query(createRedemptionCodesTable);
    console.log('Redemption codes table is ready.');

    // Create session_cookies Table
    const createSessionCookiesTable = `
      CREATE TABLE IF NOT EXISTS session_cookies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        session_cookies TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    await promisePool.query(createSessionCookiesTable);
    console.log('Session_cookies table is ready.');
  } catch (err) {
    console.error('Error initializing database tables:', err);
    process.exit(1);
  }
}

// Initialize Database Tables
initializeDatabase();

// Serve the HTML Form (Assuming you have an index.html in the 'views' directory)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Utility Function to Get User's IP Address
function getUserIP(req) {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map(ip => ip.trim());
    return ips[0];
  }
  return req.socket.remoteAddress;
}

// Function to Save Session Cookies to the Database
async function saveSessionCookies(username, sessionCookies) {
  try {
    const insertQuery = `
      INSERT INTO session_cookies (username, session_cookies)
      VALUES (?, ?)
    `;

    await promisePool.query(insertQuery, [username, sessionCookies]);
    console.log(`New session cookies for user '${username}' saved successfully.`);
  } catch (err) {
    console.error(`Error saving session cookies for user '${username}':`, err);
    throw err;
  }
}

// Function to Perform Login and Retrieve Session Cookies
async function performLogin() {
  const loginUrl = `${process.env.REDEMPTION_API_BASE_URL}/api/user/login?turnstile=`;

  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'Content-Type': 'application/json',
    'Origin': process.env.REDEMPTION_API_BASE_URL,
    'Referer': `${process.env.REDEMPTION_API_BASE_URL}/login`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'VoApi-User': '-1'
  };

  const data = {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD
  };

  try {
    const response = await axios.post(loginUrl, data, {
      headers: headers,
      withCredentials: true,
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) // Equivalent to --insecure
    });

    // Extract all cookies from response headers
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      // Parse the set-cookie header to extract all cookies
      const cookies = setCookieHeader.map(cookie => cookie.split(';')[0]);
      const cookieString = cookies.join('; '); // Join all cookies into a single string

      if (cookieString) {
        console.log('Session cookies obtained from login.');
        return cookieString;
      }
    }

    throw new Error('No session cookies received from login response.');
  } catch (error) {
    if (error.response) {
      throw new Error(`Login API Error: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      throw new Error('Login API Error: No response received from the login service.');
    } else {
      throw new Error(`Login Error: ${error.message}`);
    }
  }
}

// Function to Generate Redemption Code
async function generateRedemptionCode(name, quota, count, sessionCookies) {
  console.log(`Using session cookies: ${sessionCookies}`); // Log the cookies being used

  const url = `${process.env.REDEMPTION_API_BASE_URL}/api/redemption/`;

  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'Content-Type': 'application/json',
    'Origin': process.env.REDEMPTION_API_BASE_URL,
    'Referer': `${process.env.REDEMPTION_API_BASE_URL}/redemption`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'VoApi-User': '1',
    'Cookie': sessionCookies // Use all stored cookies
  };

  const data = {
    name: name,
    quota: parseInt(quota),
    count: parseInt(count)
  };

  try {
    const response = await axios.post(url, data, {
      headers: headers,
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) // Equivalent to --insecure
    });

    console.log('Redemption code generated successfully.');
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`API Error: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      throw new Error('API Error: No response received from the redemption service.');
    } else {
      throw new Error(`Error: ${error.message}`);
    }
  }
}

// Function to Save Redemption Code to the Database
async function saveRedemptionCode(codeData, name, quota, count, userIP) {
  try {
    // Assuming the API returns the code in codeData.code
    const code = codeData.code || JSON.stringify(codeData);

    const insertQuery = `
      INSERT INTO redemption_codes (code, name, quota, count, user_ip)
      VALUES (?, ?, ?, ?, ?)
    `;

    await promisePool.query(insertQuery, [code, name, quota, count, userIP]);
    console.log('Redemption code saved to database.');
  } catch (err) {
    console.error('Error saving redemption code to database:', err);
    throw err;
  }
}

// Route: POST /api/create
app.post('/api/create', [
  body('username').isString().trim().notEmpty(),
  body('name').isString().trim().notEmpty(),
  body('quota').isInt({ min: 1 }),
  body('count').isInt({ min: 1 })
], async (req, res) => {
  // Validate Input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { username, name, quota, count } = req.body;
  const userIP = getUserIP(req);
  const apiKey = req.headers['x-api-key'];

  // Check API Key
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid API key'
    });
  }

  try {
    // Perform Login to Obtain New Session Cookies
    console.log('Performing login to obtain new session cookies...');
    const sessionCookies = await performLogin();

    // Save the New Session Cookies to the Database
    await saveSessionCookies(username, sessionCookies);
    console.log('New session cookies saved to the database.');

    // Generate Redemption Code Using the New Session Cookies
    const redemptionCode = await generateRedemptionCode(name, quota, count, sessionCookies);

    // Save Redemption Code to Database
    await saveRedemptionCode(redemptionCode, name, quota, count, userIP);

    res.json({
      success: true,
      data: redemptionCode
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start the Server
app.listen(port, () => {
  console.log(`App is running at http://localhost:${port}`);
});
