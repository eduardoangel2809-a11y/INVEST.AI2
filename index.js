/**
 * INVEST.AI - proxy da brapi (plano gratuito)
 *
 * O app chama:  GET /api/quote?symbols=PETR4,VALE3
 * (o Firebase Hosting redireciona /api/** para esta função, ver firebase.json)
 *
 * Resposta: { results: [ { symbol, regularMarketPrice, regularMarketChangePercent,
 *             historicalDataPrice: [{close,...}] } ], requestedAt }
 *
 * O token da brapi fica no Secret Manager (BRAPI_TOKEN) e nunca vai para o navegador.
 */
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const BRAPI_TOKEN = defineSecret("BRAPI_TOKEN");

const BRAPI_URL = "https://brapi.dev/api/quote/";
const TICKER_RE = /^[A-Z0-9]{3,12}$/;
const MAX_SYMBOLS = 15;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min (a brapi gratuita já tem ~30 min de atraso)
const FETCH_TIMEOUT_MS = 10000;

// Cache em memória por instância: poupa a cota gratuita da brapi.
const cache = new Map(); // symbol -> { at, data }

async function fetchSymbol(symbol, token) {
  const hit = cache.get(symbol);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const url = `${BRAPI_URL}${encodeURIComponent(symbol)}?range=3mo&interval=1d`;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: ctl.signal,
    });
    if (!r.ok) return null; // ativo inexistente, fora do plano ou limite atingido
    const j = await r.json();
    const item = Array.isArray(j.results) ? j.results[0] : null;
    if (!item || !(item.regularMarketPrice > 0)) return null;
    cache.set(symbol, { at: Date.now(), data: item });
    return item;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

exports.api = onRequest(
  {
    region: "southamerica-east1",
    secrets: [BRAPI_TOKEN],
    cors: false, // mesma origem via Hosting, não precisa de CORS aberto
    timeoutSeconds: 30,
    memory: "256MiB",
    maxInstances: 5,
  },
  async (req, res) => {
    res.set("Cache-Control", "no-store");

    if (req.method !== "GET") {
      res.status(405).json({ error: "Método não permitido" });
      return;
    }

    // Aceita /api/quote (via Hosting) e /quote (chamada direta da função)
    const path = req.path.replace(/^\/api/, "");
    if (path !== "/quote") {
      res.status(404).json({ error: "Rota não encontrada" });
      return;
    }

    const symbols = [
      ...new Set(
        String(req.query.symbols || "")
          .toUpperCase()
          .split(",")
          .map((s) => s.trim())
          .filter((s) => TICKER_RE.test(s))
      ),
    ].slice(0, MAX_SYMBOLS);

    if (!symbols.length) {
      res.status(400).json({ error: "Informe ?symbols=PETR4,VALE3" });
      return;
    }

    // O plano gratuito da brapi aceita 1 ativo por requisição: buscamos em paralelo.
    const token = BRAPI_TOKEN.value();
    const items = await Promise.all(symbols.map((s) => fetchSymbol(s, token)));
    const results = items.filter(Boolean);

    if (!results.length) {
      res.status(502).json({ error: "Cotações indisponíveis no momento" });
      return;
    }

    res.json({ results, requestedAt: new Date().toISOString() });
  }
);
