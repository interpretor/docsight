# Requirements: DOCSight — Driver Extensibility

**Defined:** 2026-03-01
**Core Value:** Accurate, real-time signal health assessment that helps users detect and escalate cable line problems before they cause visible service degradation.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### GenericDriver

- [ ] **GDRV-01**: User can select "Generic" as modem type in settings to run DOCSight without a supported DOCSIS modem
- [ ] **GDRV-02**: GenericDriver returns structurally valid but empty DOCSIS data with health status "unknown"
- [ ] **GDRV-03**: All modem-agnostic features (Speedtest, BQM, Smokeping, BNetzA, Weather, Journal) work when GenericDriver is active
- [ ] **GDRV-04**: Dashboard displays "No modem data" state instead of stale/zero values when GenericDriver is active

### Module Driver System

- [ ] **MDRV-01**: Module loader accepts `"driver"` as a valid contribution type in module manifests
- [ ] **MDRV-02**: Community module can contribute a driver class that implements the ModemDriver ABC
- [ ] **MDRV-03**: `load_driver()` falls back to module-contributed drivers after checking the built-in registry
- [ ] **MDRV-04**: Module-contributed driver appears in the modem type selection in settings
- [ ] **MDRV-05**: Existing built-in drivers continue to work without any changes

### Driver Manifest Validation

- [ ] **DVAL-01**: Module loader validates that a driver contribution references a valid Python class implementing ModemDriver ABC
- [ ] **DVAL-02**: Module loader rejects driver modules that declare invalid or missing driver entry points
- [ ] **DVAL-03**: Driver module errors are logged with actionable messages (which method is missing, what the ABC requires)

## v2 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Signal Analysis

- **ANAL-01**: User can view daily modulation performance distribution as percentage per modulation level
- **ANAL-02**: User can compare signal quality between two time periods (Before/After)
- **ANAL-03**: User can see low-modulation exposure KPI (% time below configurable threshold)

### Infrastructure

- **INFR-01**: Prometheus-compatible /metrics endpoint exposes DOCSIS signal metrics with per-channel labels
- **INFR-02**: DOCSight detects modem restarts via error counter reset and logs them as events
- **INFR-03**: Restart detection threshold is configurable in settings

## Out of Scope

| Feature | Reason |
|---------|--------|
| BQM native charts (#136) | Blocked on ThinkBroadband API access |
| Community segment heatmap (#61) | Moonshot, future milestone |
| Peering quality check (#70) | Moonshot, future milestone |
| Driver sandboxing/security isolation | Python in-process modules cannot be reliably sandboxed; use trust documentation instead |
| Auto-discovery of modem type | Complex, error-prone; explicit user selection is simpler and more reliable |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| GDRV-01 | Phase 1 | Pending |
| GDRV-02 | Phase 1 | Pending |
| GDRV-03 | Phase 1 | Pending |
| GDRV-04 | Phase 1 | Pending |
| MDRV-01 | Phase 1 | Pending |
| MDRV-02 | Phase 1 | Pending |
| MDRV-03 | Phase 1 | Pending |
| MDRV-04 | Phase 1 | Pending |
| MDRV-05 | Phase 1 | Pending |
| DVAL-01 | Phase 2 | Pending |
| DVAL-02 | Phase 2 | Pending |
| DVAL-03 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---
*Requirements defined: 2026-03-01*
*Last updated: 2026-03-01 after roadmap creation — all 12 v1 requirements mapped*
