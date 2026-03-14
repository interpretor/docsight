# DOCSight – Vollständige Sicherheits- und Datenschutzanalyse

**Analysedatum:** 2026-03-14
**Analysierte Version:** main-Branch (Commit `975ef53`)
**Analysemethode:** Vollständige statische Codeanalyse aller Quelldateien

---

## 1. Was ist DOCSight?

DOCSight ist ein **lokal betriebenes** DOCSIS-Kabelmodem-Monitoring-Tool. Es liest Signalwerte (Leistung, SNR, Modulation, Fehlerraten) von Kabelmodems verschiedener Hersteller aus, speichert diese in einer lokalen SQLite-Datenbank und stellt sie über ein Web-Dashboard dar. Das Tool analysiert die Signalqualität, erkennt Probleme und kann optional Benachrichtigungen versenden.

### Kernfunktionen
- Zyklisches Polling von Modem-Signaldaten (17 unterstützte Modem-Treiber)
- Signalanalyse und Gesundheitsbewertung (Health Score)
- Web-Dashboard mit Echtzeit-Anzeige
- Prometheus-Metriken-Export (`/api/metrics`)
- Historische Datenspeicherung in SQLite
- Optionale Integrationen: MQTT, Speedtest, Wetter, BQM, Webhooks
- Plugin-/Modulsystem mit Community-Themes
- Backup/Restore mit verschlüsselter Konfiguration
- Connection Monitor mit ICMP/TCP-Probing
- BNetzA-Breitbandmessungs-Integration
- Journal/Incident-Tracking mit Dateianhängen

---

## 2. Architektur und Komponenten

### 2.1 Technologie-Stack
| Komponente | Technologie |
|---|---|
| Backend | Python 3.12, Flask 3.1, Waitress WSGI (4 Threads) |
| Datenbank | SQLite (WAL-Modus), 2 Datenbanken |
| Frontend | Jinja2-Templates, Vanilla JS, CDN-Bibliotheken |
| Container | Docker (Multi-Stage Build, Non-Root) |
| Verschlüsselung | Fernet (AES-128-CBC + HMAC-SHA256) |
| Hashing | Werkzeug (scrypt/pbkdf2) |

### 2.2 Verzeichnisstruktur
```
app/
├── main.py              # Einstiegspunkt, Orchestrator
├── web.py               # Flask-App, Routen, Auth, Security Headers
├── config.py            # Konfiguration mit Verschlüsselung
├── analyzer.py          # DOCSIS-Signalanalyse
├── notifier.py          # Webhook-Benachrichtigungen
├── prometheus.py        # Prometheus-Exporter
├── fritzbox.py          # FRITZ!Box TR-064 Treiber
├── theme_registry.py    # Community-Theme-Registry (SSRF-geschützt)
├── module_loader.py     # Plugin-System mit Manifest-Validierung
├── gaming_index.py      # Gaming-Qualitätsindex
├── tz.py                # Zeitzonen-Hilfsfunktionen
├── blueprints/          # Flask-Blueprint-Module (9 Dateien)
├── collectors/          # Datensammler (Modem, Demo, Speedtest, BQM, BNetzA, Segment)
├── drivers/             # 17 Modem-Treiber
├── modules/             # Plugin-Module (MQTT, Wetter, Backup, Journal, Smokeping, etc.)
│   ├── backup/          # Backup/Restore mit Pfad-Traversal-Schutz
│   ├── mqtt/            # MQTT-Publisher mit HA-Discovery
│   ├── weather/         # Open-Meteo API Client
│   ├── speedtest/       # Speedtest Tracker Client
│   ├── journal/         # Incident-Journal mit Dateianhängen
│   ├── bnetz/           # BNetzA-Breitbandmessung (PDF/CSV-Parser)
│   ├── bqm/             # ThinkBroadband BQM
│   ├── connection_monitor/  # ICMP/TCP-Probing
│   ├── smokeping/       # Smokeping-Integration
│   └── [11 Theme-Module]
├── storage/             # Persistenz-Schicht (11 Module)
├── i18n/                # Internationalisierung
├── templates/           # Jinja2-Vorlagen
├── static/              # CSS, JS, Fonts, Vendor
└── fixtures/            # Test-Daten
tools/
└── icmp_probe_helper.c  # SUID-Binary für ICMP-Probing
```

