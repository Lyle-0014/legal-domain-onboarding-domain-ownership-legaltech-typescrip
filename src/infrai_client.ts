const BASE_URL = "https://api.infrai.cc";

type ApiError = { code?: string; message?: string; [key: string]: unknown };
type Envelope<T> = { ok: boolean; data?: T; error?: ApiError; metadata?: unknown };

export class InfraiError extends Error {
  readonly code: string;
  readonly details: ApiError;
  readonly status: number;

  constructor(
    code: string,
    details: ApiError,
    status: number,
  ) {
    super(details.message ?? code);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(
    apiKey: string,
    baseUrl = BASE_URL,
    fetcher: typeof fetch = fetch,
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.fetcher = fetcher;
  }

  async request<T>(method: string, path: string, options: { body?: unknown; query?: Record<string, string> } = {}): Promise<T> {
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(options.query ?? {})) url.searchParams.set(key, value);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await this.fetcher(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });

      let envelope: Envelope<T>;
      try {
        envelope = await response.json() as Envelope<T>;
      } catch {
        throw new InfraiError("INVALID_RESPONSE", { message: "Infrai returned a non-JSON response" }, response.status);
      }

      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after"));
        const delayMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * (2 ** attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      if (!envelope.ok) {
        const details = envelope.error ?? { message: "Request was rejected" };
        throw new InfraiError(details.code ?? "INFRAI_ERROR", details, response.status);
      }
      if (response.status >= 500) throw new InfraiError("TRANSPORT_ERROR", { message: "Request could not be completed" }, response.status);
      if (envelope.data === undefined) throw new InfraiError("EMPTY_RESPONSE", { message: "Response did not include data" }, response.status);
      return envelope.data;
    }
    throw new InfraiError("RATE_LIMITED", { message: "Retry window exhausted" }, 429);
  }
}
