// محرّك العروض بالمتجر: العروض الشغّالة، وسعر كل منتج بعد الخصم
// الحسابات نفسها بـ pricing-core.js (السيرفر بيستعمل نفس الملف)
import { REMOTE } from './remote.js';
import { queryParam } from '../utils.js';
import { isLive, appliesTo, bestPrice, bxgyDiscounts as bxgyCore } from './pricing-core.js';

// للمعاينة: ?offers=off بيطفي كل العروض بالصفحة
const previewOff = queryParam('offers') === 'off';

export const liveOffers = () => (previewOff ? [] : REMOTE.offers.filter((o) => isLive(o)));

// سعر المنتج بعد أفضل خصم مباشر عليه
export const priceOf = (p) => bestPrice(p, liveOffers());

// عروض "اشتري X وخذي Y" على منتج
export const bxgyFor = (p) => liveOffers().filter((o) => o.type === 'bxgy' && appliesTo(o, p));

// خصومات "اشتري X وخذي Y" على مجموعة أسطر
export const bxgyDiscounts = (lines) => bxgyCore(liveOffers(), lines);
