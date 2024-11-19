// app.js

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

    // Create tokens Table with renamed `token_key` column
    const createTokensTable = `
      CREATE TABLE IF NOT EXISTS tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        token TEXT NOT NULL,
        token_key VARCHAR(255) NOT NULL,
        remain_quota INT NOT NULL,
        expired_time INT NOT NULL,
        unlimited_quota BOOLEAN NOT NULL,
        model_limits_enabled BOOLEAN NOT NULL,
        model_limits TEXT,
        allow_ips TEXT,
        group_name VARCHAR(255),
        user_ip VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await promisePool.query(createTokensTable);
    console.log('Tokens table is ready.');
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
  const loginUrl = `${process.env.BASE_URL}/api/user/login?turnstile=`;

  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'Content-Type': 'application/json',
    'Origin': process.env.BASE_URL,
    'Referer': `${process.env.BASE_URL}/login`,
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

  const url = `${process.env.BASE_URL}/api/redemption/`;

  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'Content-Type': 'application/json',
    'Origin': process.env.BASE_URL,
    'Referer': `${process.env.BASE_URL}/redemption`,
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

// Function to Create Token
async function createToken(name, remain_quota, expired_time, unlimited_quota, model_limits_enabled, model_limits, allow_ips, group_name, sessionCookies) {
  console.log(`Using session cookies for token creation: ${sessionCookies}`); // Log the cookies being used

  const url = `${process.env.BASE_URL}/api/token/`;

  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
    'Connection': 'keep-alive',
    'Content-Type': 'application/json',
    'Origin': process.env.BASE_URL,
    'Referer': `${process.env.BASE_URL}/token`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'VoApi-User': '1',
    'Cookie': sessionCookies // Use the new session cookie
  };

  const data = {
    name: name,
    remain_quota: parseInt(remain_quota),
    expired_time: parseInt(expired_time),
    unlimited_quota: unlimited_quota,
    model_limits_enabled: model_limits_enabled,
    model_limits: model_limits || '',
    allow_ips: allow_ips || '',
    group: group_name || ''
  };

  try {
    const response = await axios.post(url, data, {
      headers: headers,
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) // Equivalent to --insecure
    });

    console.log('Token creation API call successful.');
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`Token API Error: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      throw new Error('Token API Error: No response received from the token service.');
    } else {
      throw new Error(`Error: ${error.message}`);
    }
  }
}

// Function to List Tokens
async function listTokens(sessionCookies, p = 0, size = 100) {
  console.log(`Listing tokens with session cookies: ${sessionCookies}`);

  const url = `${process.env.BASE_URL}/api/token/?p=${p}&size=${size}`;

  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
    'Connection': 'keep-alive',
    'Referer': `${process.env.BASE_URL}/token`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'VoApi-User': '1',
    'Cookie': sessionCookies // Use the session cookie
  };

  try {
    const response = await axios.get(url, {
      headers: headers,
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) // Equivalent to --insecure
    });

    console.log('Tokens list retrieved successfully.');
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`List Tokens API Error: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      throw new Error('List Tokens API Error: No response received from the token service.');
    } else {
      throw new Error(`Error: ${error.message}`);
    }
  }
}

// Function to Save Token to the Database with 'sk-' Prefix
async function saveToken(tokenData, name, remain_quota, expired_time, unlimited_quota, model_limits_enabled, model_limits, allow_ips, group_name, userIP) {
  try {
    // Extract the 'key' from tokenData and add 'sk-' prefix
    const key = tokenData.key ? `sk-${tokenData.key}` : null;

    if (!key) {
      throw new Error('Token key not found in the response.');
    }

    // Save the token along with its prefixed key
    const insertQuery = `
      INSERT INTO tokens (name, token, token_key, remain_quota, expired_time, unlimited_quota, model_limits_enabled, model_limits, allow_ips, group_name, user_ip)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await promisePool.query(insertQuery, [
      name,
      JSON.stringify(tokenData), // Store the entire token data as JSON
      key, // Prefixed key
      parseInt(remain_quota),
      parseInt(expired_time),
      unlimited_quota,
      model_limits_enabled,
      model_limits || '',
      allow_ips || '',
      group_name || '',
      userIP
    ]);

    console.log(`Token saved to database with ID: ${result.insertId} and key: ${key}`);
  } catch (err) {
    console.error('Error saving token to database:', err);
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

// Route: POST /api/token
app.post('/api/token', [
  body('name').isString().trim().notEmpty(),
  body('remain_quota').isInt({ min: 1 }),
  body('expired_time').isInt(), // Assuming negative values are allowed
  body('unlimited_quota').isBoolean(),
  body('model_limits_enabled').isBoolean(),
  body('model_limits').optional().isString(),
  body('allow_ips').optional().isString(),
  body('group').optional().isString()
], async (req, res) => {
  // Validate Input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const {
    name,
    remain_quota,
    expired_time,
    unlimited_quota,
    model_limits_enabled,
    model_limits,
    allow_ips,
    group
  } = req.body;

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
    console.log('Performing login to obtain new session cookies for token creation...');
    const sessionCookies = await performLogin();

    // Save the New Session Cookies to the Database with Correct Username
    await saveSessionCookies(process.env.ADMIN_USERNAME, sessionCookies); // Use ADMIN_USERNAME instead of 'name'
    console.log('New session cookies saved to the database.');

    // Create Token Using the New Session Cookies
    const tokenData = await createToken(
      name,
      remain_quota,
      expired_time,
      unlimited_quota,
      model_limits_enabled,
      model_limits,
      allow_ips,
      group,
      sessionCookies
    );

    // If the token creation API does not return the 'key', fetch it using the listTokens function
    let tokenKey = tokenData.key; // Attempt to get the key directly
    if (!tokenKey) {
      console.log('Token key not found in creation response. Fetching from tokens list...');
      const tokensList = await listTokens(sessionCookies, 0, 100);
      
      if (tokensList.success && Array.isArray(tokensList.data) && tokensList.data.length > 0) {
        // Assuming the latest token is the first in the list
        const latestToken = tokensList.data[0];
        tokenKey = latestToken.key;

        if (!tokenKey) {
          throw new Error('Token key not found in the tokens list response.');
        }
      } else {
        throw new Error('Failed to retrieve tokens list or no tokens available.');
      }
    }

    // Update the tokenData with the retrieved key and add 'sk-' prefix
    tokenData.key = `sk-${tokenKey}`;

    // Save Token to Database
    await saveToken(
      tokenData,
      name,
      remain_quota,
      expired_time,
      unlimited_quota,
      model_limits_enabled,
      model_limits,
      allow_ips,
      group,
      userIP
    );

    res.json({
      success: true,
      data: tokenData.key // Return the 'token_key' with 'sk-' prefix
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Start the Server
app.listen(port, () => {
  console.log(`App is running at http://localhost:${port}`);
});
