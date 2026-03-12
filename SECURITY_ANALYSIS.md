# DOCSight – Vollständige Sicherheits- und Datenschutzanalyse

**Analysedatum:** 2026-03-12
**Analysierte Version:** Aktueller `main`-Branch
**Analyst:** Automatisierte Code-Analyse (Claude)

---

## 1. Was ist DOCSight?

DOCSight ist eine **selbst-gehostete** Docker-Anwendung zur Überwachung von DOCSIS-Kabelinternetverbindungen. Das Tool:

- Liest Signaldaten (Leistungspegel, SNR, Fehlerraten) von Kabelmodems aus
- Analysiert die Signalqualität nach DOCSIS-Spezifikationen
- Speichert historische Daten in einer lokalen SQLite-Datenbank
- Stellt ein Web-Dashboard zur Visualisierung bereit
- Kann Beschwerdebrief-PDFs mit Beweismaterial generieren
- Unterstützt optionale Integrationen (MQTT, Speedtest, Wetter, etc.)

**Technologie-Stack:** Python 3, Flask, Waitress (WSGI), SQLite, Docker

---

## 2. Abhängigkeiten

### Python-Pakete (`requirements.txt`)

| Paket | Version | Zweck | Risikobewertung |
|-------|---------|-------|-----------------|
| `requests>=2.32` | HTTP-Client | Kommunikation mit Modem, APIs | Niedriges Risiko – Standardbibliothek |
| `paho-mqtt>=2.1` | MQTT-Client | Optional: Home Assistant Integration | Niedriges Risiko |
| `flask>=3.1` | Web-Framework | Web-UI und REST-API | Niedriges Risiko |
| `waitress>=3.0.2` | WSGI-Server | Produktions-Webserver | Niedriges Risiko |
| `cryptography>=46.0` | Verschlüsselung | Fernet-Verschlüsselung für Passwörter | Niedriges Risiko |
| `pycryptodome>=3.23` | Krypto-Bibliothek | Zusätzliche Verschlüsselungsfunktionen | Niedriges Risiko |
| `fpdf2>=2.8.4` | PDF-Erzeugung | Beschwerdebrief-Generierung | Niedriges Risiko |
| `beautifulsoup4>=4.14` | HTML-Parser | Modem-Webseiten parsen | Niedriges Risiko |
| `pypdf>=6.0` | PDF-Verarbeitung | BNetzA-Messprotokoll-Import | Niedriges Risiko |
| `openpyxl>=3.1.5` | Excel-Verarbeitung | Datenexport | Niedriges Risiko |

**Bewertung:** Alle Abhängigkeiten sind etablierte, weit verbreitete Open-Source-Bibliotheken. Keine exotischen oder unbekannten Pakete.

### Externe JavaScript-Bibliotheken (CDN)

Laut Content-Security-Policy-Header werden JS-Bibliotheken von `unpkg.com` und `cdn.jsdelivr.net` geladen. Dies ist gängige Praxis, bedeutet aber:
- **Risiko:** Bei Kompromittierung dieser CDNs könnte schadhaftes JavaScript eingeschleust werden
- **Mitigation:** CSP beschränkt die erlaubten Quellen auf genau diese zwei CDNs

---

## 3. Datenflüsse – Wohin fließen welche Daten?

### 3.1 Lokale Datenflüsse (verbleiben im Netzwerk)

| Quelle | Ziel | Daten | Protokoll |
|--------|------|-------|-----------|
| DOCSight → Kabelmodem | Lokales LAN | Login-Credentials, HTTP-Requests | HTTP/HTTPS |
| DOCSight → SQLite-DB | Lokales Dateisystem | Signaldaten, Konfiguration | Datei-I/O |
| Browser → DOCSight | Lokales LAN | Session-Cookies, Einstellungen | HTTP |

### 3.2 Ausgehende Netzwerkverbindungen (Internet)

