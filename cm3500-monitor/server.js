const express = require('express');
const path = require('path');
const { initDb, insertSnapshot, getLatest, getHistory, pruneOld } = require('./db');
const { scrapeModem } = require('./scraper');

const config = {
  modemUrl: process.env.MODEM_URL || 'https://192.168.100.1',
  modemUser: process.env.MODEM_USER || 'admin',
  modemPassword: process.env.MODEM_PASSWORD || 'password',
  pollInterval: parseInt(process.env.POLL_INTERVAL || '300', 10) * 1000,
  port: parseInt(process.env.PORT || '3000', 10),
  dbPath: process.env.DB_PATH || path.join(__dirname, 'data.db'),
};

const db = initDb(config.dbPath);
const app = express();

// --- Poll loop ---
async function poll() {
  try {
    console.log('[poll] Scraping modem...');
    const data = await scrapeModem(config);
    insertSnapshot(db, data);
    console.log('[poll] Snapshot saved (%d DS, %d US channels)',
      data.downstream.qam.length + data.downstream.ofdm.length,
      data.upstream.qam.length + data.upstream.ofdm.length);
    pruneOld(db, 7);
  } catch (err) {
    console.error('[poll] Scrape failed:', err.message);
  }
}

setInterval(poll, config.pollInterval);
poll();

// --- API ---
app.get('/metrics', (req, res) => {
  const snapshot = getLatest(db);
  if (!snapshot) return res.status(503).json({ error: 'No data yet' });
  res.json(snapshot);
});

app.get('/api/history', (req, res) => {
  const hours = parseInt(req.query.hours || '24', 10);
  res.json(getHistory(db, hours));
});

// --- Dashboard ---
app.get('/', (req, res) => {
  res.type('html').send(DASHBOARD_HTML);
});

