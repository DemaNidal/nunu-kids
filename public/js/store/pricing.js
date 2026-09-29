// محرّك العروض: أي عرض فعّال، وسعر كل منتج بعد الخصم
import { OFFERS } from '../data/offers.js';
import { queryParam } from '../utils.js';

// للمعاينة بس (لحد ما نبني لوحة الأدمن): ?offers=off بيطفي كل العروض
const previewOff = queryParam('offers') === 'off';

const isLive = (o, now = Date.now()) =>
  !previewOff && o.active &&
  (!o.startsAt || now >= Date.parse(o.startsAt)) &&
  (!o.endsAt || now < Date.parse(o.endsAt));

export const liveOffers = () => OFFERS.filter((o) => isLive(o));

const appliesTo = (offer, p) => {
  const { kind, ids = [] } = offer.target;
  return kind === 'all' ||
    (kind === 'category' && ids.includes(p.category)) ||
    (kind === 'products' && ids.includes(p.id));
};

const discounted = (offer, price) =>
  offer.type === 'percent' ? Math.round(price * (1 - offer.value / 100)) : Math.max(0, price - offer.value);

// سعر المنتج بعد أفضل خصم مباشر عليه
export function priceOf(p) {
  let best = null;
  for (const offer of liveOffers()) {
    if (offer.type === 'bxgy' || !appliesTo(offer, p)) continue;
    const price = discounted(offer, p.price);
    if (!best || price < best.price) best = { price, offer };
  }
  if (!best) return { price: p.price, old: null, pct: 0, offer: null };
  return {
    price: best.price,
    old: p.price,
    pct: Math.round((1 - best.price / p.price) * 100),
    offer: best.offer,
  };
}

// عروض "اشتري X وخذي Y" على منتج
export const bxgyFor = (p) => liveOffers().filter((o) => o.type === 'bxgy' && appliesTo(o, p));

// خصومات "اشتري X وخذي Y" على مجموعة أسطر: القطع الأرخص هي المجانية
export function bxgyDiscounts(lines) {
  return liveOffers()
    .filter((o) => o.type === 'bxgy')
    .map((o) => {
      const units = lines
        .filter((l) => appliesTo(o, l.product))
        .flatMap((l) => Array(l.qty).fill(l.unit))
        .sort((a, b) => a - b);
      const free = Math.floor(units.length / (o.buy + o.get)) * o.get;
      return { title: o.title, amount: units.slice(0, free).reduce((s, u) => s + u, 0) };
    })
    .filter((d) => d.amount > 0);
}