---

## 3. Abhängigkeiten

### 3.1 Python-Abhängigkeiten (`requirements.txt`)

| Paket | Version | Zweck | Risikobewertung |
|---|---|---|---|
| `requests` | >=2.32 | HTTP-Client für Modem/API-Kommunikation | Gering – weit verbreitet, gut gepflegt |
| `paho-mqtt` | >=2.1 | MQTT-Client (Home Assistant) | Gering – optional, gut gepflegt |
| `flask` | >=3.1 | Web-Framework | Gering – Industriestandard |
| `waitress` | >=3.0.2 | WSGI-Server (Produktion) | Gering – robuster Produktionsserver |
| `cryptography` | >=46.0 | Fernet-Verschlüsselung für Secrets | Gering – OpenSSL-basiert, aktiv gepflegt |
| `pycryptodome` | >=3.23 | Kryptografie (FRITZ!Box PBKDF2/MD5) | Gering – etablierte Bibliothek |
| `fpdf2` | >=2.8.4 | PDF-Generierung (BNetzA-Beschwerdebriefe) | Gering – reine Python-Bibliothek |
| `beautifulsoup4` | >=4.14 | HTML-Parsing (Modem-Statusseiten) | Gering – nur lokales Parsing |
| `pypdf` | >=6.0 | PDF-Textextraktion (BNetzA-Uploads) | Gering – nur lokale Verarbeitung |
| `openpyxl` | >=3.1.5 | Excel-Export/Import (Journal) | Gering – nur lokale Verarbeitung |

**Bewertung:** Alle Abhängigkeiten sind etablierte, gut gewartete Open-Source-Bibliotheken. Keine unbekannten oder unseriösen Pakete. Dependabot ist für automatische Sicherheitsupdates aktiviert.

### 3.2 Keine versteckten Abhängigkeiten
- Keine Tracking-/Analytics-SDKs (kein Sentry, Google Analytics, Matomo)
- Keine Telemetrie-Bibliotheken
- Keine Cloud-SDKs (AWS, GCP, Azure)

### 3.3 Frontend-CDN-Abhängigkeiten
Die CSP-Header erlauben Laden von:
- `https://unpkg.com` – JavaScript-Bibliotheken (z.B. Chart.js)
- `https://cdn.jsdelivr.net` – JavaScript-Bibliotheken
- `https://fonts.googleapis.com` – Google Fonts CSS
- `https://fonts.gstatic.com` – Google Font-Dateien

**Anmerkung:** Diese Verbindungen werden vom **Browser des Benutzers** hergestellt, nicht vom Server. Google/CDN-Anbieter sehen dabei die IP und den User-Agent des Browsers.

---

## 4. Datenflüsse – Wohin fließen welche Daten?

### 4.1 Eingehende Daten (Quellen)

| Quelle | Datentyp | Protokoll | Authentifizierung |
|---|---|---|---|
| Kabelmodem (LAN) | DOCSIS-Signaldaten (HTML/XML/JSON) | HTTP/HTTPS | Modell-abhängig (Basic/Digest/Session) |
| FRITZ!Box (LAN) | TR-064 Status, Segment-Utilization | HTTP | PBKDF2/MD5 Challenge-Response |
| Speedtest Tracker (lokal/LAN) | Geschwindigkeitstests | HTTP/HTTPS | Bearer Token |
| Open-Meteo API (extern) | Temperaturdaten | HTTPS | Keine (öffentliche API) |
| ThinkBroadband BQM (extern) | Qualitätsgrafiken (PNG) | HTTPS | Keine |
| Smokeping (lokal/LAN) | Latenz-Daten | HTTP/HTTPS | Keine |
| Benutzer-Uploads | PDF, CSV, Excel, Bilder | HTTP (lokaler Server) | Session-Auth |

