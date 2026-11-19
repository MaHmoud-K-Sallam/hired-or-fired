# Hired or Fired? | توظيف أم تسريح؟

An Arabic, right-to-left decluttering app where your possessions interview for their next chapter. Describe an object, ask it questions, then choose a practical outcome: **keep, repair, donate, or sell**.

## Project status

**Work in progress — not a production-ready release.**

The app includes the interview interface, decision workflow, browser-based history, and server-side AI integrations. Client timeout handling has been improved for slower local models.

Live chatbot quality is still being refined. Models can invent details, overlook supplied facts, or produce awkward Arabic despite the grounding instructions. The latest real-Ollama browser test failed a factual-adherence assertion before completing the final save-and-reopen checks. **The complete live conversation-to-saved-decision flow has not yet passed final acceptance.** Do not treat generated statements about condition, history, capabilities, or resale value as verified facts.

## Features

- Arabic interface with RTL layouts and responsive screens.
- Object intake: name, last use, condition, and sentimental importance.
- Clearly labeled, scripted sample interviews that need no AI credentials.
- Live interviews through local Ollama or server-side OpenAI.
- Four decision paths:
  - **Keep:** specify a use and a storage location.
  - **Repair:** record the repair and its next step.
  - **Donate:** name a destination.
  - **Sell:** prepare an editable listing draft and an optional user-entered price.
- Interview history, decision editing, and progress tracking stored in the browser.
- History deletion/reset, keyboard interaction, and reduced-motion styling.

There are no accounts, payments, marketplace integrations, or automatic listing publication.

## Tech stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Zod, Vitest, and Playwright with axe-core.

## Requirements

- Node.js 24 LTS and npm recommended.
- A modern browser with Web Locks support; use localhost or HTTPS.
- Optional: Ollama and a downloaded local model, or an OpenAI API key.

## Quick start: sample mode

```bash
git clone https://github.com/MaHmoud-K-Sallam/hired-or-fired.git
cd hired-or-fired
npm ci
npm run dev -- --hostname 127.0.0.1
```

Open **http://localhost:3000**. With no OpenAI key configured and the default provider, the app offers the labeled sample interview. Its responses are scripted, not live AI.

The hostname override limits the development server to this machine; the package's default development command otherwise binds to all interfaces.

## Configure live AI

Create `.env.local` in the project root. You can copy `.env.example` as a starting point. Restart the Next.js server after changing environment variables.

Choose **one** provider configuration below. Never commit `.env.local` or real credentials.

### Option A: local Ollama

Install Ollama separately, start it, and download a model:

```bash
ollama pull qwen3:4b-instruct
```

Set `.env.local` to:

```dotenv
AI_PROVIDER=ollama
OLLAMA_MODEL=qwen3:4b-instruct
```

The server connects to Ollama at `http://127.0.0.1:11434`. Ollama must run on the same machine as the Next.js server, not merely on the browser user's machine.

- The checked-in fallback model is `qwen3:1.7b`; set `OLLAMA_MODEL` explicitly to use another installed model.
- `qwen3:4b-instruct` has been tried during development but has **not** passed final chatbot-quality acceptance.
- The configured model must appear under its exact name in Ollama's installed-model list.
- Cloud-backed model aliases are rejected; there is no automatic OpenAI fallback.
- Local inference can be slow on a CPU. The server allows up to 180 seconds per generation; the client allows 185 seconds.

### Option B: OpenAI

Set `.env.local` to:

```dotenv
AI_PROVIDER=openai
OPENAI_API_KEY=replace_with_your_key
OPENAI_MODEL=gpt-4o-mini
```

The key stays on the server. In this mode, object details and conversation context are sent to OpenAI, and API usage may incur charges. Live OpenAI behavior has not been verified with a real key in the current development checkpoint.

## Data and privacy

- Interviews and decisions are stored in browser `localStorage`, not a server database.
- Use the same browser profile and origin to reopen saved work. Changing hostname, scheme, or port creates a separate storage area.
- Clearing site data or deleting/resetting history removes saved records. There is no account sync or backup service.
- Sample interviews do not send facts to an AI provider. Live interviews send facts and recent dialogue through the app server to the configured provider.
- The server validates request and response shapes. Schema validation and prompts do **not** guarantee factual accuracy.
- This is a local-development MVP without user authentication or rate limiting. Do not expose an API-key-backed instance publicly without adding appropriate access and abuse controls.

## Development commands

```bash
npm run typecheck
npm test
npm run build
npm run start -- --hostname 127.0.0.1
```

`start` serves an existing production build. Stop another server using port 3000 first, or choose a different port with `--port`.

### Browser tests

Install the Playwright browser once:

```bash
npx playwright install chromium
```

Start the app in a separate terminal, then run:

```bash
npm run test:e2e
```

The Playwright configuration **does not start a server automatically**. It defaults to `http://localhost:3000`. For ordinary regression tests, use sample mode without AI credentials; provider-specific scenarios use mocked responses. The real Ollama test is skipped unless explicitly enabled.

For another port, in Bash or Git Bash:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3002 npm run test:e2e
```

To run the real-model acceptance test, first start the app with the Ollama configuration, then run in Bash or Git Bash:

```bash
TEST_OLLAMA_REAL=1 npm run test:e2e -- --grep "real Ollama"
```

This test generates a real Arabic conversation, checks factual grounding and context recall, then attempts to save a donation decision and reopen the interview. Allow several minutes. **It is currently a known failing acceptance test**, not evidence of a release-ready chatbot.

If needed, `PLAYWRIGHT_CHROMIUM_EXECUTABLE` can point to an existing Chromium executable. Test screenshots and traces are written under `.test-artifacts/` and are ignored by Git.

## Troubleshooting

- **Only sample mode is available:** verify the selected provider, restart Next.js after environment changes, and check that Ollama is running with the exact configured model installed.
- **A live reply times out:** check local model availability and machine resources. Retry or explicitly choose the sample interview; live failures are not silently replaced with scripted replies.
- **Changes do not appear:** make sure you started the server from this checkout and opened its correct port. Another checkout may already be serving port 3000.
- **History seems missing:** return to the original browser profile and origin. `localhost` and `127.0.0.1`, or different ports, have separate storage.
- **Storage is unavailable:** keep the tab open; unsaved session changes may be lost when it closes. Follow the app's storage warning before resetting anything.

## Remaining work

- Improve Arabic response quality and factual adherence without hiding failures behind scripted answers.
- Pass the real-model conversation, decision-save, reload, and reopen acceptance test.
- Re-run the complete regression suite and review desktop/mobile behavior after the remaining chatbot fixes.
