# Threat model

## Scope and assumptions

The user intentionally opens a local export in a modern browser on a device they control. The MVP protects against application-origin data collection, accidental retention, unsafe archive handling, and misleading outputs. It does not protect a compromised device, a malicious browser extension, or a user serving the application from an untrusted origin.

| Threat | Control in MVP | Residual risk / owner |
|---|---|---|
| Archive exfiltration to operator | No request path or third-party script; CSP blocks connections | User must use an authentic local build; release signing/hosting owner for public release |
| ZIP bomb/path traversal | Caps archive/directory size, entry count, conversation files, compression ratio, uncompressed size, and processing time; rejects unsafe paths; no filesystem extraction | Add archive fuzzing before public beta |
| Sensitive text in telemetry/logs | No telemetry, crash reporter, parsing server, or cloud-analysis path | Browser/devtools and OS-level tools are outside app control |
| Third-party information inside export | Local-only processing; display redacts common direct identifiers | Text can contain unrecognized identifiers; user must review evidence before sharing |
| XSS from conversation text | Message title, context, and evidence text are HTML-escaped before insertion; restrictive CSP blocks inline scripts and connections | Add hostile-payload browser tests and prefer DOM textContent rendering before a real-user beta |
| Misleading cognitive claims | UI and docs clearly label observations/inferences; sample thresholds and strength labels suppress weak trend claims | Taxonomy validity/usability requires expert and user research |
| Unauthorized cross-user access | No accounts, database, or shared backend | Reassess fully if persistence/collaboration is added |

## Security test approach

Unit tests cover role isolation, timestamp/context preservation, classification, redaction, and aggregation. Manual verification covers the no-network architecture, delete action, malformed ZIP error handling, and static-server security headers. Public release requires dependency/SCA scanning, browser security testing, archive fuzzing, CSP/XSS verification, and an independent review.
