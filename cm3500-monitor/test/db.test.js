const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { initDb, insertSnapshot, getLatest, getHistory, pruneOld } = require('../db');

function sampleData() {
  return {
    timestamp: new Date().toISOString(),
    downstream: { qam: [{ channelId: 3, power: 4.7, snr: 38.98 }], ofdm: [] },
    upstream: { qam: [{ channelId: 9, power: 39.5 }], ofdm: [] },
    device: { model: 'CM3500B', uptimeSeconds: 5000 },
  };
}

describe('database', () => {
  it('creates table on init', () => {
    const db = initDb(':memory:');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    assert.ok(tables.some(t => t.name === 'snapshots'));
    db.close();
  });

  it('inserts and retrieves a snapshot', () => {
    const db = initDb(':memory:');
    const data = sampleData();
    insertSnapshot(db, data);
    const latest = getLatest(db);
    assert.ok(latest);
    assert.equal(latest.id, 1);
    assert.ok(latest.timestamp);
    assert.deepEqual(latest.data, data);
    db.close();
  });

  it('getLatest returns null when empty', () => {
    const db = initDb(':memory:');
    assert.equal(getLatest(db), null);
    db.close();
  });

  it('getLatest returns most recent snapshot', () => {
    const db = initDb(':memory:');
    insertSnapshot(db, { ...sampleData(), marker: 'first' });
    insertSnapshot(db, { ...sampleData(), marker: 'second' });
    const latest = getLatest(db);
    assert.equal(latest.data.marker, 'second');
    assert.equal(latest.id, 2);
    db.close();
  });

  it('getHistory returns snapshots', () => {
    const db = initDb(':memory:');
    insertSnapshot(db, sampleData());
    insertSnapshot(db, sampleData());
    const history = getHistory(db, 24);
    assert.equal(history.length, 2);
    assert.ok(history[0].data.downstream);
    db.close();
  });

  it('pruneOld does not crash on empty db', () => {
    const db = initDb(':memory:');
    assert.doesNotThrow(() => pruneOld(db, 7));
    db.close();
  });

  it('handles multiple rapid inserts', () => {
    const db = initDb(':memory:');
    for (let i = 0; i < 100; i++) {
      insertSnapshot(db, { ...sampleData(), index: i });
    }
    const latest = getLatest(db);
    assert.equal(latest.data.index, 99);
    assert.equal(latest.id, 100);
    db.close();
  });

  it('preserves JSON data integrity through roundtrip', () => {
    const db = initDb(':memory:');
    const data = sampleData();
    data.downstream.qam[0].power = 4.70;
    data.downstream.qam[0].snr = 38.98;
    insertSnapshot(db, data);
    const latest = getLatest(db);
    assert.equal(latest.data.downstream.qam[0].power, 4.7);
    assert.equal(latest.data.downstream.qam[0].snr, 38.98);
    assert.equal(latest.data.device.model, 'CM3500B');
    db.close();
  });
});