### 4.2 Ausgehende Daten (Ziele)

| Ziel | Datentyp | Protokoll | Wann? | Nutzerdaten? |
|---|---|---|---|---|
| **Lokales Web-Dashboard** | Analyseergebnisse, Charts | HTTP (Port 8765) | Immer | Nein |
| **Prometheus** (optional) | DOCSIS-Metriken | HTTP `/api/metrics` | Wenn gescrapt | Nein |
| **GitHub API** (automatisch) | Keine – nur GET | HTTPS | 1x/Stunde | Nein (nur IP sichtbar) |
| **MQTT-Broker** (optional) | DOCSIS-Messwerte, HA-Discovery | MQTT TCP/TLS | Wenn konfiguriert | Nein |
| **Webhook-Endpunkt** (optional) | Alarm-Nachrichten | HTTPS POST | Bei Ereignissen | Ereignisdetails |
| **Open-Meteo** (optional) | Lat/Lon-Koordinaten | HTTPS GET | Wenn konfiguriert | Standort |
| **GitHub Themes** (optional) | Keine – nur GET | HTTPS | Bei Theme-Install | Nein |

### 4.3 Lokale Datenspeicherung

| Datei | Inhalt | Schutz |
|---|---|---|
| `docsis_history.db` | Signaldaten, Events, Journal, API-Tokens, Speedtest, BQM, BNetzA, Wetter | SQLite WAL, Dateiberechtigungen |
| `connection_monitor.db` | ICMP/TCP-Probing-Ergebnisse | SQLite, Dateiberechtigungen |
| `config.json` | Konfiguration inkl. verschlüsselter Secrets | Fernet-Verschlüsselung, chmod 600 |
| `.config_key` | Fernet-Verschlüsselungsschlüssel | chmod 600, auto-generiert |
| `.session_key` | Flask-Session-Signaturschlüssel | chmod 600, auto-generiert |

---

## 5. Datenschutz-Analyse

### 5.1 Keine Telemetrie, kein Tracking

DOCSight sendet **keine Nutzerdaten** an den Entwickler oder Dritte. Dies wurde durch vollständige Codeanalyse verifiziert:
- **Kein Analytics-Code** – kein Google Analytics, Matomo, Plausible oder ähnliches
- **Kein Crash-Reporting** – kein Sentry, Bugsnag oder ähnliches
- **Keine Nutzungsdaten** – kein Feature-Tracking, keine Usage-Metriken
- **Kein Phone-Home** – außer dem GitHub-Versionscheck (nur GET, keine Nutzerdaten)

Suchbegriffe `telemetry`, `analytics`, `sentry`, `tracking`, `pixel`, `beacon` ergaben **null Treffer** im Anwendungscode.

### 5.2 GitHub-Versionscheck (einzige automatische externe Verbindung)

**Datei:** `app/web.py:201-221`

```python
r = _requests.get(
    "https://api.github.com/repos/itsDNNS/docsight/releases/latest",
    headers={"Accept": "application/vnd.github.v3+json"},
    timeout=5,
)
```

- **Gesendet:** HTTP GET mit Standard-User-Agent (Python requests)
- **Empfangen:** Versions-Tag der neuesten Release
- **Häufigkeit:** Max. 1x/Stunde (TTL-Cache 3600s, `web.py:186`)
- **Bedingung:** Nur wenn eigene Version nicht `"dev"` ist (`web.py:193`)
- **Betroffene Daten:** Keine personenbezogenen Daten. GitHub sieht die IP des Servers.
- **Fehlerbehandlung:** Bei Fehler wird der vorherige Cache-Wert beibehalten (`web.py:218`)
- **Risikobewertung:** Gering.

### 5.3 Open-Meteo Wetter-API

**Datei:** `app/modules/weather/client.py`

