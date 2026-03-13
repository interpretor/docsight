const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { createApp, formatPrometheus } = require('../server');
const { initDb, insertSnapshot } = require('../db');
const { parseStatus } = require('../scraper');
const { STATUS_HTML } = require('./fixtures');

function fetch(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
  });
}

describe('API routes', () => {
  let server, baseUrl, db;

  before(() => {
    db = initDb(':memory:');
    const app = createApp(db);
    server = app.listen(0); // random port
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(() => {
    server.close();
    db.close();
  });

  describe('GET /metrics (empty)', () => {
    it('returns 503 when no data', async () => {
      const res = await fetch(`${baseUrl}/metrics`);
      assert.equal(res.status, 503);
      assert.ok(res.body.includes('No data yet'));
    });
  });

  describe('GET /api/latest (empty)', () => {
    it('returns 503 when no data', async () => {
      const res = await fetch(`${baseUrl}/api/latest`);
      assert.equal(res.status, 503);
      const json = JSON.parse(res.body);
      assert.equal(json.error, 'No data yet');
    });
  });

  describe('GET /', () => {
    it('returns dashboard HTML', async () => {
      const res = await fetch(`${baseUrl}/`);
      assert.equal(res.status, 200);
      assert.ok(res.headers['content-type'].includes('html'));
      assert.ok(res.body.includes('CM3500B Monitor'));
      assert.ok(res.body.includes('Downstream QAM'));
      assert.ok(res.body.includes('Upstream QAM'));
    });
  });
});

describe('API routes (with data)', () => {
  let server, baseUrl, db;

  before(() => {
    db = initDb(':memory:');
    const data = parseStatus(STATUS_HTML);
    insertSnapshot(db, data);
    const app = createApp(db);
    server = app.listen(0);
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => {
    server.close();
    db.close();
  });

  describe('GET /metrics', () => {
    it('returns 200 with Prometheus content type', async () => {
      const res = await fetch(`${baseUrl}/metrics`);
      assert.equal(res.status, 200);
      assert.ok(res.headers['content-type'].includes('text/plain'));
    });

    it('contains HELP and TYPE headers', async () => {
      const res = await fetch(`${baseUrl}/metrics`);
      assert.ok(res.body.includes('# HELP cm3500_downstream_power_dbmv'));
      assert.ok(res.body.includes('# TYPE cm3500_downstream_power_dbmv gauge'));
    });

    it('contains downstream channel metrics', async () => {
      const res = await fetch(`${baseUrl}/metrics`);
      assert.ok(res.body.includes('cm3500_downstream_power_dbmv{channel_id="3"'));
      assert.ok(res.body.includes('4.7'));
      assert.ok(res.body.includes('cm3500_downstream_snr_db{channel_id="3"} 38.98'));
    });

    it('contains upstream channel metrics', async () => {
      const res = await fetch(`${baseUrl}/metrics`);
      assert.ok(res.body.includes('cm3500_upstream_power_dbmv{channel_id="9"'));
      assert.ok(res.body.includes('39.5'));
    });

    it('contains error counters', async () => {
      const res = await fetch(`${baseUrl}/metrics`);
      assert.ok(res.body.includes('# TYPE cm3500_downstream_corrected_total counter'));
      assert.ok(res.body.includes('cm3500_downstream_corrected_total{channel_id="3"} 92'));
    });

    it('contains OFDM MER metrics', async () => {
      const res = await fetch(`${baseUrl}/metrics`);
      assert.ok(res.body.includes('cm3500_downstream_ofdm_mer_db{channel_id="200"'));
    });

    it('contains device info', async () => {
      const res = await fetch(`${baseUrl}/metrics`);
      assert.ok(res.body.includes('cm3500_device_info{model="CM3500B"'));
      assert.ok(res.body.includes('cm3500_device_uptime_seconds'));
    });

    it('contains scrape timestamp', async () => {
      const res = await fetch(`${baseUrl}/metrics`);
      assert.ok(res.body.includes('cm3500_last_scrape_timestamp_seconds'));
    });

    it('ends with newline', async () => {
      const res = await fetch(`${baseUrl}/metrics`);
      assert.ok(res.body.endsWith('\n'));
    });
  });

  describe('GET /api/latest', () => {
    it('returns 200 with JSON', async () => {
      const res = await fetch(`${baseUrl}/api/latest`);
      assert.equal(res.status, 200);
      assert.ok(res.headers['content-type'].includes('json'));
    });

    it('contains full snapshot data', async () => {
      const res = await fetch(`${baseUrl}/api/latest`);
      const json = JSON.parse(res.body);
      assert.ok(json.id);
      assert.ok(json.timestamp);
      assert.equal(json.data.downstream.qam.length, 3);
      assert.equal(json.data.upstream.qam.length, 3);
      assert.equal(json.data.downstream.ofdm.length, 2);
      assert.equal(json.data.device.model, 'CM3500B');
    });
  });

  describe('GET /api/history', () => {
    it('returns array of snapshots', async () => {
      const res = await fetch(`${baseUrl}/api/history?hours=24`);
      assert.equal(res.status, 200);
      const json = JSON.parse(res.body);
      assert.ok(Array.isArray(json));
      assert.equal(json.length, 1);
      assert.ok(json[0].data.downstream);
    });
  });
});

describe('formatPrometheus', () => {
  const data = parseStatus(STATUS_HTML);
  const output = formatPrometheus(data);
  const lines = output.split('\n');

  it('produces valid Prometheus format (no duplicate HELP/TYPE)', () => {
    const helpLines = lines.filter(l => l.startsWith('# HELP'));
    const typeLines = lines.filter(l => l.startsWith('# TYPE'));
    // Each metric name should appear once in HELP and once in TYPE
    const helpNames = helpLines.map(l => l.split(' ')[2]);
    const typeNames = typeLines.map(l => l.split(' ')[2]);
    assert.deepEqual(helpNames, typeNames);
    // No duplicate metric names
    const uniqueHelp = new Set(helpNames);
    assert.equal(uniqueHelp.size, helpNames.length, 'Duplicate HELP declarations found');
  });

  it('every metric value line has a numeric value', () => {
    const valueLines = lines.filter(l => l && !l.startsWith('#'));
    for (const line of valueLines) {
      const value = line.split(' ').pop();
      assert.ok(!isNaN(parseFloat(value)), `Non-numeric value in line: ${line}`);
    }
  });

  it('label values are properly quoted', () => {
    const labelLines = lines.filter(l => l.includes('{'));
    for (const line of labelLines) {
      const match = line.match(/\{(.+)\}/);
      assert.ok(match, `Malformed label line: ${line}`);
      // All label values should be in double quotes
      const pairs = match[1].split(',');
      for (const pair of pairs) {
        assert.ok(pair.includes('="'), `Label value not quoted in: ${pair}`);
        assert.ok(pair.endsWith('"'), `Label value not closed in: ${pair}`);
      }
    }
  });

  it('output ends with newline', () => {
    assert.ok(output.endsWith('\n'));
  });

  it('handles data with empty channel arrays', () => {
    const emptyData = {
      timestamp: new Date().toISOString(),
      downstream: { qam: [], ofdm: [] },
      upstream: { qam: [], ofdm: [] },
      device: { model: 'CM3500B', status: 'OPERATIONAL', uptimeSeconds: 100 },
    };
    const out = formatPrometheus(emptyData);
    assert.ok(out.includes('cm3500_device_info'));
    assert.ok(out.includes('cm3500_last_scrape_timestamp_seconds'));
    // Should NOT include channel metrics
    assert.ok(!out.includes('cm3500_downstream_power_dbmv'));
    assert.ok(!out.includes('cm3500_upstream_power_dbmv'));
  });
});

describe('dashboard HTML', () => {
  it('contains auto-refresh script', async () => {
    const db = initDb(':memory:');
    const app = createApp(db);
    const server = app.listen(0);
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/`);
    assert.ok(res.body.includes('setInterval(update'));
    assert.ok(res.body.includes("fetch('/api/latest')"));
    server.close();
    db.close();
  });

  it('has dark mode media query', async () => {
    const db = initDb(':memory:');
    const app = createApp(db);
    const server = app.listen(0);
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/`);
    assert.ok(res.body.includes('prefers-color-scheme: dark'));
    server.close();
    db.close();
  });

  it('contains all four channel sections', async () => {
    const db = initDb(':memory:');
    const app = createApp(db);
    const server = app.listen(0);
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/`);
    assert.ok(res.body.includes('Downstream QAM'));
    assert.ok(res.body.includes('Downstream OFDM'));
    assert.ok(res.body.includes('Upstream QAM'));
    assert.ok(res.body.includes('Upstream OFDM'));
    server.close();
    db.close();
  });
});
