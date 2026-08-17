# Privacy architecture and data map

## Boundary

This MVP is a static, fully local application. The local development server returns application files only; it exposes no upload endpoint, database, analytics endpoint, authentication system, or external model provider. Its Content Security Policy blocks outbound connections.

```text
User-selected ChatGPT ZIP
  -> Browser File API (volatile memory)
  -> ZIP parser (only conversations*.json)
  -> user-message/context extractor
  -> in-memory redaction + deterministic labels + monthly aggregates
  -> browser UI evidence/timeline
  -> Delete / page refresh: references cleared
```

There is no cloud-analysis path and no outbound transfer of conversation data.

## Data map

| Data | Purpose | Location | Retention | Outbound transfer |
|---|---|---|---|---|
| ZIP bytes | Parse local export | Browser RAM | Current page only | Never |
| User message, prior user-turn context, timestamp, title | Context-aware audit and aggregates | Browser RAM | Current page only | Never |
| Redacted evidence excerpt | Explain a classification | Browser DOM/RAM | Current page only | Never |
| Counts/rates/inferences | Timeline/profile | Browser RAM/DOM | Current page only | Never |
| Synthetic demo | Demonstration | Static source file | Shipped with app | Served locally only |

## Product controls

- An explicit delete action clears the application's in-memory records and resets the file control.
- No raw message text is intentionally emitted to application logs, analytics, crash reporting, or network requests.
- No user content is used for training or sold.
- There is no server-side source-data persistence and therefore no source-archive backup.
