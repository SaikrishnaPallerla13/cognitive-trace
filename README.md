# Cognitive Trace MVP

A browser-only, local-first MVP that turns a ChatGPT data-export ZIP into an auditable timeline of explicit reasoning-language patterns. It is deliberately **not** a psychological assessment, diagnosis, IQ/intelligence test, or suitability tool for employment, admissions, insurance, credit, or other high-impact decisions.

## Run

Use Node 20+:

```powershell
npm test
npm start
```

Open `http://localhost:4173`, select an export ZIP, or choose the synthetic demo. The static server has no API endpoints; the browser reads the ZIP, parses `conversations*.json`, redacts common direct identifiers for displayed excerpts, classifies messages using visible deterministic cues, and keeps the results only in page memory. Refreshing or **Delete analysis** clears them.

Do not double-click `index.html` from the ZIP: start the included local server first. The page uses browser modules and must be opened at `http://localhost:4173`.

## What it does

1. Locally reads only the ZIP directory and `conversations*.json` entries; it does not load unrelated export assets into memory. It rejects unsupported compression and oversized conversation data.
2. Isolates `author.role === "user"` messages, preserving timestamp, conversation ID/title, and nearest preceding user turn.
3. Uses a small, auditable taxonomy: information/mechanism seeking, clarification, constraints, comparison, causal/counterfactual/counterargument, decomposition, optimization, second-order effects, synthesis, self-modeling, meta-reasoning, and decision closure.
4. Aggregates label counts/rates by month, shows a selected-move timeline, distribution, cautious first-versus-later-half wording-pattern changes, and evidence excerpts.

## Safety and analysis controls

- Archive parsing is local-only and caps archive size, central-directory size, entry count, conversation-file count, per-entry and total uncompressed bytes, compression ratio, and processing time. It rejects unsafe paths and malformed JSON.
- Each normalized record has a schema version, redacted display text, confidence level, and the explicit matched cues behind each label.
- Very short follow-ups such as `Why?` can use the prior user turn as a deterministic context signal; the prior text remains visible for audit.
- Trend summaries require at least four months and at least 20 user messages in both comparison periods. They are labeled as a moderate finding or early signal, never as a trait change.
- Evidence samples are drawn across early, middle, and recent portions of the export and avoid duplicate conversations where possible. The dashboard exposes a local “Why this was classified” explanation for every cited turn.

## Explicit MVP limitations

- The rules only detect stated cues; an unlabeled message is not evidence that a person did not reason in that way.
- Heuristic confidence is not a calibrated probability. A later classifier must be validated against a labeled, consented, synthetic or redacted evaluation set.
- Redaction is a display/minimization guardrail, not a guarantee of complete anonymization. No text leaves the device in this MVP.
- This is not a production security review or legal advice. See `docs/COMPLIANCE_REPORT.md` before any beta or public launch.

## Data policy enforced by this implementation

- The core local path has no account, remote service, telemetry, cookies, localStorage, IndexedDB, persistence, training, sale, advertising profile, or third-party model call.
- Raw ZIP bytes and raw messages are loaded only in browser memory and are not sent by this app.
- Displayed evidence receives basic email/phone/address redaction before rendering. Deletion clears application references and refresh clears browser memory.
- Synthetic data only is included for the demo. Do not commit real exports, screenshots, or real message excerpts.

See [privacy architecture](docs/PRIVACY_ARCHITECTURE.md), [threat model](docs/THREAT_MODEL.md), and the [pre-launch compliance report](docs/COMPLIANCE_REPORT.md).
