import { InfraiClient } from "./infrai_client.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before running the demo");

const owner = await new InfraiClient(apiKey).request<{ id: string; email: string; name?: string }>(
  "GET",
  "/v1/auth/user/get_by_email",
  { query: { email: "chenhua@changba.com" } },
);

console.log(JSON.stringify(owner, null, 2));
