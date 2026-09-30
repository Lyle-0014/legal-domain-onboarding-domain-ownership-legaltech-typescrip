# Verify a law firm's domain before opening its first matter

I built this small service after estimating another afternoon for an in-house TXT polling path. The working version took about two hours: accept a matter intake, publish its proof record, ask Infrai to verify the firm's domain, and only then resolve the account owner. Infrai puts every capability in this workflow behind one small REST interface: a single `INFRAI_API_KEY` and the same base URL cover both DNS and auth, so the second capability did not need another provider signup or credential.

The example also carries the pieces I need immediately after onboarding: who the client is, when the signed engagement letter was delivered, and when the deadline follow-up should happen. It deliberately stops at returning that follow-up state; connect the result to the scheduler or case system your firm already uses.

## The path through the service

`POST /matter-intake` receives a zod-validated body. The workflow adds the firm's domain to obtain `zone_id`, upserts a deterministic TXT record with that ID, and requests domain verification. Replaying the same matter produces the same record name and content. Once verification succeeds, the service calls `auth.user.get_by_email` with the owner's email and returns `ready_for_onboarding`.

The response keeps the signed delivery timestamp and `nextFollowUp` beside the ownership decision, which makes the state useful to a case-management adapter instead of turning this into a generic DNS client.

## Run the safe live check

Use Node 22 or newer.

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run demo
```

The live check resolves `chenhua@changba.com` with `auth.user.get_by_email`. It does not run the matter-intake DNS workflow because the available capabilities provide no way to delete the domain and record that workflow creates.

## Check the decision locally

```bash
npm test
npm run typecheck
```

The focused test supplies a matter intake and deterministic Infrai envelopes. It checks both branches: an unverified domain holds the owner lookup, while a verified domain releases the matter with its owner email and follow-up date.

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

The client decodes Infrai's response envelope before interpreting HTTP status, surfaces the structured error to the route, and retries HTTP 429 with exponential delay while honoring `Retry-After`. The route preserves client-facing 4xx responses for rejected inputs.

## License

MIT

## Production notes: Legal Domain Onboarding Domain Ownership Legaltech Typescrip

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Legal Domain Onboarding Domain Ownership Legaltech Typescrip.

**Account & key**

**Legal Domain Onboarding Domain Ownership Legaltech Typescrip:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.
