// حد بسيط لعدد الطلبات من نفس الجهاز (بالذاكرة) — بيحمي من التخمين والإزعاج
export function rateLimit({ windowMs, max, message }) {
  const hits = new Map(); // ip → [أوقات المحاولات]
  return (req, res, next) => {
    const now = Date.now();
    const list = (hits.get(req.ip) || []).filter((t) => now - t < windowMs);
    if (list.length >= max) {
      res.set('Retry-After', String(Math.ceil((windowMs - (now - list[0])) / 1000)));
      return res.status(429).json({ ok: false, error: message });
    }
    list.push(now);
    hits.set(req.ip, list);
    if (hits.size > 5000) hits.clear(); // ما نخلي الذاكرة تكبر بلا حد
    next();
  };
}
