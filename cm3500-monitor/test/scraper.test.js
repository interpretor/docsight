const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseStatus } = require('../src/scraper');
const { STATUS_HTML, STATUS_HTML_WITH_US_OFDM, EMPTY_HTML } = require('./fixtures');

describe('parseStatus', () => {
  const data = parseStatus(STATUS_HTML);

  describe('downstream QAM', () => {
    it('parses correct channel count', () => {
      assert.equal(data.downstream.qam.length, 3);
    });

    it('parses channel ID', () => {
      assert.equal(data.downstream.qam[0].channelId, 3);
      assert.equal(data.downstream.qam[1].channelId, 4);
      assert.equal(data.downstream.qam[2].channelId, 5);
    });

    it('parses frequency', () => {
      assert.equal(data.downstream.qam[0].frequency, '570 MHz');
      assert.equal(data.downstream.qam[1].frequency, '578 MHz');
    });

    it('parses power level', () => {
      assert.equal(data.downstream.qam[0].power, 4.7);
      assert.equal(data.downstream.qam[1].power, 4.8);
    });

    it('parses SNR', () => {
      assert.equal(data.downstream.qam[0].snr, 38.98);
      assert.equal(data.downstream.qam[1].snr, 38.61);
    });

    it('parses modulation', () => {
      assert.equal(data.downstream.qam[0].modulation, '256QAM');
    });

    it('parses corrected errors', () => {
      assert.equal(data.downstream.qam[0].correcteds, 92);
      assert.equal(data.downstream.qam[1].correcteds, 114515);
    });

    it('parses uncorrectable errors', () => {
      assert.equal(data.downstream.qam[0].uncorrectables, 0);
    });
  });

  describe('downstream OFDM', () => {
    it('parses correct channel count', () => {
      assert.equal(data.downstream.ofdm.length, 2);
    });

    it('assigns auto-incrementing channel IDs starting at 200', () => {
      assert.equal(data.downstream.ofdm[0].channelId, 200);
      assert.equal(data.downstream.ofdm[1].channelId, 201);
    });

    it('parses frequency range', () => {
      assert.equal(data.downstream.ofdm[0].frequency, '135-324 MHz');
      assert.equal(data.downstream.ofdm[1].frequency, '751-860 MHz');
    });

    it('parses MER (Data column)', () => {
      assert.equal(data.downstream.ofdm[0].mer, 41);
      assert.equal(data.downstream.ofdm[1].mer, 37);
    });

    it('sets type to OFDM', () => {
      assert.equal(data.downstream.ofdm[0].type, 'OFDM');
    });
  });

  describe('upstream QAM', () => {
    it('parses correct channel count', () => {
      assert.equal(data.upstream.qam.length, 3);
    });

    it('parses channel ID', () => {
      assert.equal(data.upstream.qam[0].channelId, 9);
      assert.equal(data.upstream.qam[1].channelId, 13);
      assert.equal(data.upstream.qam[2].channelId, 12);
    });

    it('parses frequency', () => {
      assert.equal(data.upstream.qam[0].frequency, '30 MHz');
    });

    it('parses power level', () => {
      assert.equal(data.upstream.qam[0].power, 39.5);
      assert.equal(data.upstream.qam[1].power, 40.0);
    });

    it('parses modulation', () => {
      assert.equal(data.upstream.qam[0].modulation, '64QAM');
    });

    it('parses channel type', () => {
      assert.equal(data.upstream.qam[0].channelType, 'DOCSIS2.0 (ATDMA)');
    });
  });

  describe('upstream OFDM', () => {
    it('returns empty array when table has no data rows', () => {
      assert.equal(data.upstream.ofdm.length, 0);
    });

    it('parses upstream OFDM when data rows present', () => {
      const withOfdm = parseStatus(STATUS_HTML_WITH_US_OFDM);
      assert.equal(withOfdm.upstream.ofdm.length, 1);
      assert.equal(withOfdm.upstream.ofdm[0].channelId, 200);
      assert.equal(withOfdm.upstream.ofdm[0].type, 'OFDMA');
      assert.equal(withOfdm.upstream.ofdm[0].frequency, '29-64 MHz');
      assert.equal(withOfdm.upstream.ofdm[0].power, 42.25);
    });
  });

  describe('device info', () => {
    it('parses hardware model', () => {
      assert.equal(data.device.model, 'CM3500B');
    });

    it('parses uptime', () => {
      const expected = 58 * 86400 + 1 * 3600 + 30 * 60;
      assert.equal(data.device.uptimeSeconds, expected);
    });

    it('parses CM status', () => {
      assert.equal(data.device.status, 'OPERATIONAL');
    });
  });

  describe('timestamp', () => {
    it('includes ISO timestamp', () => {
      assert.ok(data.timestamp);
      assert.ok(!isNaN(new Date(data.timestamp).getTime()));
    });
  });

  describe('edge cases', () => {
    it('handles empty HTML gracefully', () => {
      const empty = parseStatus(EMPTY_HTML);
      assert.deepEqual(empty.downstream.qam, []);
      assert.deepEqual(empty.downstream.ofdm, []);
      assert.deepEqual(empty.upstream.qam, []);
      assert.deepEqual(empty.upstream.ofdm, []);
      assert.equal(empty.device.model, 'CM3500B'); // fallback
    });
  });
});
