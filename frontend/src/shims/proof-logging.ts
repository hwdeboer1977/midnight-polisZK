/**
 * Logs what the proof server actually said when it refuses a request.
 *
 * `httpClientProofProvider` reports `code="400"` and discards the response
 * body — which is the only place the server explains itself. A 400 returned in
 * a few milliseconds means the request was rejected before any proving work
 * started, so the reason is in that body and nowhere else.
 *
 * Wrapping fetch rather than the provider because the provider does the request
 * internally; there is no seam between "provider called fetch" and "provider
 * threw away the answer".
 *
 * Read-only: the response is cloned, so the provider still consumes its own
 * copy exactly as before.
 */
const original = globalThis.fetch.bind(globalThis);

globalThis.fetch = async (input: any, init?: any) => {
  const response = await original(input, init);

  const url =
    typeof input === "string" ? input : (input?.url ?? String(input ?? ""));

  if (!response.ok && url.includes(":6300")) {
    void response
      .clone()
      .text()
      .then((body) =>
        console.error(
          `[proof-server] ${response.status} ${url}\n` +
            (body || "<empty body>")
        )
      )
      .catch(() => console.error(`[proof-server] ${response.status} ${url} <unreadable body>`));
  }

  return response;
};

export {};
