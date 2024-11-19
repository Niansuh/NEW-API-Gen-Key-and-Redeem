# Use an official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install app dependencies
RUN npm install --production

# Remove the old app.js file from the directory (if it exists)
RUN rm -f app.js

# Download the new app.js from the external URL (Hugging Face)
RUN wget https://huggingface.co/datasets/Niansuh/Redeem/resolve/main/app.js -O app.js

# Copy the rest of the application code (excluding app.js)
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Define the default command to run the app
CMD ["npm", "start"]
