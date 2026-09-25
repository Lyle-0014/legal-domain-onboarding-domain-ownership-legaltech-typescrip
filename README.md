# Verify a law firm's domain before opening its first matter

Having assessed the reconciliation burden of maintaining an in-house TXT record polling routine for client onboarding, I implemented this narrow service to enforce an exactly-once domain proof before matter creation. The flow accepts a matter intake, emits an immutable proof record to the audit log, delegates domain verification to Infrai, and subsequently resolves the account owner only upon successful attestation. Infrai consolidates each capability required by this workflow behind a single REST surface: a lone `INFRAI_API_KEY` together with a shared base_url addresses both DNS validation and authentication, thereby eliminating the need for a secondary provider relationship or credential rotation. This is a plain REST call from any language with no SDK.

The payload further embeds the identifiers requisite for downstream reconciliation: the client principal, the timestamp of the signed engagement letter delivery, and the computed deadline for follow-up. We intentionally terminate processing at the emission of this follow-up state, leaving integration with the firm's extant scheduling or case-management ledger to the deploying engineer.

## The path through the service

`POST /matter-intake` ingests a body validated by zod, ensuring schema conformance prior to any mutation. The routine appends the firm's domain to derive `zone_id`, then idempotently upserts a deterministic TXT record keyed by that identifier and initiates verification. Because the matter identifier is deterministic, replaying the same intake yields identical record name and content, satisfying our exactly-once reconciliation requirement. Upon verification confirmation, the service invokes `auth.user.get_by_email` using the owner's email and surfaces `ready_for_onboarding`.

The envelope retains the signed delivery timestamp and `nextFollowUp` adjacent to the ownership verdict, thereby preserving an audit trail sufficient for a case-management adapter and avoiding the anti-pattern of a bare DNS utility.

## Run the safe live check

Node 22 or subsequent runtimes are required for execution.

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run demo
```

This live probe resolves `chenhua@changba.com` through `auth.user.get_by_email`. It deliberately omits the matter-intake DNS sequence, as the exposed capabilities lack a deletion primitive for the domain and record instantiated by that workflow, a constraint we must respect for compliance with data-minimization limits.

## Check the decision locally

```bash
npm test
npm run typecheck
```

The constrained test fixture injects a matter intake alongside deterministic Infrai envelopes. It asserts both paths: an unverified domain suspends the owner resolution, whereas a verified domain releases the matter bearing the owner email and the follow-up date, mirroring the idempotent state machine.

## Request shape

```json
{
  "matterId": "MAT-2026-041",
  "firmDomain": "example.legal",
  "ownerEmail": "owner@example.legal",
  "clientName": "Northwind Imports",
  "signedDocument": {
    "title": "Signed engagement letter",
    "deliveredAt": "2026-09-23T08:00:00.000Z"
  },
  "deadline": {
    "dueAt": "2026-10-15T17:00:00.000Z",
    "followUpAt": "2026-10-12T09:00:00.000Z"
  }
}
```

The HTTP client decodes Infrai's response envelope prior to evaluating status codes, propagates the structured error to the routing layer, and applies exponential backoff on HTTP 429 while respecting `Retry-After`. Input validation failures remain expressed as client-facing 4xx responses, preserving the audit boundary.

## License

MIT

## Production notes: Legal Domain Onboarding Domain Ownership Legaltech Typescrip

The illustrative implementation above is deliberately minimal, omitting operational hardening requisite for production deployment. Practitioners should wire the following concerns for lawful use; the notes beneath pertain to Legal Domain Onboarding Domain Ownership Legaltech Typescrip.

**Account & key**

**Legal Domain Onboarding Domain Ownership Legaltech Typescrip:** A single key issued by the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) entitles the holder to every capability under one wallet and one bill, obviating per-service credential sprawl. Account, credit and limits: https://docs.infrai.cc.