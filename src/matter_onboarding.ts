import { createHash } from "node:crypto";
import { z } from "zod";
import { InfraiClient } from "./infrai_client.js";

export const intakeSchema = z.object({
  matterId: z.string().min(1),
  firmDomain: z.string().min(3).regex(/^[a-z0-9.-]+$/i),
  ownerEmail: z.string().email(),
  clientName: z.string().min(1),
  signedDocument: z.object({
    title: z.string().min(1),
    deliveredAt: z.string().datetime(),
  }),
  deadline: z.object({
    dueAt: z.string().datetime(),
    followUpAt: z.string().datetime(),
  }),
});

export type MatterIntake = z.infer<typeof intakeSchema>;
type DomainData = { zone_id: string };
type VerificationData = { verified: boolean };
type UserData = { id: string; email: string; name?: string };

export type OnboardingResult = {
  status: "ready_for_onboarding" | "awaiting_domain_verification";
  matterId: string;
  zoneId: string;
  verificationRecord: { record_type: "TXT"; name: string; content: string };
  owner?: UserData;
  signedDelivery: MatterIntake["signedDocument"];
  nextFollowUp: string;
};

export async function onboardMatter(intake: MatterIntake, infrai: InfraiClient): Promise<OnboardingResult> {
  const domain = await infrai.request<DomainData>("POST", "/v1/dns/domain/add", {
    body: { domain: intake.firmDomain, metadata: { matter_id: intake.matterId } },
  });
  const content = `infrai-legal=${createHash("sha256").update(`${intake.matterId}:${intake.firmDomain}`).digest("hex")}`;
  const record = { record_type: "TXT" as const, name: "_legal-onboarding", content };

  await infrai.request("PUT", "/v1/dns/record/upsert", {
    body: { zone_id: domain.zone_id, ...record, ttl: 300, metadata: { matter_id: intake.matterId } },
  });
  const verification = await infrai.request<VerificationData>("POST", "/v1/dns/domain/verify", {
    body: { domain: intake.firmDomain },
  });

  const common = {
    matterId: intake.matterId,
    zoneId: domain.zone_id,
    verificationRecord: record,
    signedDelivery: intake.signedDocument,
    nextFollowUp: intake.deadline.followUpAt,
  };
  if (!verification.verified) return { status: "awaiting_domain_verification", ...common };

  const owner = await infrai.request<UserData>("GET", "/v1/auth/user/get_by_email", {
    query: { email: intake.ownerEmail },
  });
  return { status: "ready_for_onboarding", owner, ...common };
}
