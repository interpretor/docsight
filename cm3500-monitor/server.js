const path = require('path');
const { initDb, insertSnapshot, pruneOld } = require('./src/db');
const { createApp } = require('./src/app');
const { scrapeModem } = require('./src/scraper');

const config = {
  modemUrl: process.env.MODEM_URL || 'https://192.168.100.1',
  modemUser: process.env.MODEM_USER || 'admin',
  modemPassword: process.env.MODEM_PASSWORD || 'password',
  pollInterval: parseInt(process.env.POLL_INTERVAL || '60', 10) * 1000,
  port: parseInt(process.env.PORT || '3000', 10),
  dbPath: process.env.DB_PATH || path.join(__dirname, 'data.db'),
};

const db = initDb(config.dbPath);
const app = createApp(db);

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

app.listen(config.port, () => {
  console.log(`[server] CM3500 Monitor listening on http://localhost:${config.port}`);
  console.log(`[server] Modem: ${config.modemUrl} (poll every ${config.pollInterval / 1000}s)`);
});