- **Gesendet:** Breitengrad, Längengrad, Temperaturparameter
- **Empfangen:** Aktuelle/historische Temperaturdaten
- **Bedingung:** Nur wenn Wetter-Modul aktiviert UND Koordinaten konfiguriert
- **Endpunkte:** `https://api.open-meteo.com/v1/forecast`, `https://archive-api.open-meteo.com/v1/archive`
- **Risikobewertung:** Mittel. Standortdaten fließen an externen Dienst, aber nur auf explizite Nutzeranfrage. Open-Meteo ist ein DSGVO-konformer europäischer Dienst ohne Registrierungspflicht.

### 5.4 Schutz von Zugangsdaten

Modem-Zugangsdaten werden:
- ✅ Nur zum lokalen Modem gesendet (LAN-IP)
- ✅ Verschlüsselt in `config.json` gespeichert (Fernet AES-128-CBC + HMAC-SHA256)
- ✅ Nie an externe Dienste übermittelt
- ✅ Im Webinterface nur als `••••••••` angezeigt (`config.py:22, 406-409`)
- ✅ Bei Modul-Zugriff gefiltert (`SECRET_KEYS` in `config.py:17`)

---

## 6. Sicherheitsanalyse

### 6.1 Authentifizierung und Zugriffskontrolle

#### Admin-Passwort
- **Hashing:** Werkzeug `scrypt` oder `pbkdf2` (`config.py:280-281`)
- **Auto-Upgrade:** Klartext-Passwörter werden beim ersten Login gehasht (`web.py:568-571`)
- **Rate Limiting:** 5 Versuche/15 Min., exponentielles Backoff 30s→60s→120s→...→7680s (`web.py:123-153`)
- **Audit-Logging:** Alle Login-Versuche mit IP protokolliert (`web.py:559, 576-579`)

#### API-Tokens
- **Format:** `dsk_` + 48 Bytes kryptografisch zufällige Daten
- **Speicherung:** Nur Werkzeug-Hash in Datenbank, Klartext einmalig angezeigt
- **Privilegientrennung:** Tokens nur für Lese-Endpunkte; sensible Verwaltung erfordert Session-Login (`_require_session_auth`, `web.py:530-544`)
- **Tracking:** `last_used_at` Zeitstempel bei jeder Nutzung
- **Revokation:** Sofortwiderruf möglich

#### Sessions
- Flask Signed Cookies mit persistiertem `os.urandom(32)` (`web.py:468-483`)
- `HttpOnly=True`, `SameSite=Strict`, Lebensdauer 24h (`web.py:230-234`)
- `Secure`-Flag bei Reverse-Proxy-Konfiguration

### 6.2 Verschlüsselung

#### Ruhende Daten (At Rest)
| Feld | Methode | Datei |
|---|---|---|
| `modem_password` | Fernet (AES-128-CBC + HMAC-SHA256) | `config.py:284-286` |
| `mqtt_password` | Fernet | `config.py:284-286` |
| `speedtest_tracker_token` | Fernet | `config.py:284-286` |
| `notify_webhook_token` | Fernet | `config.py:284-286` |
| `admin_password` | Werkzeug Hash (scrypt/pbkdf2) | `config.py:278-281` |

**Schlüsselverwaltung:**
- Fernet-Schlüssel: `.config_key`, chmod 600, auto-generiert (`config.py:129-144`)
- Session-Schlüssel: `.session_key`, chmod 600, auto-generiert (`web.py:468-483`)
- Config-Datei: `config.json`, chmod 600 (`config.py:313-316`)

#### Übertragene Daten (In Transit)
- Modem-Kommunikation: HTTP/HTTPS je nach Modem (LAN)
- MQTT: TLS automatisch auf Port 8883; optionale Zertifikatsprüfung (`MQTT_TLS_INSECURE`)
- Webhooks: HTTPS empfohlen, Bearer Token optional
- Web-Dashboard: HSTS-Header, Reverse-Proxy für HTTPS empfohlen

### 6.3 Sicherheits-Header

Alle HTTP-Antworten (`web.py:851-866`):

| Header | Wert |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self'` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |

### 6.4 Eingabevalidierung

