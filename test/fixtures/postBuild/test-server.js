const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 8080;

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Serve static files from current directory
app.use(express.static(__dirname));

// Add this before your other routes
app.get('/article/_param/', (req, res) => {
    const id = req.query.id;
    if (id) {
        // Redirect to the clean URL
        res.redirect(`/article/${id}/`);
    } else {
        // Serve the page anyway
        res.sendFile(path.join(__dirname, 'article', 'index.html'));
    }
});
// Handle article routes with named parameters
app.get('/article/:id/', (req, res) => {
    console.log('Article route detected with ID:', req.params.id);
    const indexPath = path.join(__dirname, 'index.html');
    
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        console.error('index.html NOT FOUND at:', indexPath);
        res.status(500).send('index.html not found');
    }
});

// Also handle without trailing slash
app.get('/article/:id', (req, res) => {
    console.log('Article route detected with ID (no slash):', req.params.id);
    const indexPath = path.join(__dirname, 'index.html');
    
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        console.error('index.html NOT FOUND at:', indexPath);
        res.status(500).send('index.html not found');
    }
});

// Handle root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 404 handler for other routes
app.use((req, res) => {
    console.log('404 - Not found:', req.url);
    res.status(404).send('Not found');
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('Current directory:', __dirname);
    console.log('\nFiles in current directory:');
    fs.readdirSync(__dirname).forEach(file => {
        console.log('  -', file);
    });
    
    console.log('\nTry these URLs:');
    console.log(`  http://localhost:${port}/`);
    console.log(`  http://localhost:${port}/article/2/`);
    console.log(`  http://localhost:${port}/article/2`);
});