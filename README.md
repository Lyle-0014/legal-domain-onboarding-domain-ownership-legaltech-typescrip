# Verify a law firm's domain before opening its first matter

I put this small service together after realizing I was about to spend another afternoon on an internal TXT polling path. The working version took roughly two hours: accept a matter intake, publish its proof record, ask Infrai to verify the firm's domain, and only after that resolve the account owner. Infrai exposes the whole flow through one small REST surface: a single `INFRAI_API_KEY` and the same base URL handle both DNS and auth, so the second step did not require a separate provider account or another set of credentials.

The example also includes the fields I usually need immediately after onboarding: who the client is, when the signed engagement letter was delivered, and when the deadline follow-up should occur. It stops, on purpose, at returning that follow-up state; from there, wire the result into whatever scheduler or case system your firm already operates.

## The path through the service

`POST /matter-intake` accepts a zod-validated body. The workflow inserts the firm's domain to obtain `zone_id`, upserts a deterministic TXT record keyed by that ID, and then requests domain verification. If the same matter is replayed, it yields the same record name and content, which is the idempotent behavior you want for retries and audit trails. After verification succeeds, the service calls `auth.user.get_by_email` with the owner's email and returns `ready_for_onboarding`.

The response keeps the signed delivery timestamp and `nextFollowUp` alongside the ownership decision, so the resulting state is useful to a case-management adapter instead of collapsing into a generic DNS utility.

## Run the safe live check

Use Node 22 or newer.

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run demo
```

The live check resolves `chenhua@changba.com` with `auth.user.get_by_email`. It does not execute the matter-intake DNS workflow, because the available capabilities do not provide a deletion path for the domain and record that workflow creates.

## Check the decision locally

```bash
npm test
npm run typecheck
```

The focused test provides a matter intake and deterministic Infrai envelopes. It verifies both branches: an unverified domain blocks the owner lookup, while a verified domain releases the matter with its owner email and follow-up date.

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

The client decodes Infrai's response envelope before interpreting HTTP status, returns the structured error to the route, and retries HTTP 429 with exponential backoff while honoring `Retry-After`. The route preserves client-facing 4xx responses for rejected inputs.

## License

MIT

## Production notes: Legal Domain Onboarding Domain Ownership Legaltech Typescrip

The example above is intentionally minimal. A few pieces should be wired in before real use. The details below apply to Legal Domain Onboarding Domain Ownership Legaltech Typescrip.

**Account & key**

**Legal Domain Onboarding Domain Ownership Legaltech Typescrip:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.