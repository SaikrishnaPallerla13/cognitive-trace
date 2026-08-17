# MVP pre-launch compliance report

## Outcome

**Status: prototype-only / not approved for public beta.** The MVP is fully local: it has no external model provider, cloud-analysis branch, account, telemetry, or server-side data store.

## Completed items

- Local import of ChatGPT export ZIP conversation JSON; source archive stays in browser memory.
- User-role filtering with timestamp, conversation/turn context, and basic identifier redaction before evidence display.
- Small deterministic, auditable move taxonomy; outputs link to classified excerpts.
- Monthly aggregation and an evidence-backed timeline/profile dashboard.
- No account, analytics, persistent application storage, data sales, training use, remote model call, or source-data backend.
- User-controlled deletion from the app's memory plus natural deletion on refresh.
- Synthetic dataset only for the included demo.
- Restricted claim language: no diagnosis, IQ/intelligence, medical, employment, admissions, insurance, credit, or consequential-decision claim.
- Data map, threat model, documented limitations, automated unit tests, and local static-server headers/CSP.
- Archive limits, confidence/reason fields, context-aware short-follow-up handling, sample-size safeguards, and time-diverse evidence selection.

## Project-specific standard exceptions / waivers

| Standard item | Exception | Rationale | Approval needed |
|---|---|---|---|
| Server-side raw-data backups | Intentionally not implemented | No source archive or raw message text is persisted server-side. Backing it up would increase privacy risk and contradict data minimization. | Product owner documents acceptance |
| User authentication / per-resource authorization | Not implemented | There are no users, accounts, shared resources, or server data in this MVP. | Reassess before any persistence or sharing |
| AI provider controls | Not applicable | There are no external model calls or cloud-analysis features. | Required before adding an AI feature |
| Production incident response / DPA / privacy notice | Deferred | Prototype has no operational data service, but a public beta changes this. | Legal/product owner before beta |

## Remaining owner or external items

- Product owner: decide audience/age gate, hosting/release integrity model, and whether any data may ever persist.
- Legal counsel: review Terms, Privacy Notice, disclaimers, jurisdictional privacy laws, consumer-protection claims, and beta consent before collecting data from anyone other than the owner.
- Security owner: independently test, add SCA/license scanning and release signing, and add archive entry-count limits/fuzz testing.
- Research/UX owner: create a consented, synthetic/redacted labeled evaluation set; quantify label quality; conduct user comprehension testing; define a correction/appeal mechanism.
- Security/performance owner: fuzz the ZIP parser and benchmark large, representative exports; move processing into a Web Worker if responsiveness is insufficient.

## Highest-risk unresolved issue

**The taxonomy is not yet validated against a consented, representative labeled dataset.** It can produce false positives/negatives, and labels must remain framed as observable, auditable wording cues—not measures of ability, personality, or health. Do not use this outside a clearly labeled prototype until validation and user-comprehension work are complete.
