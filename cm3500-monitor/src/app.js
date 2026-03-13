const fs = require('fs');
const path = require('path');
const express = require('express');
const { getLatest, getHistory } = require('./db');
const { formatPrometheus } = require('./prometheus');

const dashboardHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

function createApp(db) {
  const app = express();

  app.get('/metrics', (req, res) => {
    const snapshot = getLatest(db);
    if (!snapshot) return res.status(503).type('text/plain').send('# No data yet\n');
    res.type('text/plain; version=0.0.4; charset=utf-8').send(formatPrometheus(snapshot.data));
  });

  app.get('/api/latest', (req, res) => {
    const snapshot = getLatest(db);
    if (!snapshot) return res.status(503).json({ error: 'No data yet' });
    res.json(snapshot);
  });

  app.get('/api/history', (req, res) => {
    const hours = parseInt(req.query.hours || '24', 10);
    res.json(getHistory(db, hours));
  });

  app.get('/', (req, res) => {
    res.type('html').send(dashboardHtml);
  });

  return app;
}

module.exports = { createApp };