| Ziel | Zweck | Gesendete Daten | Aktivierung | Datei |
|------|-------|-----------------|-------------|-------|
| `api.github.com` | Versions-Check | Kein Nutzerdaten – nur GET-Request auf `/repos/itsDNNS/docsight/releases/latest` | **Automatisch** (1x/Stunde, nur bei Nicht-Dev-Version) | `app/web.py:124-144` |
| `raw.githubusercontent.com` | Theme-Registry | Kein Nutzerdaten – nur GET auf Registry-JSON | **Nur bei Benutzerinteraktion** (Theme-Browse) | `app/theme_registry.py:36-45` |
| `api.open-meteo.com` | Wetterdaten | **Breitengrad & Längengrad** des Benutzers | **Nur wenn konfiguriert** | `app/modules/weather/client.py` |
| Benutzer-konfigurierter Webhook | Benachrichtigungen | Ereignis-Typ, Schweregrad, Nachricht, Zeitstempel | **Nur wenn konfiguriert** | `app/notifier.py:34-41` |
| Benutzer-konfigurierter MQTT-Broker | Home Assistant | Kanaldaten, Signalwerte, Geräteinformationen | **Nur wenn konfiguriert** | `app/modules/mqtt/publisher.py` |
| Benutzer-konfigurierte Speedtest-URL | Speedtest-Daten | API-Token (Bearer Auth) | **Nur wenn konfiguriert** | `app/modules/speedtest/client.py` |
| ThinkBroadband (BQM) | Qualitätsgraph | Keine – nur Bild-Download | **Nur wenn konfiguriert** | `app/thinkbroadband.py` |
| Benutzer-konfigurierter Smokeping-Server | Latenz-Graphen | Keine Nutzerdaten | **Nur wenn konfiguriert** | `app/modules/smokeping/` |

### 3.3 Kritische Datenschutzbewertung

**Automatische Verbindungen ohne explizite Konfiguration:**
- **GitHub Update-Check** (`web.py:124-144`): Wird automatisch im Hintergrund ausgeführt. Sendet nur einen Standard-GET-Request, aber GitHub erfährt dadurch die IP-Adresse der DOCSight-Instanz und kann theoretisch Nutzungsstatistiken ableiten. **Keine Opt-out-Möglichkeit erkennbar** (außer Dev-Version zu verwenden).

**Konfigurierbare Verbindungen:**
- **Open-Meteo Wetter-API**: Sendet Breitengrad/Längengrad – damit den ungefähren Standort des Benutzers. Open-Meteo ist ein freier Dienst ohne API-Key, aber die Standortdaten fließen an einen externen Server.
- **Webhook-Benachrichtigungen**: Die Nachrichteninhalte (Signalprobleme, Schweregrad) werden an die konfigurierte URL gesendet. Bei Nutzung von Diensten wie ntfy.sh oder Discord fließen diese Daten an deren Server.

---

## 4. Sicherheitsmechanismen

### 4.1 Authentifizierung

- **Admin-Passwort**: Gehasht mit Werkzeug (`scrypt` oder `pbkdf2`) – `config.py:280-281`
- **Session-Verwaltung**: Flask Signed Cookies, `HttpOnly`, `SameSite=Strict`, 24h Laufzeit – `web.py:153-157`
- **Rate-Limiting**: 5 Fehlversuche/15 Min., exponentieller Backoff (30s–7680s) – `web.py:47-76`
- **API-Tokens**: Kryptographisch zufällig (`secrets.token_urlsafe(48)`), nur Hash gespeichert, `dsk_`-Präfix
- **Privilegientrennung**: Sensitive Endpoints (Token-Verwaltung, Einstellungen) erfordern Session-Auth, API-Tokens reichen nicht

### 4.2 Verschlüsselung

- **Passwörter at rest**: Fernet (AES-128-CBC + HMAC-SHA256) – `config.py:129-144`
- **Schlüsselverwaltung**: Auto-generierter Key in `data/.config_key`, Dateiberechtigung `600` – `config.py:138-142`
- **Session-Schlüssel**: Persistent in `data/.session_key`, Berechtigung `600` – `web.py:391-406`

### 4.3 Security Headers

Vollständige Implementierung in `web.py:772-787`:
- HSTS, CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- CSP schränkt Script-Quellen auf `self`, unpkg.com und cdn.jsdelivr.net ein

### 4.4 Input-Validierung

- **URL-Validierung**: Nur `http`/`https`-Schemes erlaubt für alle URL-Konfigurationsschlüssel – `config.py:245-255`
- **SSRF-Schutz**: Theme-Downloads nur von GitHub-Domains erlaubt – `theme_registry.py:15-27`
- **HTML-Sanitierung**: Nur `<b>`, `<a>`, `<strong>`, `<em>`, `<br>` erlaubt – `web.py:171-179`
- **Datumsvalidierung**: Regex + `strptime`-Validierung – `web.py:162-170`

### 4.5 Audit-Logging

- Login-Versuche (Erfolg/Misserfolg) mit IP
- Konfigurationsänderungen (geänderte Schlüssel)
- Token-Erstellung/-Widerruf
- Optional: JSON-strukturierte Ausgabe (`DOCSIGHT_AUDIT_JSON=1`)

---

## 5. Suche nach schadhaftem/bösartigem Code

### 5.1 Geprüfte Risikoindikatoren

