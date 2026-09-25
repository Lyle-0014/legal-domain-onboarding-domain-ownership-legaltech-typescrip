import { createServer } from "node:http";
import { ZodError } from "zod";
import { InfraiClient, InfraiError } from "./infrai_client.js";
import { intakeSchema, onboardMatter } from "./matter_onboarding.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");
const infrai = new InfraiClient(apiKey);

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/matter-intake") {
    response.writeHead(404, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Route not found" }));
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const intake = intakeSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const result = await onboardMatter(intake, infrai);
    response.writeHead(result.status === "ready_for_onboarding" ? 201 : 202, { "Content-Type": "application/json" });
    response.end(JSON.stringify(result));
  } catch (error) {
    const status = error instanceof ZodError ? 400 : error instanceof InfraiError && error.status < 500 ? error.status : 502;
    const message = error instanceof Error ? error.message : "Request failed";
    response.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify({ error: message }));
  }
});

server.listen(Number(process.env.PORT ?? 3000), () => console.log("Legal intake listening on http://localhost:3000"));
