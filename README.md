# NEW-API-Gen-Key-and-Redeem



![Node.js](https://img.shields.io/badge/Node.js-v14.0.0-brightgreen)
![Express](https://img.shields.io/badge/Express-v4.17.1-blue)
![MySQL](https://img.shields.io/badge/MySQL-v5.7-orange)
![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)



**NEW-API-Gen-Key-and-Redeem** is a secure and efficient Express.js application designed to manage redemption codes and generate API keys (tokens). It interfaces with internal APIs (new-api and vo-api) to perform user authentication, generate redemption codes, and manage tokens with standardized prefixes for easy identification. The application seamlessly integrates with your store, ensuring smooth operations and enhanced security.



## Table of Contents



- [Features](#features)

- [Technologies Used](#technologies-used)

- [Prerequisites](#prerequisites)

- [Installation](#installation)

- [Configuration](#configuration)

- [API Endpoints](#api-endpoints)

  - [Create Redemption Code](#create-redemption-code)

  - [Create Token](#create-token)

  - [Health Check](#health-check)

- [Usage Examples](#usage-examples)

- [Error Handling](#error-handling)

- [Logging](#logging)

- [Security Considerations](#security-considerations)

- [Contributing](#contributing)

- [License](#license)



## Features



- **User Authentication:** Securely logs into an internal API to obtain session cookies.

- **Redemption Code Generation:** Generates and stores redemption codes with associated metadata.

- **Token Management:** Creates and lists tokens with a standardized `sk-` prefix for easy identification.

- **Automated Database Setup:** Automatically initializes necessary database tables upon startup.

- **API Key Security:** Protects endpoints using API keys for authorized access.

- **Comprehensive Logging:** Implements HTTP request logging and secure headers for enhanced security.

- **Input Validation:** Ensures all incoming data is validated to maintain data integrity.



## Technologies Used



- **Node.js & Express.js:** Server-side runtime and web framework.

- **MySQL:** Relational database management system.

- **Axios:** Promise-based HTTP client for API requests.

- **dotenv:** Loads environment variables from a `.env` file.

- **morgan:** HTTP request logger middleware.

- **helmet:** Secures Express apps by setting various HTTP headers.

- **express-validator:** Middleware for input validation.



## Prerequisites



Before setting up the application, ensure you have the following installed:



- **Node.js:** v14.x or higher

- **npm:** v6.x or higher

- **MySQL:** v5.7 or higher



## Installation



1. **Clone the Repository:**



   ```bash

   git clone https://github.com/Niansuh/NEW-API-Gen-Key-and-Redeem.git

   cd NEW-API-Gen-Key-and-Redeem

   ```



2. **Install Dependencies:**



   ```bash

   npm install

   ```



## Configuration



1. **Environment Variables:**



   Create a `.env` file in the root directory of the project and populate it with the necessary environment variables.



   ```env

   PORT=3000

   DB_HOST=your_db_host

   DB_PORT=3306

   DB_USER=your_db_user

   DB_PASSWORD=your_db_password

   DB_NAME=your_db_name

   API_KEY=your_api_key

   ADMIN_USERNAME=admin_username

   ADMIN_PASSWORD=admin_password

   BASE_URL=http://127.0.0.1:4001

   ```



   **Variable Descriptions:**



   - `PORT`: The port on which the server will run (default is `3000`).

   - `DB_HOST`: Hostname of your MySQL database.

   - `DB_PORT`: Port number for MySQL (default is `3306`).

   - `DB_USER`: MySQL database user.

   - `DB_PASSWORD`: Password for the MySQL user.

   - `DB_NAME`: Name of the MySQL database.

   - `API_KEY`: Secret key for authenticating API requests.

   - `ADMIN_USERNAME`: Username for internal API login.

   - `ADMIN_PASSWORD`: Password for internal API login.

   - `BASE_URL`: Base URL of the internal API (e.g., `http://127.0.0.1:4001`).



   **Security Note:**



   Ensure that the `.env` file is **never** committed to version control. Verify that it's listed in your `.gitignore`:



   ```gitignore

   node_modules/

   .env

   ```



## API Endpoints



### Create Redemption Code



- **URL:** `/api/create`

- **Method:** `POST`

- **Headers:**

  - `Content-Type: application/json`

  - `x-api-key: your_api_key`

- **Body Parameters:**

  - `username` (string, required): Username of the user creating the code.

  - `name` (string, required): Name associated with the redemption code.

  - `quota` (integer, required): Quota for the redemption code (minimum: 1).

  - `count` (integer, required): Number of times the code can be used (minimum: 1).



- **Success Response:**

  - **Code:** `200 OK`

  - **Content:**

    ```json

    {

      "success": true,

      "data": {

        "code": "PROMO2024",

        "name": "Promo Code",

        "quota": 100,

        "count": 10,

        "user_ip": "192.168.1.1",

        "created_at": "2024-11-19T12:34:56.000Z"

      }

    }

    ```



- **Error Responses:**

  - **Code:** `400 Bad Request`

    - **Content:**

      ```json

      {

        "success": false,

        "errors": [

          {

            "msg": "Invalid value",

            "param": "quota",

            "location": "body"

          }

        ]

      }

      ```

  - **Code:** `401 Unauthorized`

    - **Content:**

      ```json

      {

        "success": false,

        "error": "Unauthorized: Invalid API key"

      }

      ```

  - **Code:** `500 Internal Server Error`

    - **Content:**

      ```json

      {

        "success": false,

        "error": "Error message detailing the issue"

      }

      ```



### Create Token



- **URL:** `/api/token`

- **Method:** `POST`

- **Headers:**

  - `Content-Type: application/json`

  - `x-api-key: your_api_key`

- **Body Parameters:**

  - `name` (string, required): Name of the token.

  - `remain_quota` (integer, required): Remaining quota for the token (minimum: 1).

  - `expired_time` (integer, required): Expiration time for the token.

  - `unlimited_quota` (boolean, required): Whether the token has unlimited quota.

  - `model_limits_enabled` (boolean, required): Whether model limits are enabled.

  - `model_limits` (string, optional): Model limits in JSON format.

  - `allow_ips` (string, optional): Allowed IPs for token usage.

  - `group` (string, optional): Group name associated with the token.



- **Success Response:**

  - **Code:** `200 OK`

  - **Content:**

    ```json

    {

      "success": true,

      "data": "sk-1a2b3c4d5e6f7g8h9i0j"

    }

    ```



- **Error Responses:**

  - **Code:** `400 Bad Request`

    - **Content:**

      ```json

      {

        "success": false,

        "errors": [

          {

            "msg": "Invalid value",

            "param": "remain_quota",

            "location": "body"

          }

        ]

      }

      ```

  - **Code:** `401 Unauthorized`

    - **Content:**

      ```json

      {

        "success": false,

        "error": "Unauthorized: Invalid API key"

      }

      ```

  - **Code:** `500 Internal Server Error`

    - **Content:**

      ```json

      {

        "success": false,

        "error": "Error message detailing the issue"

      }

      ```



### Health Check



- **URL:** `/health`

- **Method:** `GET`

- **Description:** Checks if the server is running.

- **Success Response:**

  - **Code:** `200 OK`

  - **Content:**

    ```json

    {

      "status": "OK"

    }

    ```



## Usage Examples



### Creating a Redemption Code



```bash

curl -X POST https://example.com/api/create \

  -H 'Content-Type: application/json' \

  -H 'x-api-key: your_api_key' \

  -d '{

    "username": "john_doe",

    "name": "Promo Code",

    "quota": 100,

    "count": 10

  }' \

  --insecure

```



**Expected Response:**



```json

{

  "success": true,

  "data": {

    "code": "PROMO2024",

    "name": "Promo Code",

    "quota": 100,

    "count": 10,

    "user_ip": "192.168.1.1",

    "created_at": "2024-11-19T12:34:56.000Z"

  }

}

```



### Creating a Token



```bash

curl -X POST https://example.com/api/token \

  -H 'Content-Type: application/json' \

  -H 'x-api-key: your_api_key' \

  -d '{

    "name": "Test Token",

    "remain_quota": 500000,

    "expired_time": -1,

    "unlimited_quota": true,

    "model_limits_enabled": false,

    "model_limits": "",

    "allow_ips": "",

    "group": ""

  }' \

  --insecure

```



**Expected Response:**



```json

{

  "success": true,

  "data": "sk-1a2b3c4d5e6f7g8h9i0j"

}

```



**Notes:**



- The `sk-` prefix is automatically added to the token key for standardized identification.

- The `--insecure` flag is used to bypass SSL certificate verification. For production environments, ensure that SSL certificates are properly configured.



## Error Handling



The API provides meaningful error messages and appropriate HTTP status codes for different failure scenarios:



- **400 Bad Request:** Input validation errors.

- **401 Unauthorized:** Missing or invalid API keys.

- **500 Internal Server Error:** Server-side issues or unexpected failures.



Ensure to handle these responses appropriately in your client applications.



## Logging



The application uses `morgan` middleware for HTTP request logging in the `combined` format. Logs include details such as request method, URL, status code, response time, and more. Additionally, the application logs important events like database table initialization, successful operations, and error messages to the console.



## Security Considerations



- **API Key Protection:** All sensitive endpoints are protected using an API key. Ensure that the `API_KEY` is kept secure and rotated periodically.

- **Helmet Middleware:** Secures HTTP headers to protect against common web vulnerabilities.

- **Input Validation:** Uses `express-validator` to validate and sanitize incoming data.

- **HTTPS Enforcement:** While `--insecure` is used for development, it's recommended to enforce HTTPS in production environments to secure data in transit.

- **Environment Variables:** Sensitive information is stored in environment variables and never committed to version control.



## Contributing



Contributions are welcome! Please follow these steps:



1. **Fork the Repository**



2. **Create a Feature Branch**



   ```bash

   git checkout -b feature/YourFeatureName

   ```



3. **Commit Your Changes**



   ```bash

   git commit -m "Add your message"

   ```



4. **Push to the Branch**



   ```bash

   git push origin feature/YourFeatureName

   ```



5. **Open a Pull Request**



## License

This project is licensed under the [MIT License](LICENSE.md).

---

**Note:** Replace placeholders like `your_api_key`, `your_db_host`, `admin_username`, and `admin_password` with your actual configuration details. Ensure that all environment variables are correctly set and that your internal API (`BASE_URL`) is accessible from the server running this application.

For any issues or feature requests, please open an issue on the [GitHub repository](https://github.com/Niansuh/NEW-API-Gen-Key-and-Redeem/issues).
