const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { formatPrometheus } = require('../src/prometheus');
const { parseStatus } = require('../src/scraper');
const { STATUS_HTML } = require('./fixtures');

describe('formatPrometheus', () => {
  const data = parseStatus(STATUS_HTML);
  const output = formatPrometheus(data);
  const lines = output.split('\n');

  it('produces valid Prometheus format (no duplicate HELP/TYPE)', () => {
    const helpLines = lines.filter(l => l.startsWith('# HELP'));
    const typeLines = lines.filter(l => l.startsWith('# TYPE'));
    const helpNames = helpLines.map(l => l.split(' ')[2]);
    const typeNames = typeLines.map(l => l.split(' ')[2]);
    assert.deepEqual(helpNames, typeNames);
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
    assert.ok(!out.includes('cm3500_downstream_power_dbmv'));
    assert.ok(!out.includes('cm3500_upstream_power_dbmv'));
  });

  it('includes all expected metric families for full data', () => {
    const expectedMetrics = [
      'cm3500_downstream_power_dbmv',
      'cm3500_downstream_snr_db',
      'cm3500_downstream_corrected_total',
      'cm3500_downstream_uncorrectable_total',
      'cm3500_downstream_modulation',
      'cm3500_downstream_ofdm_mer_db',
      'cm3500_upstream_power_dbmv',
      'cm3500_upstream_modulation',
      'cm3500_device_info',
      'cm3500_device_uptime_seconds',
      'cm3500_last_scrape_timestamp_seconds',
    ];
    for (const name of expectedMetrics) {
      assert.ok(output.includes(`# HELP ${name}`), `Missing metric: ${name}`);
      assert.ok(output.includes(`# TYPE ${name}`), `Missing TYPE for: ${name}`);
    }
  });

  it('emits one value per downstream QAM channel per metric', () => {
    // STATUS_HTML has 3 DS QAM channels
    const powerLines = lines.filter(l => l.startsWith('cm3500_downstream_power_dbmv{'));
    assert.equal(powerLines.length, 3);
    const snrLines = lines.filter(l => l.startsWith('cm3500_downstream_snr_db{'));
    assert.equal(snrLines.length, 3);
  });

  it('emits one value per upstream QAM channel per metric', () => {
    // STATUS_HTML has 3 US QAM channels
    const powerLines = lines.filter(l => l.startsWith('cm3500_upstream_power_dbmv{'));
    assert.equal(powerLines.length, 3);
  });
});
