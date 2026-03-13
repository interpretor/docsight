// Sample HTML from the real CM3500B status page (copied from DOCSight Python test suite)

const STATUS_HTML = `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN">
<html><head><title>Touchstone Status</title></head>
<body class="CM3500">
<div class="main_body">

<h4> Downstream QAM </h4>
<table class="heading2 thinset spc0">
<tbody>
<tr>
  <td></td><td>DCID</td><td>Freq</td><td>Power</td><td>SNR</td>
  <td>Modulation</td><td>Octets</td><td>Correcteds</td><td>Uncorrectables</td>
</tr>
<tr><td>Downstream 1</td><td>3</td><td>570.00 MHz</td><td>4.70 dBmV</td><td>38.98 dB</td><td>256QAM</td><td>200962211770</td><td>92</td><td>0</td></tr>
<tr><td>Downstream 2</td><td>4</td><td>578.00 MHz</td><td>4.80 dBmV</td><td>38.61 dB</td><td>256QAM</td><td>101707462174</td><td>114515</td><td>0</td></tr>
<tr><td>Downstream 3</td><td>5</td><td>586.00 MHz</td><td>4.70 dBmV</td><td>38.98 dB</td><td>256QAM</td><td>299546718863</td><td>108</td><td>0</td></tr>
</tbody>
</table>

<h4> Downstream OFDM </h4>
<table class="heading2 thinset spc0">
<thead>
<tr>
  <td rowspan="2"></td><td rowspan="2">FFT Type</td>
  <td rowspan="2">Channel Width(MHz)</td><td rowspan="2"># of Active Subcarriers</td>
  <td rowspan="2">First Active Subcarrier(MHz)</td><td rowspan="2">Last Active Subcarrier(MHz)</td>
  <td colspan="3">Average RxMER(dB)</td>
</tr>
<tr><td>Pilot</td><td>PLC</td><td>Data</td></tr>
</thead>
<tbody>
<tr><td>Downstream 1</td><td>4K</td><td>190</td><td>3800</td><td>135</td><td>324</td><td>47</td><td>40</td><td>41</td></tr>
<tr><td>Downstream 2</td><td>4K</td><td>110</td><td>2200</td><td>751</td><td>860</td><td>43</td><td>36</td><td>37</td></tr>
</tbody>
</table>

<h4> Upstream QAM </h4>
<table class="heading2 thinset spc0">
<tbody>
<tr>
  <td></td><td>UCID</td><td>Freq</td><td>Power</td>
  <td>Channel Type</td><td>Symbol Rate</td><td>Modulation</td>
</tr>
<tr><td>Upstream 1</td><td>9</td><td>30.80 MHz</td><td>39.50 dBmV</td><td>DOCSIS2.0 (ATDMA)</td><td>5120 kSym/s</td><td>64QAM</td></tr>
<tr><td>Upstream 2</td><td>13</td><td>58.40 MHz</td><td>40.00 dBmV</td><td>DOCSIS2.0 (ATDMA)</td><td>5120 kSym/s</td><td>64QAM</td></tr>
<tr><td>Upstream 3</td><td>12</td><td>51.00 MHz</td><td>39.75 dBmV</td><td>DOCSIS2.0 (ATDMA)</td><td>5120 kSym/s</td><td>64QAM</td></tr>
</tbody>
</table>

<h4> Upstream OFDM </h4>
<table class="heading2 thinset spc0">
<tbody>
<tr>
  <td></td><td>FFT Type</td><td>Channel Width(MHz)</td>
  <td># of Active Subcarriers</td><td>First Active Subcarrier(MHz)</td>
  <td>Last Active Subcarrier(MHz)</td><td>Tx Power(dBmV)</td>
</tr>
</tbody>
</table>

<table cellpadding="0" cellspacing="0">
<tbody>
<tr><td width="160">System Uptime: </td><td>58 d:  1 h: 30 m</td></tr>
<tr><td width="160">CM Status:</td><td>OPERATIONAL</td></tr>
</tbody>
</table>

<table CELLSPACING=0 CELLPADDING=0>
<tr><td width="160">Hardware Model</td><td>CM3500B</td></tr>
<tr><td width="160">Hardware Info</td><td>ARRIS DOCSIS 3.1 / EuroDOCSIS 3.0 Touchstone Cable Modem</td></tr>
</table>

</div>
</body></html>`;

// Variant with upstream OFDM data row
const STATUS_HTML_WITH_US_OFDM = STATUS_HTML.replace(
  `<h4> Upstream OFDM </h4>
<table class="heading2 thinset spc0">
<tbody>
<tr>
  <td></td><td>FFT Type</td><td>Channel Width(MHz)</td>
  <td># of Active Subcarriers</td><td>First Active Subcarrier(MHz)</td>
  <td>Last Active Subcarrier(MHz)</td><td>Tx Power(dBmV)</td>
</tr>
</tbody>
</table>`,
  `<h4> Upstream OFDM </h4>
<table class="heading2 thinset spc0">
<tbody>
<tr>
  <td></td><td>FFT Type</td><td>Channel Width(MHz)</td>
  <td># of Active Subcarriers</td><td>First Active Subcarrier(MHz)</td>
  <td>Last Active Subcarrier(MHz)</td><td>Tx Power(dBmV)</td>
</tr>
<tr><td>Upstream 0</td><td>2K</td><td>32.000000</td><td>640</td><td>74</td><td>773</td><td>29.8</td><td>64.8</td><td>42.250000</td></tr>
</tbody>
</table>`
);

// Minimal empty HTML for edge case tests
const EMPTY_HTML = '<html><body></body></html>';

module.exports = { STATUS_HTML, STATUS_HTML_WITH_US_OFDM, EMPTY_HTML };
