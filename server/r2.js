// Cloudflare R2 (متوافق مع S3) — رفع وتنزيل وحذف ملفات، بتوقيع AWS SigV4 من غير مكتبات
// المفاتيح بملف .env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
// وكل bucket باسمه: R2_BACKUP_BUCKET (خاص) و R2_IMAGES_BUCKET (للصور، عام)
import { createHash, createHmac } from 'node:crypto';

const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => createHmac('sha256', key).update(data).digest();
const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

export const r2Configured = (bucket) => !!bucket && ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'].every((k) => process.env[k]);

/**
 * توقيع طلب (SigV4). منفصل عشان ينفحص على أمثلة AWS الرسمية.
 * headers لازم يكون فيها host و x-amz-date
 */
export function sign({ method, path, query = {}, headers, payloadHash, accessKey, secretKey, region, service }) {
  const amzDate = headers['x-amz-date'];
  const day = amzDate.slice(0, 8);
  const names = Object.keys(headers).map((h) => h.toLowerCase()).sort();
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v).trim()]));
  const canonical = [
    method,
    path.split('/').map(enc).join('/'),
    Object.keys(query).sort().map((k) => `${enc(k)}=${enc(query[k])}`).join('&'),
    names.map((h) => `${h}:${lower[h]}\n`).join(''),
    names.join(';'),
    payloadHash,
  ].join('\n');
  const scope = `${day}/${region}/${service}/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
  const key = hmac(hmac(hmac(hmac(`AWS4${secretKey}`, day), region), service), 'aws4_request');
  const signature = createHmac('sha256', key).update(toSign).digest('hex');
  return `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}`;
}

async function r2(method, bucket, key = '', { body, query = {}, extra = {} } = {}) {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  // R2_ENDPOINT اختياري (للتجربة أو لخدمة S3 تانية)
  const base = new URL(process.env.R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`);
  const { host } = base;
  const path = `/${bucket}${key ? `/${key}` : ''}`;
  const payloadHash = sha256(body ?? '');
  const headers = {
    host,
    'x-amz-date': new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''),
    'x-amz-content-sha256': payloadHash,
    ...extra,
  };
  headers.authorization = sign({ method, path, query, headers, payloadHash, accessKey: R2_ACCESS_KEY_ID, secretKey: R2_SECRET_ACCESS_KEY, region: 'auto', service: 's3' });
  const qs = Object.keys(query).length ? `?${Object.keys(query).sort().map((k) => `${enc(k)}=${enc(query[k])}`).join('&')}` : '';
  const { host: _h, ...sendHeaders } = headers;
  let res;
  try {
    res = await fetch(`${base.protocol}//${host}${path.split('/').map(enc).join('/')}${qs}`, { method, headers: sendHeaders, body });
  } catch (err) {
    throw new Error(`ما قدرنا نوصل لـ Cloudflare (${err.cause?.code || err.message})`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const code = text.match(/<Code>([^<]+)/)?.[1];
    throw new Error(`Cloudflare رفض الطلب: ${code || res.status}`);
  }
  return res;
}

export const r2Put = (bucket, key, buffer, { contentType, cacheControl } = {}) => r2('PUT', bucket, key, {
  body: buffer,
  extra: { ...(contentType ? { 'content-type': contentType } : {}), ...(cacheControl ? { 'cache-control': cacheControl } : {}) },
});
export const r2Get = async (bucket, key) => Buffer.from(await (await r2('GET', bucket, key)).arrayBuffer());
export const r2Delete = (bucket, key) => r2('DELETE', bucket, key);

export async function r2List(bucket, prefix) {
  const out = [];
  let token;
  do {
    const query = { 'list-type': '2', prefix, ...(token ? { 'continuation-token': token } : {}) };
    const xml = await (await r2('GET', bucket, '', { query })).text();
    for (const [, item] of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      out.push({
        key: item.match(/<Key>([^<]+)/)[1],
        size: Number(item.match(/<Size>(\d+)/)?.[1] || 0),
        createdAt: item.match(/<LastModified>([^<]+)/)?.[1],
      });
    }
    token = xml.includes('<IsTruncated>true') ? xml.match(/<NextContinuationToken>([^<]+)/)?.[1] : null;
  } while (token);
  return out;
}