app.listen(config.port, () => {
  console.log(`[server] CM3500 Monitor listening on http://localhost:${config.port}`);
  console.log(`[server] Modem: ${config.modemUrl} (poll every ${config.pollInterval / 1000}s)`);
});

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CM3500B Monitor</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; background: #f5f6f8; color: #1a1a1a; padding: 16px; }
  h1 { font-size: 1.3rem; margin-bottom: 4px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #ddd; }
  .device-info { display: flex; gap: 16px; font-size: 0.85rem; color: #666; }
  .device-info span { background: #e8eaed; padding: 4px 10px; border-radius: 4px; }
  .status-ok { color: #16a34a; }
  .status-warn { color: #ca8a04; }
  .status-err { color: #dc2626; }
  .updated { font-size: 0.8rem; color: #888; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
  .card { background: #fff; border-radius: 8px; padding: 14px; overflow-x: auto; border: 1px solid #e0e0e0; }
  .card h2 { font-size: 0.95rem; margin-bottom: 10px; color: #4f46e5; }
  table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
  th { text-align: left; padding: 6px 8px; border-bottom: 1px solid #ddd; color: #666; font-weight: 500; }
  td { padding: 5px 8px; border-bottom: 1px solid #f0f0f0; }
  tr:hover td { background: #f8f9fa; }
  .good { color: #16a34a; }
  .warn { color: #ca8a04; }
  .bad { color: #dc2626; }
  .error-count { font-weight: bold; }
  .no-data { color: #999; padding: 20px; text-align: center; }

  @media (prefers-color-scheme: dark) {
    body { background: #0f1117; color: #e0e0e0; }
    .header { border-bottom-color: #2a2d35; }
    .device-info { color: #888; }
    .device-info span { background: #1a1d25; }
    .status-ok { color: #4ade80; }
    .status-warn { color: #fbbf24; }
    .status-err { color: #f87171; }
    .updated { color: #555; }
    .card { background: #1a1d25; border-color: #1a1d25; }
    .card h2 { color: #a5b4fc; }
    th { border-bottom-color: #2a2d35; color: #888; }
    td { border-bottom-color: #1f222b; }
    tr:hover td { background: #22252e; }
    .good { color: #4ade80; }
    .warn { color: #fbbf24; }
    .bad { color: #f87171; }
    .no-data { color: #555; }
  }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>CM3500B Monitor</h1>
    <div class="updated" id="updated"></div>
  </div>
  <div class="device-info" id="device-info"></div>
</div>
<div class="grid">
  <div class="card">
    <h2>Downstream QAM (DOCSIS 3.0)</h2>
    <div id="ds-qam"><div class="no-data">Loading...</div></div>
  </div>
  <div class="card">
    <h2>Downstream OFDM (DOCSIS 3.1)</h2>
    <div id="ds-ofdm"><div class="no-data">Loading...</div></div>
  </div>
  <div class="card">
    <h2>Upstream QAM (DOCSIS 3.0)</h2>
    <div id="us-qam"><div class="no-data">Loading...</div></div>
  </div>
  <div class="card">
    <h2>Upstream OFDM (DOCSIS 3.1)</h2>
    <div id="us-ofdm"><div class="no-data">Loading...</div></div>
  </div>
</div>

<script>
function cls(val, good, warnLow, warnHigh, badLow, badHigh) {
  if (val >= good[0] && val <= good[1]) return 'good';
  if (val >= warnLow && val <= warnHigh) return 'warn';
  return 'bad';
}

function dsPowerCls(v) { return cls(v, [-7, 7], -10, 10, -Infinity, Infinity); }
function dsSnrCls(v) { return v >= 33 ? 'good' : v >= 30 ? 'warn' : 'bad'; }
function usPowerCls(v) { return cls(v, [35, 49], 30, 54, -Infinity, Infinity); }
function errCls(v) { return v > 0 ? 'bad' : 'good'; }

function formatUptime(seconds) {
  if (!seconds) return '';
  var d = Math.floor(seconds / 86400);
  var h = Math.floor((seconds % 86400) / 3600);
  var m = Math.floor((seconds % 3600) / 60);
  return d + 'd ' + h + 'h ' + m + 'm';
}

function renderDsQam(channels) {
  if (!channels || !channels.length) return '<div class="no-data">No data</div>';
  var html = '<table><tr><th>Ch</th><th>Freq</th><th>Modulation</th><th>Power</th><th>SNR</th><th>Corrected</th><th>Uncorr.</th></tr>';
  channels.forEach(function(ch) {
    html += '<tr>';
    html += '<td>' + ch.channelId + '</td>';
    html += '<td>' + ch.frequency + '</td>';
    html += '<td>' + ch.modulation + '</td>';
    html += '<td class="' + dsPowerCls(ch.power) + '">' + ch.power.toFixed(1) + ' dBmV</td>';
    html += '<td class="' + dsSnrCls(ch.snr) + '">' + ch.snr.toFixed(1) + ' dB</td>';
    html += '<td>' + ch.correcteds + '</td>';
    html += '<td class="error-count ' + errCls(ch.uncorrectables) + '">' + ch.uncorrectables + '</td>';
    html += '</tr>';
  });
  return html + '</table>';
}

function renderDsOfdm(channels) {
  if (!channels || !channels.length) return '<div class="no-data">No data</div>';
  var html = '<table><tr><th>Ch</th><th>Freq Range</th><th>Type</th><th>MER</th></tr>';
  channels.forEach(function(ch) {
    html += '<tr>';
    html += '<td>' + ch.channelId + '</td>';
    html += '<td>' + ch.frequency + '</td>';
    html += '<td>' + (ch.type || 'OFDM') + '</td>';
    html += '<td class="' + dsSnrCls(ch.mer) + '">' + ch.mer.toFixed(1) + ' dB</td>';
    html += '</tr>';
  });
  return html + '</table>';
}

function renderUsQam(channels) {
  if (!channels || !channels.length) return '<div class="no-data">No data</div>';
  var html = '<table><tr><th>Ch</th><th>Freq</th><th>Modulation</th><th>Power</th><th>Type</th></tr>';
  channels.forEach(function(ch) {
    html += '<tr>';
    html += '<td>' + ch.channelId + '</td>';
    html += '<td>' + ch.frequency + '</td>';
    html += '<td>' + ch.modulation + '</td>';
    html += '<td class="' + usPowerCls(ch.power) + '">' + ch.power.toFixed(1) + ' dBmV</td>';
    html += '<td>' + (ch.channelType || '') + '</td>';
    html += '</tr>';
  });
  return html + '</table>';
}

function renderUsOfdm(channels) {
  if (!channels || !channels.length) return '<div class="no-data">No data</div>';
  var html = '<table><tr><th>Ch</th><th>Freq Range</th><th>Modulation</th><th>Power</th></tr>';
  channels.forEach(function(ch) {
    html += '<tr>';
    html += '<td>' + ch.channelId + '</td>';
    html += '<td>' + ch.frequency + '</td>';
    html += '<td>' + (ch.modulation || 'OFDMA') + '</td>';
    html += '<td class="' + usPowerCls(ch.power) + '">' + ch.power.toFixed(1) + ' dBmV</td>';
    html += '</tr>';
  });
  return html + '</table>';
}

function update() {
  fetch('/metrics')
    .then(function(r) { return r.ok ? r.json() : Promise.reject('No data'); })
    .then(function(snap) {
      var d = snap.data;
      document.getElementById('ds-qam').innerHTML = renderDsQam(d.downstream.qam);
      document.getElementById('ds-ofdm').innerHTML = renderDsOfdm(d.downstream.ofdm);
      document.getElementById('us-qam').innerHTML = renderUsQam(d.upstream.qam);
      document.getElementById('us-ofdm').innerHTML = renderUsOfdm(d.upstream.ofdm);

      var info = d.device || {};
      var infoHtml = '<span>' + (info.model || 'CM3500B') + '</span>';
      if (info.uptimeSeconds) infoHtml += '<span>Uptime: ' + formatUptime(info.uptimeSeconds) + '</span>';
      if (info.status) {
        var sCls = info.status === 'OPERATIONAL' ? 'status-ok' : 'status-warn';
        infoHtml += '<span class="' + sCls + '">' + info.status + '</span>';
      }
      document.getElementById('device-info').innerHTML = infoHtml;
      document.getElementById('updated').textContent = 'Last update: ' + new Date(snap.timestamp).toLocaleString();
    })
    .catch(function(e) {
      document.getElementById('updated').textContent = 'Waiting for first scrape...';
    });
}

update();
setInterval(update, 30000);
</script>
</body>
</html>`;
