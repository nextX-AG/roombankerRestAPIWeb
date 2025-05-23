const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 80;

// API Proxy zum Gateway - mit expliziter pathRewrite Option
app.use('/api', createProxyMiddleware({
  target: 'http://gateway:8000',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api'  // Explizite Path-Rewrite-Regel
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(502).json({ error: 'Bad Gateway' });
  }
}));

// Statische Dateien aus dem dist-Verzeichnis servieren
app.use(express.static(path.join(__dirname, 'dist')));

// Alle anderen Routen an index.html senden (für React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
}); 