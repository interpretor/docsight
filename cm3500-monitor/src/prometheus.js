function formatPrometheus(data) {
  const lines = [];

  function metric(name, help, type, value, labels) {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} ${type}`);
    metricValue(name, value, labels);
  }

  function metricFamilyOpen(name, help, type) {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} ${type}`);
  }

  function metricValue(name, value, labels) {
    if (labels) {
      const labelStr = Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',');
      lines.push(`${name}{${labelStr}} ${value}`);
    } else {
      lines.push(`${name} ${value}`);
    }
  }

  // Downstream QAM channels
  if (data.downstream.qam.length) {
    metricFamilyOpen('cm3500_downstream_power_dbmv', 'Downstream channel power level in dBmV', 'gauge');
    for (const ch of data.downstream.qam) {
      metricValue('cm3500_downstream_power_dbmv', ch.power, { channel_id: ch.channelId, frequency: ch.frequency });
    }

    metricFamilyOpen('cm3500_downstream_snr_db', 'Downstream channel signal-to-noise ratio in dB', 'gauge');
    for (const ch of data.downstream.qam) {
      metricValue('cm3500_downstream_snr_db', ch.snr, { channel_id: ch.channelId });
    }

    metricFamilyOpen('cm3500_downstream_corrected_total', 'Downstream correctable codeword errors', 'counter');
    for (const ch of data.downstream.qam) {
      metricValue('cm3500_downstream_corrected_total', ch.correcteds, { channel_id: ch.channelId });
    }

    metricFamilyOpen('cm3500_downstream_uncorrectable_total', 'Downstream uncorrectable codeword errors', 'counter');
    for (const ch of data.downstream.qam) {
      metricValue('cm3500_downstream_uncorrectable_total', ch.uncorrectables, { channel_id: ch.channelId });
    }

    metricFamilyOpen('cm3500_downstream_modulation', 'Downstream channel modulation info', 'gauge');
    for (const ch of data.downstream.qam) {
      metricValue('cm3500_downstream_modulation', 1, { channel_id: ch.channelId, modulation: ch.modulation });
    }
  }

  // Downstream OFDM channels
  if (data.downstream.ofdm.length) {
    metricFamilyOpen('cm3500_downstream_ofdm_mer_db', 'Downstream OFDM MER in dB', 'gauge');
    for (const ch of data.downstream.ofdm) {
      metricValue('cm3500_downstream_ofdm_mer_db', ch.mer, { channel_id: ch.channelId, frequency: ch.frequency });
    }
  }

  // Upstream QAM channels
  if (data.upstream.qam.length) {
    metricFamilyOpen('cm3500_upstream_power_dbmv', 'Upstream channel transmit power in dBmV', 'gauge');
    for (const ch of data.upstream.qam) {
      metricValue('cm3500_upstream_power_dbmv', ch.power, { channel_id: ch.channelId, frequency: ch.frequency });
    }

    metricFamilyOpen('cm3500_upstream_modulation', 'Upstream channel modulation info', 'gauge');
    for (const ch of data.upstream.qam) {
      metricValue('cm3500_upstream_modulation', 1, { channel_id: ch.channelId, modulation: ch.modulation });
    }
  }

  // Upstream OFDM channels
  if (data.upstream.ofdm.length) {
    metricFamilyOpen('cm3500_upstream_ofdm_power_dbmv', 'Upstream OFDMA transmit power in dBmV', 'gauge');
    for (const ch of data.upstream.ofdm) {
      metricValue('cm3500_upstream_ofdm_power_dbmv', ch.power, { channel_id: ch.channelId, frequency: ch.frequency });
    }
  }

  // Device info
  if (data.device) {
    metric('cm3500_device_info', 'Device information', 'gauge', 1, { model: data.device.model, status: data.device.status || '' });
    if (data.device.uptimeSeconds != null) {
      metric('cm3500_device_uptime_seconds', 'Device uptime in seconds', 'gauge', data.device.uptimeSeconds);
    }
  }

  metric('cm3500_last_scrape_timestamp_seconds', 'Unix timestamp of last successful scrape', 'gauge', Math.floor(new Date(data.timestamp).getTime() / 1000));

  return lines.join('\n') + '\n';
}

module.exports = { formatPrometheus };
