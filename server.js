const express = require('express');
const path = require('path');
const app = express();

// Use the port provided by Render, or 3000 for local testing
const port = process.env.PORT || 3000;

// Main Route: Serve the index.html file directly from the root folder
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
