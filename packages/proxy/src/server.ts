// Together.ai advisor proxy — minimal Node HTTP server.
//
// Design:
//   POST /advise   → { design, solve, cost, suggestions }
//                    → { narrative, cached, safety }
//   GET  /health   → { status, cacheSize }
//
// The Together.ai key is read from process.env.TOGETHER_AI_API_KEY on start
// and never leaves this process.

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { cacheKey, get as cacheGet, put as cachePut, stats as cacheStats } from './cache.js';
import { callTogether } from './together.js';
import { SYSTEM_PROMPT, userMessageFor, type AdviseRequest } from './prompt.js';
import { checkNumericSafety } from './safetyCheck.js';

const PORT = Number(process.env.PROXY_PORT ?? 4001);
const API_KEY = process.env.TOGETHER_AI_API_KEY;
const MODEL = process.env.TOGETHER_MODEL ?? 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173';

if (!API_KEY) {
  console.warn('[propelx-proxy] TOGETHER_AI_API_KEY not set — /advise will return 503.');
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function validate(payload: unknown): payload is AdviseRequest {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.design === 'object' &&
    typeof p.solve === 'object' &&
    typeof p.cost === 'object' &&
    Array.isArray(p.suggestions)
  );
}

async function handleAdvise(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!API_KEY) return json(res, 503, { error: 'Advisor not configured' });
  const body = await readBody(req);
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return json(res, 400, { error: 'Bad JSON' });
  }
  if (!validate(parsed)) return json(res, 400, { error: 'Invalid payload shape' });
  const payload = parsed;

  const key = cacheKey(payload, MODEL);
  const cached = cacheGet(key);
  if (cached) {
    return json(res, 200, {
      narrative: cached,
      cached: true,
      safety: checkNumericSafety(cached, payload),
      model: MODEL,
    });
  }

  try {
    const narrative = await callTogether({
      apiKey: API_KEY,
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessageFor(payload) },
      ],
    });
    cachePut(key, narrative);
    const safety = checkNumericSafety(narrative, payload);
    return json(res, 200, { narrative, cached: false, safety, model: MODEL });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json(res, 502, { error: 'Together.ai call failed', details: message });
  }
}

const server = createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }
  if (req.method === 'GET' && req.url === '/health') {
    return json(res, 200, { status: 'ok', cache: cacheStats(), model: MODEL, keyed: Boolean(API_KEY) });
  }
  if (req.method === 'POST' && req.url === '/advise') {
    return handleAdvise(req, res).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      json(res, 500, { error: message });
    });
  }
  json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`[propelx-proxy] listening on :${PORT} (model=${MODEL}, origin=${ALLOWED_ORIGIN})`);
});
