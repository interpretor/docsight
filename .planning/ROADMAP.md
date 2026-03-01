# Roadmap: DOCSight — Driver Extensibility Milestone

## Overview

This milestone makes DOCSight runnable without a supported DOCSIS modem and extensible by the community through driver contributions. Phase 1 builds the GenericDriver and the module loader driver hook — the two changes that share the driver subsystem and must be validated together. Phase 2 adds the validation layer that enforces correctness of community driver contributions, closing the extension point safely.

## Phases

**Phase Numbering:**
- Integer phases (1, 2): Planned milestone work
- Decimal phases (1.1, 1.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Driver Foundation** - GenericDriver for non-DOCSIS hardware + module loader driver hook for community contributions
- [ ] **Phase 2: Driver Validation** - Manifest validation that enforces driver module correctness and surfaces actionable errors

## Phase Details

### Phase 1: Driver Foundation
**Goal**: Any user can run DOCSight without a supported DOCSIS modem, and community authors can contribute drivers via the module system without touching core code
**Depends on**: Nothing (first phase)
**Requirements**: GDRV-01, GDRV-02, GDRV-03, GDRV-04, MDRV-01, MDRV-02, MDRV-03, MDRV-04, MDRV-05
**Success Criteria** (what must be TRUE):
  1. User can select "Generic" in modem type settings and DOCSight starts without a real DOCSIS modem — no errors, no stale values
  2. Dashboard shows a visually distinct "No modem data" state (not a green health badge) when GenericDriver is active
  3. All modem-agnostic features (Speedtest, BQM, Smokeping, BNetzA, Weather, Journal) function normally with GenericDriver active
  4. A community module folder with a `"driver"` contribution type loads its driver class and makes it appear in the modem type selector in settings
  5. All six existing built-in drivers continue working without any changes
**Plans**: TBD

### Phase 2: Driver Validation
**Goal**: The module loader validates driver contributions and rejects or logs invalid ones with actionable error messages
**Depends on**: Phase 1
**Requirements**: DVAL-01, DVAL-02, DVAL-03
**Success Criteria** (what must be TRUE):
  1. A driver module that does not implement all required ModemDriver ABC methods is rejected at load time with a message naming the missing method
  2. A driver module with a missing or invalid driver entry point is rejected with a clear error stating what was expected
  3. Valid driver modules load without error; only invalid ones are rejected
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Driver Foundation | 0/TBD | Not started | - |
| 2. Driver Validation | 0/TBD | Not started | - |
