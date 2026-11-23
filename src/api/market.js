export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=45, stale-while-revalidate=30');
  const raw = String((req.query && req.query.symbols) || '^JKSE,BBCA.JK,BBRI.JK').split(',').slice(0, 35);
  const symbols = Array.from(new Set(raw.map(s => s.trim()).filter(s => /^\^?[A-Z0-9.-]{1,18}$/.test(s))));
  const quotes = {};
  let history = [];

  await Promise.all(symbols.map(async (symbol) => {
    try {
      const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' +
        encodeURIComponent(symbol) + '?range=1y&interval=1d';
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(12000)
      });
      if (!response.ok) throw new Error('Yahoo Finance HTTP ' + response.status);

      const payload = await response.json();
      const result = payload && payload.chart && payload.chart.result && payload.chart.result[0];
      if (!result) {
        const message = payload && payload.chart && payload.chart.error && payload.chart.error.description;
        throw new Error(message || 'Yahoo Finance tidak mengembalikan data');
      }

      const meta = result.meta || {};
      const quote = (result.indicators && result.indicators.quote && result.indicators.quote[0]) || {};
      const closes = quote.close || [];
      const timestamps = result.timestamp || [];
      const valid = closes.filter(Number.isFinite);
      if (!valid.length) throw new Error('Data harga IHSG kosong');

      const last = valid[valid.length - 1];
      const previous = valid.length > 1 ? valid[valid.length - 2] : last;
      const price = Number.isFinite(Number(meta.regularMarketPrice)) ? Number(meta.regularMarketPrice) : last;
      const previousClose = Number.isFinite(Number(meta.chartPreviousClose))
        ? Number(meta.chartPreviousClose)
        : (Number.isFinite(Number(meta.previousClose)) ? Number(meta.previousClose) : previous);
      const points = timestamps.map((time, index) => ({
        time: time * 1000,
        close: closes[index]
      })).filter(point => Number.isFinite(point.close));

      quotes[symbol] = {
        symbol,
        name: meta.longName || meta.shortName || symbol,
        price,
        previousClose,
        change: price - previousClose,
        changePct: previousClose ? ((price - previousClose) / previousClose) * 100 : 0,
        open: quote.open && quote.open.length ? quote.open[quote.open.length - 1] : null,
        high: quote.high && quote.high.length ? quote.high[quote.high.length - 1] : null,
        low: quote.low && quote.low.length ? quote.low[quote.low.length - 1] : null,
        volume: quote.volume && quote.volume.length ? quote.volume[quote.volume.length - 1] : null,
        marketTime: meta.regularMarketTime ? meta.regularMarketTime * 1000 : null,
        currency: meta.currency || 'IDR',
        history: points
      };
      if (symbol === '^JKSE') history = points;
    } catch (error) {
      quotes[symbol] = { symbol, error: String(error && error.message || error) };
    }
  }));

  const hasData = Object.values(quotes).some(item => Number.isFinite(item.price));
  res.status(hasData ? 200 : 502).json({
    quotes,
    history,
    source: 'Yahoo Finance',
    asOf: new Date().toISOString()
  });
}