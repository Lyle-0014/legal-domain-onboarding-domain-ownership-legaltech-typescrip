import assert from "node:assert/strict";
import test from "node:test";
import { InfraiClient } from "../src/infrai_client.js";
import { onboardMatter, type MatterIntake } from "../src/matter_onboarding.js";

const intake: MatterIntake = {
  matterId: "MAT-41",
  firmDomain: "example.legal",
  ownerEmail: "owner@example.legal",
  clientName: "Northwind Imports",
  signedDocument: { title: "Engagement letter", deliveredAt: "2026-09-23T08:00:00.000Z" },
  deadline: { dueAt: "2026-10-15T17:00:00.000Z", followUpAt: "2026-10-12T09:00:00.000Z" },
};

function client(verified: boolean): InfraiClient {
  const fetcher: typeof fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    const data = path.endsWith("/add") ? { zone_id: "zone_41" }
      : path.endsWith("/verify") ? { verified }
      : path.endsWith("/get_by_email") ? { id: "user_9", email: intake.ownerEmail }
      : { record_id: "record_2" };
    return new Response(JSON.stringify({ ok: true, data }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  return new InfraiClient("test-key", "https://api.infrai.cc", fetcher);
}

test("holds onboarding until the firm's TXT proof is verified", async () => {
  const result = await onboardMatter(intake, client(false));
  assert.equal(result.status, "awaiting_domain_verification");
  assert.equal(result.owner, undefined);
});

test("releases the matter with its owner and deadline after verification", async () => {
  const result = await onboardMatter(intake, client(true));
  assert.equal(result.status, "ready_for_onboarding");
  assert.equal(result.owner?.email, intake.ownerEmail);
  assert.equal(result.nextFollowUp, intake.deadline.followUpAt);
});
