const express = require('express');
const session = require('express-session');
const authRoutes = require('./routes/authController');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const http = require('http');

const app = express();
const server = http.createServer(app); // Keep only HTTP server setup

// Enable CORS for all requests
app.use(cors());

// Middleware to parse JSON requests
app.use(express.json());

app.get('/dashboard.html', (req, res) => {
    res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from public folder
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.json());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.use('/auth', authRoutes);

// Protected route: dashboard
app.get('/session', checkAuthentication, (req, res) => {
    res.json({
        message: 'auth sucsses',
        user: req.session.user
    });
});

// Function to check if the user is authenticated
function checkAuthentication(req, res, next) {
    if (req.session.user) {
        return next(); // If user is logged in, allow access to the route
    } else {
        res.status(401).json({ error: 'You must be logged in to access this page' });
    }
}

app.use((req, res) => {
    // Serve custom error page for all other invalid routes
    res.status(404).sendFile(path.join(__dirname, 'public', 'error.html'));
});

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
