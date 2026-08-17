# Hardening status and external prerequisites

## Implemented in this MVP

- Local-only archive processing with size, entry-count, compression-ratio, uncompressed-size, safe-path, malformed-JSON, and time limits.
- Versioned normalized records with redacted display text, confidence levels, explicit matched-cue reasons, and prior-user context for short follow-ups.
- Basic false-positive guards for quoted/negated cue phrases.
- Trend safeguards: a minimum of four months and 20 messages in each comparison period, plus strength labels and sample sizes.
- Time-diverse, conversation-diverse evidence selection with an inspectable classification explanation.
- Expanded automated tests for redaction, context labels, false positives, schema fields, and trend-sample thresholds.

## Requires data, human judgment, or launch authority

- A consented labeled evaluation set and measured precision/recall/F1 per category.
- Taxonomy redesign into separate intent, reasoning-mode, decision-behavior, and meta/self dimensions.
- Fuzz testing with generated hostile ZIPs and a realistic performance benchmark corpus.
- Independent security review, dependency/SCA scanning, release signing, and deployment headers such as HSTS (only meaningful on HTTPS hosting).
- Product/legal decisions on intended audience, age gating, public Terms/Privacy Notice, and user-research claims.
- A Web Worker for very large real-world exports; current limits reduce resource risk but do not guarantee a responsive UI during JSON parsing on every device.

## Deliberate product boundary

The application has no cloud-AI path. Any future external analysis feature must be treated as a new product surface with an independent privacy review and explicit user decision.
