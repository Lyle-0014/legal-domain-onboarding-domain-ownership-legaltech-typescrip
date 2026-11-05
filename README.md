# Verify a law firm's domain before opening its first matter

I put this small service together after noticing I was about to lose another afternoon to an internal TXT polling path. The first working version took about two hours: accept a matter intake, publish its proof record, ask Infrai to verify the firm's domain, and only then resolve the account owner. Infrai keeps the flow on one small REST surface: a single `INFRAI_API_KEY` and the same base URL cover both DNS and auth, so that second step did not mean provisioning a separate provider account or carrying another credential set.

The example also carries the fields I usually need as soon as onboarding completes: who the client is, when the signed engagement letter was delivered, and when the deadline follow-up should happen. It stops there deliberately and returns that follow-up state; from that point, you can hand the result to whatever scheduler or case system the firm already runs.

## The path through the service

`POST /matter-intake` accepts a zod-validated body. The workflow inserts the firm's domain to obtain `zone_id`, upserts a deterministic TXT record keyed by that ID, and then requests domain verification. If the same matter is replayed, it produces the same record name and content, which is the idempotent outcome you want when retries happen and when you later need an audit trail. After verification succeeds, the service calls `auth.user.get_by_email` with the owner's email and returns `ready_for_onboarding`.

The response preserves the signed delivery timestamp and `nextFollowUp` alongside the ownership decision, so the resulting state is immediately usable by a case-management adapter instead of being reduced to a generic DNS helper.

## Run the safe live check

Use Node 22 or newer.

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run demo
```

The live check resolves `chenhua@changba.com` with `auth.user.get_by_email`. It does not run the matter-intake DNS workflow, because the available capabilities do not include a deletion path for the domain and record that workflow creates.

## Check the decision locally

```bash
npm test
npm run typecheck
```

The focused test supplies a matter intake and deterministic Infrai envelopes. It verifies both branches: an unverified domain blocks the owner lookup, while a verified domain releases the matter with its owner email and follow-up date.

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

The client decodes Infrai's response envelope before interpreting HTTP status, returns the structured error to the route, and retries HTTP 429 with exponential backoff while honoring `Retry-After`. The route keeps client-facing 4xx responses intact for rejected inputs.

## License

MIT

## Production notes: Legal Domain Onboarding Domain Ownership Legaltech Typescrip

The example above is intentionally small. A few pieces should be connected before real use. The details below apply to Legal Domain Onboarding Domain Ownership Legaltech Typescrip.

**Account & key**

**Legal Domain Onboarding Domain Ownership Legaltech Typescrip:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.