| Bereich | Schutzmaßnahme | Datei |
|---|---|---|
| URL-Konfiguration | Nur `http://`/`https://`-Schemata | `config.py:246-255` |
| Theme-Downloads | SSRF-Whitelist: nur GitHub-Domains | `theme_registry.py:15-27` |
| Datei-Uploads | MIME-Typ-Whitelist, 10 MB Limit, `secure_filename()` | `journal/routes.py:247-272` |
| BNetzA PDF-Upload | Magic-Header-Validierung | `bnetz/routes.py:67` |
| Datumsfelder | Regex + `strptime()` Doppelprüfung | `web.py:239-247` |
| HTML-Ausgabe | Jinja2-Filter: nur `<b>`,`<a>`,`<strong>`,`<em>`,`<br>` | `web.py:248-256` |
| Backup-Archive | Pfad-Traversal: `../` + `realpath()` Prüfung | `backup.py:167-170, 227-229` |
| Backup-Dateien | Magic-Header `"docsight-backup"` + Datei-Whitelist | `backup.py:28, 222-223` |
| Verzeichnisbrowser | Root-Pfad-Whitelist (`/backup`, `/data`) + `realpath()` | `backup.py:297-354` |

### 6.5 Docker-Sicherheit

- **Non-Root-User:** `appuser` (UID 1000), `gosu` in Entrypoint
- **Multi-Stage Build:** Minimales Runtime-Image, keine Build-Tools
- **Health Check:** HTTP GET `/health` alle 60s
- **Bridge-Networking:** Kein Host-Netzwerk
- **Volume:** Persistente Daten in `/data`
- **Capability:** `NET_RAW` nur für ICMP-Probing
- **SUID-Binary:** `docsight-icmp-helper` (chmod 4755) – kleines C-Programm, Quellcode einsehbar

### 6.6 SQL-Injection-Schutz

- Parametrisierte Queries werden durchgehend verwendet
- Dynamische Tabellennamen in `backup.py:53,82` sind fest codierte Konstanten (keine Benutzereingabe), mit Bracket-Notation `[table]`

### 6.7 Plugin-System (Module)

- Manifest-Validierung: Pflichtfelder, ID-Format (`^[a-z][a-z0-9_.]+$`), Typ-Whitelist (`module_loader.py:56-78`)
- Secret-Key-Isolation: Module sehen keine Passwörter/Tokens (`config.py:17` – `SECRET_KEYS` gefiltert)
- Theme-Downloads: URL-Whitelist auf GitHub, Pflichtdateien `manifest.json` + `theme.json`
- Bei fehlenden Pflichtdateien: heruntergeladenes Verzeichnis wird gelöscht (`theme_registry.py:107-109`)

---

## 7. Suche nach schadhaftem Code

### 7.1 Geprüfte Risikoindikatoren

| Indikator | Gefunden? | Details |
|---|---|---|
| `eval()` / `exec()` | **Nein** | Keine dynamische Code-Ausführung |
| `__import__()` (unsicher) | **Nein** | Module über `importlib` mit Manifest-Validierung |
| `pickle.loads()` / `marshal` | **Nein** | Keine unsichere Deserialisierung |
| `subprocess` mit `shell=True` | **Nein** | Nur `subprocess.check_output(["git", "describe", ...])` ohne Shell |
| `os.system()` | **Nein** | Nicht verwendet |
| Base64-kodierte Payloads | **Nein** | Keine versteckten Daten |
| Obfuskierter Code | **Nein** | Gesamter Code lesbar und kommentiert |
| Telemetrie/Tracking | **Nein** | Keine Analytics, kein Fingerprinting |
| Versteckte Netzwerkzugriffe | **Nein** | Alle Netzwerkzugriffe dokumentiert |
| Backdoors/versteckte Endpoints | **Nein** | Alle Routen in Blueprints, durch `require_auth` geschützt |
| Crypto-Mining | **Nein** | Keine CPU-intensiven Berechnungen ohne Zweck |
| Datenexfiltration | **Nein** | Keine unbefugte Datenübertragung |
| Hardcodierte Credentials | **Nein** | Alle Zugangsdaten konfigurierbar |

