const https = require('https');
const http = require('http');
const { URL } = require('url');
const cheerio = require('cheerio');

// Disable SSL verification for self-signed modem certs
const agent = new https.Agent({ rejectUnauthorized: false });

async function request(url, options = {}) {
  const parsed = new URL(url);
  const mod = parsed.protocol === 'https:' ? https : http;
  const reqOpts = {
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path: parsed.pathname + parsed.search,
    method: options.method || 'GET',
    headers: options.headers || {},
    timeout: 30000,
    agent: parsed.protocol === 'https:' ? agent : undefined,
  };

  return new Promise((resolve, reject) => {
    const req = mod.request(reqOpts, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
        } else {
          resolve({ statusCode: res.statusCode, body });
        }
      });
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.on('error', reject);

    if (options.body) req.write(options.body);
    req.end();
  });
}

async function login(modemUrl, username, password) {
  const url = `${modemUrl}/cgi-bin/login_cgi`;
  const body = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await request(url, { method: 'POST', headers, body });
      console.log('[scraper] CM3500 auth OK');
      return;
    } catch (err) {
      if (attempt === 0 && (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED')) {
        console.warn('[scraper] Connection lost, retrying...');
        continue;
      }
      throw new Error(`CM3500 auth failed: ${err.message}`);
    }
  }
}

async function fetchStatusPage(modemUrl) {
  const res = await request(`${modemUrl}/cgi-bin/status_cgi`);
  return res.body;
}

function parseNumber(value) {
  if (!value || !value.trim()) return 0;
  const num = parseFloat(value.trim().split(/\s+/)[0]);
  return isNaN(num) ? 0 : num;
}

function formatFreq(freqStr) {
  if (!freqStr) return '';
  const parts = freqStr.trim().split(/\s+/);
  const mhz = parseFloat(parts[0]);
  if (isNaN(mhz)) return freqStr;
  return `${Math.floor(mhz)} MHz`;
}

function findTableSections($) {
  const sections = {};
  $('h4').each((_, el) => {
    const heading = $(el).text().trim().toLowerCase();
    const table = $(el).nextAll('table').first();
    if (table.length) sections[heading] = table;
  });
  return sections;
}

function parseDsQam($, table) {
  const rows = table.find('tr');
  const result = [];
  rows.each((i, row) => {
    if (i === 0) return; // skip header
    const cells = $(row).find('td').map((_, td) => $(td).text().trim()).get();
    if (cells.length < 9) return;
    result.push({
      channelId: parseInt(parseNumber(cells[1])),
      frequency: formatFreq(cells[2]),
      power: parseNumber(cells[3]),
      snr: parseNumber(cells[4]),
      modulation: cells[5],
      correcteds: parseInt(parseNumber(cells[7])),
      uncorrectables: parseInt(parseNumber(cells[8])),
    });
  });
  return result;
}

function parseDsOfdm($, table) {
  const tbody = table.find('tbody');
  if (!tbody.length) return [];
  const result = [];
  let chanId = 200;
  tbody.find('tr').each((_, row) => {
    const cells = $(row).find('td').map((_, td) => $(td).text().trim()).get();
    if (cells.length < 8) return;
    if (!cells[0].toLowerCase().includes('downstream')) return;
    const firstFreq = parseNumber(cells[4]);
    const lastFreq = parseNumber(cells[5]);
    const merData = cells.length > 8 ? parseNumber(cells[8]) : parseNumber(cells[7]);
    result.push({
      channelId: chanId++,
      type: 'OFDM',
      frequency: `${Math.floor(firstFreq)}-${Math.floor(lastFreq)} MHz`,
      mer: merData,
    });
  });
  return result;
}

function parseUsQam($, table) {
  const rows = table.find('tr');
  const result = [];
  rows.each((i, row) => {
    if (i === 0) return;
    const cells = $(row).find('td').map((_, td) => $(td).text().trim()).get();
    if (cells.length < 7) return;
    result.push({
      channelId: parseInt(parseNumber(cells[1])),
      frequency: formatFreq(cells[2]),
      power: parseNumber(cells[3]),
      channelType: cells[4],
      modulation: cells[6],
    });
  });
  return result;
}

function parseUsOfdm($, table) {
  const tbody = table.find('tbody');
  if (!tbody.length) return [];
  const result = [];
  let chanId = 200;
  tbody.find('tr').each((_, row) => {
    const cells = $(row).find('td').map((_, td) => $(td).text().trim()).get();
    if (cells.length < 7) return;
    if (!cells[0].toLowerCase().includes('upstream')) return;
    const lowerFreq = parseNumber(cells.length > 8 ? cells[6] : cells[4]);
    const upperFreq = parseNumber(cells.length > 8 ? cells[7] : cells[5]);
    const txPower = parseNumber(cells.length > 8 ? cells[8] : cells[6]);
    result.push({
      channelId: chanId++,
      type: 'OFDMA',
      frequency: `${Math.floor(lowerFreq)}-${Math.floor(upperFreq)} MHz`,
      power: txPower,
      modulation: 'OFDMA',
    });
  });
  return result;
}

function parseDeviceInfo($) {
  const info = {};
  $('table').each((_, table) => {
    $(table).find('tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length === 2) {
        const key = $(cells[0]).text().trim();
        const val = $(cells[1]).text().trim();
        if (key) info[key] = val;
      }
    });
  });

  const result = { model: info['Hardware Model'] || 'CM3500B', status: info['CM Status:'] || '' };
  const uptimeStr = info['System Uptime:'] || info['System Uptime'] || '';
  const m = uptimeStr.match(/(\d+)\s*d:\s*(\d+)\s*h:\s*(\d+)\s*m/);
  if (m) {
    result.uptimeSeconds = parseInt(m[1]) * 86400 + parseInt(m[2]) * 3600 + parseInt(m[3]) * 60;
  }
  return result;
}

function parseStatus(html) {
  const $ = cheerio.load(html);
  const sections = findTableSections($);

  return {
    timestamp: new Date().toISOString(),
    downstream: {
      qam: sections['downstream qam'] ? parseDsQam($, sections['downstream qam']) : [],
      ofdm: sections['downstream ofdm'] ? parseDsOfdm($, sections['downstream ofdm']) : [],
    },
    upstream: {
      qam: sections['upstream qam'] ? parseUsQam($, sections['upstream qam']) : [],
      ofdm: sections['upstream ofdm'] ? parseUsOfdm($, sections['upstream ofdm']) : [],
    },
    device: parseDeviceInfo($),
  };
}

async function scrapeModem(config) {
  await login(config.modemUrl, config.modemUser, config.modemPassword);
  const html = await fetchStatusPage(config.modemUrl);
  return parseStatus(html);
}

module.exports = { scrapeModem, parseStatus, login, fetchStatusPage };
