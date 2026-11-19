# Concierge Worker setup

The concierge chat on the site runs in two places.

- **Hostinger** serves the site and `assets/concierge.js`, as before.
- **Cloudflare** runs `worker.js`, which holds the AI key and answers chat questions.

This folder is blocked from public access by `.htaccess`. It holds no secrets.
Until steps 1 to 5 are done, the concierge works with local article search only.

## 1. OpenAI API key

1. Sign in at platform.openai.com. This is separate from a ChatGPT subscription.
2. Settings, Billing. Add a payment method and a small amount of credit ($10 is plenty to start).
3. Settings, Limits. Set a monthly budget, for example $20.
4. API keys, Create new secret key. Name it `mvg-concierge` and copy it. It is shown once.
5. Check the model list (Playground model menu or the Models page). The Worker uses `gpt-6-luna` by default.
   If the exact ID differs, note it for step 4 below.

## 2. Cloudflare Worker

1. Create a free account at dash.cloudflare.com. No domain or DNS changes are needed.
2. Compute (Workers), Workers and Pages, Create, Create Worker. Name it `mvg-concierge`, then Deploy.
3. Edit code. Replace everything with the contents of `worker.js`, then Deploy.
4. Copy the Worker address, for example `https://mvg-concierge.yourname.workers.dev`.

## 3. Turnstile (invisible bot check)

1. In the Cloudflare dashboard, open Turnstile, Add widget.
2. Hostnames: `machinevisionguy.com` and `www.machinevisionguy.com`. Widget mode: Invisible.
3. Copy the **site key** (public) and the **secret key**.

## 4. Worker secrets and settings

Worker, Settings, Variables and Secrets, Add.

| Name | Type | Value |
|---|---|---|
| `OPENAI_API_KEY` | Secret | key from step 1 |
| `TURNSTILE_SECRET` | Secret | secret key from step 3 |
| `OPENAI_MODEL` | Text | only if the model ID differs from `gpt-6-luna` |
| `LOG_QUESTIONS` | Text | `true` to keep visitor questions in Workers Logs (optional) |

To switch to Claude later, add `ANTHROPIC_API_KEY` (Secret) and set `PROVIDER` (Text) to `anthropic`.
No website change is needed.

## 5. Connect the site

In `assets/concierge.js`, fill in the settings at the top:

```
endpoint: 'https://mvg-concierge.yourname.workers.dev',
turnstileSiteKey: 'your Turnstile site key',
```

Commit and push in GitHub Desktop. Hostinger deploys automatically.

## 6. Web3Forms key (Talk to Eric form)

If not done yet, get the free access key at web3forms.com for machinevisionguy@gmail.com, then replace
`YOUR_WEB3FORMS_ACCESS_KEY` in both `contact.html` and `assets/concierge.js`.

## Notes

- Each question is one Worker request. The free plan allows 100,000 per day.
- The Worker allows 6 questions per minute per visitor and rejects requests from other websites.
- To read logged questions, open the Worker, then Observability or Logs. Logs are kept for a few days.
- The Worker reads `search-index.json` from the live site every 10 minutes. New articles need an entry there.