### 7.2 Bewertung

**Kein schadhafter oder bösartiger Code gefunden.** Der Quellcode ist sauber, gut strukturiert und folgt gängigen Python-Best-Practices.

---

## 8. Modem-Treiber – Sicherheitsrelevante Details

DOCSight unterstützt 17 Modem-Treiber. Alle kommunizieren ausschließlich mit dem lokalen Modem im LAN:

| Treiber | Datei | Auth-Methode | SSL |
|---|---|---|---|
| AVM FRITZ!Box | `fritzbox.py` | PBKDF2/MD5 Challenge-Response | Optional |
| Technicolor TC4400 | `drivers/tc4400.py` | HTTP Basic/Digest | Nein |
| Vodafone Ultra Hub 7 | `drivers/ultrahub7.py` | HTTP Session | Ja (self-signed) |
| Vodafone Station | `drivers/vodafone_station.py` | HTTP Session | Ja |
| Compal CH7465 | `drivers/ch7465.py` | XML-RPC Session | Nein |
| Compal CH7465 Play | `drivers/ch7465_play.py` | HTTP Session | Nein |
| Netgear CM3000 | `drivers/cm3000.py` | HTTP Basic | Nein |
| Arris CM3500B | `drivers/cm3500.py` | HTTP POST Login | Ja (self-signed) |
| Arris SURFboard | `drivers/surfboard.py` | HTTP Session/Token | Variiert |
| Arris SB6141 | `drivers/sb6141.py` | Keine (offene Statusseite) | Nein |
| Arris SB6190 | `drivers/sb6190.py` | HTTP Basic | Nein |
| Arris CM8200A | `drivers/cm8200a.py` | HTTP Session | Nein |
| Hitron CODA-56 | `drivers/hitron.py` | HTTP Login | Nein |
| Sagemcom F@st 3896 | `drivers/sagemcom.py` | SHA-512 Digest | Ja |
| Generischer Router | `drivers/generic_router.py` | Keine DOCSIS-Daten | – |

Alle Treiber verwenden `requests`-Sessions mit Timeouts (10–30s). Kein Treiber leitet Modem-Daten an externe Dienste weiter.

---

## 9. Potenzielle Sicherheitsrisiken

### 9.1 Geringe Risiken

| Risiko | Beschreibung | Mitigation |
|---|---|---|
| **In-Memory Rate Limits** | Login-Zähler gehen bei Neustart verloren | Akzeptabel für Heim-Anwendung |
| **Modem-Credentials im Speicher** | Während Polling-Zyklen entschlüsselt | Unvermeidbar bei regelmäßigem Polling |
| **CSP mit `unsafe-inline`** | `script-src` und `style-src` erlauben Inline-Code | Erforderlich für Jinja2-Templates; XSS durch Auth und Sanitierung mitigiert |
| **Plaintext-Login-Upgrade** | Einmaliger Klartext-Vergleich bei Migration | Nur beim allerersten Login nach Upgrade; danach Hash |
| **MQTT TLS optional** | TLS-Verifizierung kann deaktiviert werden | Nur für selbstsignierte Zertifikate in LANs |
| **GitHub Update-Check** | IP gegenüber GitHub sichtbar | Kein Opt-out, aber keine Nutzerdaten |

### 9.2 Mittlere Risiken

| Risiko | Beschreibung | Empfehlung |
|---|---|---|
| **SUID-Binary** | `icmp_probe_helper` läuft mit erhöhten Rechten (chmod 4755) | Quellcode prüfen (`tools/icmp_probe_helper.c`); Connection Monitor deaktivieren wenn nicht benötigt |
| **Modem HTTP im LAN** | Viele Modems nur über unverschlüsseltes HTTP | Netzwerksegmentierung; akzeptabel im Heimnetz |
| **Standard `0.0.0.0:8765`** | Dashboard ohne HTTPS auf allen Interfaces | Reverse Proxy mit HTTPS oder `127.0.0.1:8765` binden |
| **Community-Theme-Downloads** | Herunterladen und Installieren von Fremdcode | URL-Whitelist auf GitHub; Manifest-Validierung; dennoch theoretisches Risiko durch CSS-basierte Angriffe |
| **CDN-Abhängigkeiten** | Frontend lädt JS/CSS/Fonts von externen CDNs | Browser-IP bei Google/CDN sichtbar; lokal bündeln für maximalen Datenschutz |

