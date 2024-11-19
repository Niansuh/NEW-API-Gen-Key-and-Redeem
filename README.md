# New API Redemption Code Generator

This is a simple API built with Node.js and Express that allows users to generate redemption codes. The API interacts with a MySQL database to store session cookies and redemption codes. It also logs into an external API to fetch session cookies and generate redemption codes.

## Features

- **Login**: Automatically logs into an external API and retrieves session cookies.
- **Generate Redemption Codes**: Uses session cookies to generate redemption codes.
- **Database Integration**: Stores session cookies and redemption codes in a MySQL database.
- **Input Validation**: Ensures all inputs are validated using `express-validator`.
- **Logging**: Logs HTTP requests using `morgan` for easy debugging and analysis.
- **Security**: Uses `helmet` to secure HTTP headers.

## Prerequisites

Before running this application, you will need the following:

- **Node.js**: This project is built on Node.js, so make sure you have it installed.
- **MySQL**: You need a MySQL server running and properly configured.
- **Environment Variables**: The app relies on a few environment variables for configuration (e.g., database credentials, API base URLs, etc.).

## Installation

1. Clone this repository to your local machine:

    ```bash
    git clone https://github.com/Niansuh/New-API-Redeem-Code-Generator.git
    cd New-API-Redeem-Code-Generator
    ```

2. Install the required dependencies:

    ```bash
    npm install
    ```

3. Create a `.env` file in the root of the project and set the following environment variables:

    ```
    DB_HOST=<your_mysql_host>
    DB_PORT=<your_mysql_port> (optional, defaults to 3306)
    DB_USER=<your_mysql_username>
    DB_PASSWORD=<your_mysql_password>
    DB_NAME=<your_mysql_database_name>
    ADMIN_USERNAME=<your_admin_username>
    ADMIN_PASSWORD=<your_admin_password>
    REDEMPTION_API_BASE_URL=<the_base_url_of_your_external_api>
    API_KEY=<your_custom_api_key>
    ```

4. Run the application:

    ```bash
    npm start
    ```

5. The server will be running at `http://localhost:3000`. You can access the redemption code creation endpoint at:

    ```
    POST /api/create
    ```

    You will need to provide the following data in the body of the request:

    - `username`: The username of the user requesting the redemption code.
    - `name`: The name for the redemption code.
    - `quota`: The quota for the redemption code.
    - `count`: The count for the redemption code.

    **Example:**

    ```json
    {
      "username": "testuser",
      "name": "special_offer",
      "quota": 10,
      "count": 5
    }
    ```

    The API will return a redemption code in response.

## Usage

### cURL Example

Here is an example `cURL` command to create a redemption code by sending a POST request to the API:

```bash
curl -X POST http://localhost:3000/api/create \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: sk-niansuhaiburewala521' \
  -d '{
    "username": "admin",
    "name": "Test Redemption",
    "quota": 5000,
    "count": 1
  }'