| Indikator | Gefunden? | Details |
|-----------|-----------|---------|
| `eval()` / `exec()` | **Nein** | Kein dynamischer Code-Ausführung |
| `__import__()` (unsicher) | **Nein** | Module werden über `importlib` mit Manifest-Validierung geladen |
| Base64-kodierte Payloads | **Nein** | Keine versteckten Daten |
| Obfuskierter Code | **Nein** | Gesamter Code ist lesbar und kommentiert |
| Pickle/Marshal-Deserialisierung | **Nein** | Keine unsichere Deserialisierung |
| Subprocess mit Shell=True | **Nein** | `subprocess.check_output` nur für `git describe` ohne Shell – `web.py:98-101` |
| Telemetrie/Tracking-Beacons | **Nein** | Keine Analytics, kein Fingerprinting |
| Versteckte Netzwerkzugriffe | **Nein** | Alle Netzwerkzugriffe sind in dokumentierten Modulen |
| Backdoors/versteckte Endpoints | **Nein** | Alle Routen sind in Blueprints organisiert und durch `require_auth` geschützt |
| Crypto-Mining-Code | **Nein** | Keine CPU-intensiven Berechnungen ohne Zweck |
| Datenexfiltration | **Nein** | Keine unbefugte Datenübertragung |

### 5.2 Bewertung

**Kein schadhafter oder bösartiger Code gefunden.** Der Quellcode ist sauber, gut strukturiert, konsistent kommentiert und folgt gängigen Python-Best-Practices.

---

## 6. Potenzielle Schwachstellen (keine Sicherheitslücken, aber Verbesserungspotenzial)

### 6.1 Niedriges Risiko

1. **GitHub Update-Check ohne Opt-out** (`web.py:111-148`): Der automatische Versions-Check offenbart die IP-Adresse gegenüber GitHub. Eine Konfigurationsoption zum Deaktivieren wäre datenschutzfreundlicher.

2. **CSP erlaubt `'unsafe-inline'` für Scripts** (`web.py:781`): Dies schwächt den XSS-Schutz. Besser wäre die Verwendung von Nonces oder Hashes.

3. **In-Memory Rate-Limiting** (`web.py:47-49`): Geht bei Neustart verloren. Für die meisten Self-Hosted-Szenarien akzeptabel, aber im Dokument als "Known Limitation" aufgeführt.

4. **Plaintext-Passwort-Migration** (`web.py:488-494`): Alte Klartext-Passwörter werden beim Login automatisch zu Hashes migriert – gute Praxis, aber das Fenster der Verwundbarkeit existiert bis zum ersten Login nach Upgrade.

### 6.2 Informativ

5. **`waitress` bindet auf `0.0.0.0`** (`main.py:46`): Standard für Docker, aber ohne Reverse-Proxy ist der Dienst im gesamten Netzwerk erreichbar.

6. **Theme-Downloads von GitHub** (`theme_registry.py`): Obwohl SSRF-geschützt, könnten kompromittierte Theme-Dateien CSS-basierte Angriffe enthalten (Data-Exfiltration via CSS). Das Risiko ist durch die CSP-`connect-src 'self'`-Regel aber stark begrenzt.

---

## 7. Zusammenfassung

### Gesamtbewertung: POSITIV

| Kategorie | Bewertung |
|-----------|-----------|
| **Datenschutz** | Sehr gut – 100% lokal, keine Telemetrie, keine Analytics |
| **Sicherheit** | Gut – umfassende Auth, Verschlüsselung, Security Headers |
| **Code-Qualität** | Gut – sauber, lesbar, konsistent dokumentiert |
| **Bösartiger Code** | Nicht vorhanden |
| **Abhängigkeiten** | Unbedenklich – nur etablierte Open-Source-Bibliotheken |
| **Datenabfluss** | Minimal – nur GitHub-Update-Check automatisch, alle anderen Verbindungen optional und benutzer-konfiguriert |

### Datenschutz-Fazit

DOCSight ist ein **datenschutzfreundliches Tool**, das grundsätzlich lokal arbeitet. Die einzige automatische externe Verbindung ist der GitHub-Versions-Check (1x/Stunde), der keine Benutzerdaten übermittelt. Alle anderen externen Verbindungen sind optional und werden ausschließlich durch explizite Benutzerkonfiguration aktiviert.

**Empfehlung:** Das Tool kann bedenkenlos eingesetzt werden. Für maximalen Datenschutz sollte der Wetterdienst (übermittelt Standortdaten) bewusst konfiguriert und ein Opt-out für den GitHub-Update-Check in Betracht gezogen werden.