### 9.3 Keine kritischen Risiken identifiziert

Es wurden **keine** der folgenden Probleme gefunden:
- ❌ Keine hartcodierten Zugangsdaten
- ❌ Keine Command Injection (`os.system()`, `shell=True`)
- ❌ Kein `eval()`, `exec()`, `pickle.loads()` mit Benutzereingaben
- ❌ Kein unsicheres Deserialisieren
- ❌ Keine offenen Debug-Endpunkte
- ❌ Kein Directory Traversal (alle Pfade validiert)
- ❌ Kein SSRF (URL-Whitelist für externe Downloads)
- ❌ Keine versteckten Backdoors oder verdächtiger Code
- ❌ Keine SQL-Injection (parametrisierte Queries)

---

## 10. Externe Netzwerkkommunikation – Vollständige Liste

### 10.1 Automatische Verbindungen (ohne Konfiguration)

| Ziel | URL | Zweck | Gesendete Daten |
|---|---|---|---|
| GitHub API | `https://api.github.com/repos/itsDNNS/docsight/releases/latest` | Versionscheck (1x/h) | Keine Nutzerdaten (nur HTTP GET) |

### 10.2 Optionale Verbindungen (nur wenn explizit konfiguriert)

| Ziel | Zweck | Konfigurationsschlüssel | Gesendete Daten |
|---|---|---|---|
| Kabelmodem (LAN) | DOCSIS-Daten lesen | `modem_url`, `modem_user`, `modem_password` | Login-Credentials |
| FRITZ!Box (LAN) | Segment-Utilization | `modem_url` (Typ `fritzbox`) | Session-Token |
| MQTT-Broker | HA-Integration | `mqtt_host`, `mqtt_port`, `mqtt_user`, `mqtt_password` | DOCSIS-Messwerte |
| Speedtest Tracker | Geschwindigkeitstests | `speedtest_tracker_url`, `speedtest_tracker_token` | Bearer Token |
| Open-Meteo | Temperaturdaten | `weather_latitude`, `weather_longitude` | Standortkoordinaten |
| ThinkBroadband | BQM-Grafiken | `bqm_url` | Keine (nur Download) |
| Smokeping | Latenz-Daten | `smokeping_url` | Keine (nur Download) |
| Webhook-Endpunkt | Benachrichtigungen | `notify_webhook_url`, `notify_webhook_token` | Ereignisdetails |
| GitHub (Themes) | Theme-Download | `theme_registry_url` | Keine (nur Download) |

### 10.3 Browser-seitige Verbindungen (CDN)

| Ziel | Zweck |
|---|---|
| `https://unpkg.com` | JavaScript-Bibliotheken |
| `https://cdn.jsdelivr.net` | JavaScript-Bibliotheken |
| `https://fonts.googleapis.com` | Google Fonts CSS |
| `https://fonts.gstatic.com` | Google Font-Dateien |

---

## 11. DSGVO-Konformität

### 11.1 Erhobene personenbezogene Daten
- **IP-Adressen:** Nur für Login-Rate-Limiting im Speicher (nicht persistent, geht bei Neustart verloren)
- **Standortdaten:** Nur wenn Wetter-Modul konfiguriert (Breitengrad/Längengrad)
- **Modem-Credentials:** Verschlüsselt gespeichert, nie an Dritte weitergeleitet
- **Admin-Passwort:** Gehasht gespeichert
- **Journal-Einträge:** Benutzererstellte Notizen und Anhänge (rein lokal)
- **Audit-Logs:** Login-IPs werden geloggt (optional JSON-Format)

