# Running Tilth locally

Active checkout: `/Users/akt/Desktop/Code/Independent_Project/hackathon/tilth`.

The integrated production build is running at http://localhost:8788/ with local Claude CLI narration. This host has a fresh character start. Browser verification used http://127.0.0.1:8788/ and a separate QA save; browser saves are scoped by origin.

Restart from this checkout if needed:

```sh
npm ci
npm run build
HOST=127.0.0.1 PORT=8788 npm start
```

The original Astra game remains separate at http://127.0.0.1:8787/.

The integration is committed locally on `main` and `codex/world-integration`; it has not been pushed to GitHub. See `docs/WORLD_INTEGRATION_VERIFICATION.md` for checks and `README.md` for the OpenAI switch. Do not put credentials in tracked files.

## OpenAI key

Paste the key after `OPENAI_API_KEY=` in the ignored `.env` in this checkout. Keep `ASTRA_PROVIDER=claude-cli` to continue local world narration; change it to `openai` when switching. `ASTRA_MODEL` selects world narration, while `OPENAI_MODEL` selects optional character/quest generation. Restart using the command above after changing `.env`; no provider override on that command will mask your selection. Do not commit `.env` or put the key into a browser field or chat.
