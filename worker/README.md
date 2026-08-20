# Website AMA Worker

This Worker keeps a provider API key off GitHub Pages and retrieves the current deployed `ai/site-content.json` file. It supports any HTTPS endpoint that implements either the OpenAI-compatible Chat Completions or Responses request/response format, including self-hosted gateways.

## One-time Cloudflare setup

1. Install Wrangler and sign in: `npm install -g wrangler && wrangler login`.
2. Create a KV namespace: `wrangler kv namespace create RATE_LIMITER`. Put the returned ID in `wrangler.jsonc` in place of `REPLACE_WITH_YOUR_KV_NAMESPACE_ID`.
3. Configure `AI_API_URL`, `AI_API_FORMAT` (`chat_completions` or `responses`) and `AI_MODEL` in `wrangler.jsonc`, or as Worker environment variables in the Cloudflare dashboard. The URL is administrator-controlled; visitors can never provide an upstream URL.
4. If the provider requires authentication, set its key as a Cloudflare secret: `wrangler secret put AI_API_KEY`. Never put the key in this repository or in `wrangler.jsonc`. For a non-Bearer scheme, set `AI_API_AUTH_HEADER` and `AI_API_AUTH_PREFIX` as Worker variables (for example, `x-api-key` and an empty prefix).
5. Deploy: `wrangler deploy`.
5. Confirm the deployed Worker URL matches the `data-chat-endpoint` in `../index.html`. If the Cloudflare account creates a different URL, update that attribute and publish the site.

The Worker accepts requests only from `https://miles629.github.io`, limits an IP to 12 requests per minute via KV, limits message/history size, and times out upstream requests after 25 seconds. The `responses` adapter sends `store: false`; for other formats, check the chosen provider's retention controls. Enable a Cloudflare Turnstile challenge before broadly publicizing the widget if abuse becomes a concern.

## GitHub Pages setup

This repository now deploys through `.github/workflows/pages.yml`. In the GitHub repository's **Settings → Pages**, set the source to **GitHub Actions** once. Each push to `main` rebuilds `ai/site-content.json` before publishing.