### 11.2 Datenweitergabe an Dritte
- **Standardmäßig:** Nur GitHub-API (öffentlicher GET-Request, keine personenbezogenen Daten)
- **Optional, server-seitig:** Open-Meteo (Koordinaten), MQTT-Broker, Webhooks, Speedtest Tracker, Smokeping, BQM
- **Browser-seitig:** Google Fonts, CDN-Bibliotheken (Browser-IP sichtbar)

### 11.3 Empfehlungen für DSGVO-Konformität
1. **Google Fonts und CDN-Bibliotheken lokal hosten** – eliminiert Browser-Verbindungen zu Google und CDN-Anbietern
2. **Open-Meteo mit ungenauen Koordinaten nutzen** – Stadtebene statt genauer Position
3. **Reverse Proxy mit HTTPS** – schützt die Weboberfläche
4. **Audit-Logging aktivieren** (`DOCSIGHT_AUDIT_JSON=1`) – für Nachweispflicht

---

## 12. Zusammenfassung und Gesamtbewertung

### Stärken
- ✅ **Kein Tracking, keine Telemetrie** – vollständig lokal betriebenes Tool
- ✅ **Verschlüsselung sensibler Daten** – Fernet für Secrets, Werkzeug-Hash für Passwörter
- ✅ **Robuste Authentifizierung** – Rate Limiting, API-Tokens mit Hash-only-Speicherung, Session-Sicherheit
- ✅ **Vollständige Security Headers** – HSTS, CSP, X-Frame-Options, X-Content-Type-Options
- ✅ **SSRF-Schutz** – URL-Whitelist für Theme-Downloads auf GitHub-Domains
- ✅ **Path-Traversal-Schutz** – doppelte Validierung bei Backup/Restore und Dateioperationen
- ✅ **Eingabevalidierung** – URL-Schema, MIME-Typ-Whitelist, Dateigrößenlimits, Magic-Header
- ✅ **Audit-Logging** – strukturiertes Logging sicherheitsrelevanter Ereignisse (optional JSON)
- ✅ **Docker-Isolation** – Non-Root-User, Multi-Stage Build, Bridge-Networking
- ✅ **Sauberer Code** – keine `eval`, `exec`, `pickle`, `shell=True`, keine Backdoors
- ✅ **Privilegientrennung** – API-Tokens vs. Session-Auth für unterschiedliche Berechtigungsstufen
- ✅ **Plugin-Isolation** – Module sehen keine Secrets, Manifest-Validierung

### Schwächen (gering)
- ⚠️ In-Memory Rate Limits (nicht persistent über Neustarts)
- ⚠️ CSP mit `unsafe-inline` (erforderlich für Jinja2-Templates)
- ⚠️ SUID-Binary für ICMP-Probing (eingeschränkter Angriffsvektor)
- ⚠️ CDN-Abhängigkeiten im Frontend (Datenschutz)
- ⚠️ GitHub-Versionscheck ohne Opt-out-Option

### Gesamturteil

| Kategorie | Bewertung |
|---|---|
| **Datenschutz** | Sehr gut – lokal, keine Telemetrie, keine Analytics |
| **Sicherheit** | Gut – umfassende Auth, Verschlüsselung, Security Headers, Eingabevalidierung |
| **Code-Qualität** | Gut – sauber, strukturiert, konsistent |
| **Bösartiger Code** | Nicht vorhanden |
| **Abhängigkeiten** | Unbedenklich – nur etablierte Open-Source-Bibliotheken |
| **Datenabfluss** | Minimal – nur GitHub-Versionscheck automatisch, alle anderen optional |

**DOCSight ist ein sicherheitsbewusst entwickeltes, datenschutzfreundliches lokales Monitoring-Tool.** Es wurden keine kritischen Sicherheitslücken, keine Backdoors und kein bösartiger Code identifiziert. Die einzige automatische externe Verbindung überträgt keine personenbezogenen Daten. Das Tool kann bedenkenlos eingesetzt werden.
