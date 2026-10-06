const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/health') return json({ ok: true, version: '0.4.0', now: new Date().toISOString() });
      if (url.pathname === '/api/sources') return json({ sources: sourceRegistry(env) });
      if (url.pathname === '/api/search') return handleSearch(url, env, ctx);
      if (url.pathname === '/api/resolve' && request.method === 'POST') return handleResolve(request, env, ctx);
      if (url.pathname === '/api/prepare' && request.method === 'POST') return handlePrepare(request, env);
      if (url.pathname === '/api/librivox/batch') return handleLibriVoxBatch(url, env, ctx);
      if (url.pathname === '/api/config') {
        return json({
          ai: false,
          mode: 'rules-only',
          smithsonian: Boolean(env.SI_API_KEY),
          pixabay: Boolean(env.PIXABAY_API_KEY),
          translation: 'on-demand-cache',
        });
      }
      if (url.pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404);
      return env.ASSETS.fetch(request);
    } catch (error) {
      return json({ error: error?.message || 'Unexpected error' }, 500);
    }
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function sourceRegistry(env) {
  return [
    {
      id: 'gutenberg', name: 'Project Gutenberg', types: ['text'], live: true, auth: 'none', mode: 'OPDS',
      topics: ['کتاب کلاسیک', 'داستان', 'ادبیات', 'فلسفه', 'تاریخ'],
      rights: 'Public Domain عمدتاً در آمریکا؛ برای بازار مقصد بررسی شود.',
      homepage: 'https://www.gutenberg.org/', provides: ['title','body/text-link','author','source','license'], note: 'جستجوی انسانی از OPDS. برای Sync حجیم از catalog رسمی استفاده شود.'
    },
    {
      id: 'wikisource', name: 'Wikisource', types: ['text'], live: true, auth: 'none', mode: 'MediaWiki API',
      topics: ['ادبیات', 'اسناد تاریخی', 'متون کلاسیک', 'شعر'],
      rights: 'CC BY-SA در سطح سایت؛ وضعیت خود اثر هم باید بررسی شود.',
      homepage: 'https://en.wikisource.org/', provides: ['title','extract/body','source','license'], note: 'برای متن‌های کوتاه و منبع‌دار مناسب است.'
    },
    {
      id: 'wikimedia', name: 'Wikimedia Commons', types: ['image', 'video', 'podcast', 'music'], live: true, auth: 'none', mode: 'MediaWiki API',
      topics: ['عکس', 'ویدیو', 'صدا', 'موسیقی', 'تاریخ', 'فرهنگ', 'علم'],
      rights: 'مجوز هر فایل جداست؛ موتور فقط مجوز و Attribution را همراه آیتم نگه می‌دارد.',
      homepage: 'https://commons.wikimedia.org/', provides: ['media','title','description','creator','license','attribution'], note: 'برای حالت Safe فقط PD/CC0/CC BY را نگه دارید.'
    },
    {
      id: 'nasa', name: 'NASA Image and Video Library', types: ['image', 'video', 'podcast'], live: true, auth: 'none', mode: 'NASA Media API',
      topics: ['فضا', 'زمین', 'علم', 'ماموریت‌ها', 'فضانوردی'],
      rights: 'NASA Media Usage Guidelines؛ لوگو، افراد و محتوای ثالث جدا بررسی شود.',
      homepage: 'https://images.nasa.gov/', provides: ['media','poster','title','description','keywords','source'], note: 'برای تصویر/ویدیو/صدا بسیار مناسب است.'
    },
    {
      id: 'librivox', name: 'LibriVox', types: ['podcast'], live: true, auth: 'none', mode: 'LibriVox API',
      topics: ['کتاب صوتی', 'داستان', 'شعر', 'ادبیات کلاسیک'],
      rights: 'ضبط‌ها Public Domain در آمریکا؛ کشور مقصد بررسی شود.',
      homepage: 'https://librivox.org/', provides: ['audio','title','description','duration','author','language','source'], note: 'حداکثر 500 رکورد در هر درخواست؛ درخواست‌ها با فاصله انجام شوند.'
    },
    {
      id: 'internetarchive', name: 'Internet Archive Open Audio', types: ['music'], live: true, auth: 'none', mode: 'Advanced Search API',
      topics: ['موسیقی آزاد', 'ضبط تاریخی', 'صوت آرشیوی'],
      rights: 'مجوز هر آیتم متفاوت است و باید قبل از انتشار تایید شود.',
      homepage: 'https://archive.org/details/audio', provides: ['audio','cover','title','description','creator','license'], note: 'به‌صورت پیش‌فرض در حالت Review قرار می‌گیرد.'
    },
    {
      id: 'smithsonian', name: 'Smithsonian Open Access', types: ['image'], live: Boolean(env.SI_API_KEY), auth: 'SI_API_KEY', mode: 'Open Access API',
      topics: ['هنر', 'تاریخ', 'فرهنگ', 'علم', 'اشیای موزه‌ای'],
      rights: 'برای فایل‌های Open Access معمولاً CC0.',
      homepage: 'https://www.si.edu/openaccess', provides: ['image','title','description','source','license'], note: env.SI_API_KEY ? 'متصل است.' : 'برای اتصال، API key رایگان Smithsonian لازم است.'
    },
    {
      id: 'pixabay', name: 'Pixabay', types: ['image', 'video'], live: Boolean(env.PIXABAY_API_KEY), auth: 'PIXABAY_API_KEY', mode: 'Pixabay API',
      topics: ['استوک', 'سفر', 'طبیعت', 'مردم', 'غذا', 'تکنولوژی'],
      rights: 'Pixabay Content License؛ بازتوزیع Standalone ممنوع.',
      homepage: 'https://pixabay.com/', provides: ['media','poster','duration(video)','tags','creator','source'], note: env.PIXABAY_API_KEY ? 'متصل است.' : 'برای اتصال، حساب و API key لازم است. Mass download مجاز نیست.'
    },
  ];
}

async function handleSearch(url, env, ctx) {
  const type = cleanType(url.searchParams.get('type') || 'image');
  const source = url.searchParams.get('source') || 'all';
  const q = (url.searchParams.get('q') || '').trim();
  const limit = clampInt(url.searchParams.get('limit'), 1, 100, 24);
  const safe = url.searchParams.get('safe') !== '0';
  const offset = clampInt(url.searchParams.get('offset'), 0, 100000, 0);
  if (!q && source !== 'librivox') return json({ error: 'عبارت جستجو لازم است.' }, 400);

  const sources = sourceRegistry(env).filter(s => s.types.includes(type) && (source === 'all' || s.id === source) && s.live);
  if (!sources.length) return json({ items: [], providers: [], warning: 'هیچ منبع فعالی برای این فیلتر وجود ندارد.' });

  const tasks = sources.map(async s => {
    try {
      const items = await searchSource(s.id, type, q, limit, offset, safe, env, ctx);
      return { source: s.id, ok: true, items };
    } catch (error) {
      return { source: s.id, ok: false, error: error?.message || String(error), items: [] };
    }
  });
  const results = await Promise.all(tasks);
  const items = results.flatMap(r => r.items).slice(0, limit * Math.max(1, sources.length));
  return json({ items, providers: results.map(({ source, ok, error, items }) => ({ source, ok, error, count: items.length })) });
}

async function searchSource(source, type, q, limit, offset, safe, env, ctx) {
  if (source === 'gutenberg') return searchGutenberg(q, Math.min(limit, 25));
  if (source === 'wikisource') return searchWikisource(q, Math.min(limit, 25));
  if (source === 'wikimedia') return searchWikimedia(type, q, Math.min(limit, 50), safe, ctx);
  if (source === 'nasa') return searchNasa(type, q, Math.min(limit, 100), ctx);
  if (source === 'librivox') return searchLibriVox(q, Math.min(limit, 100), offset, ctx);
  if (source === 'internetarchive') return searchInternetArchive(q, Math.min(limit, 50), ctx);
  if (source === 'smithsonian') return searchSmithsonian(q, Math.min(limit, 50), env, ctx);
  if (source === 'pixabay') return searchPixabay(type, q, Math.min(limit, 50), env, ctx);
  return [];
}

async function cachedFetch(url, options = {}, ttl = 1800, ctx) {
  const request = new Request(url, options);
  if ((options.method || 'GET').toUpperCase() !== 'GET') return fetch(request);
  const cache = caches.default;
  let response = await cache.match(request);
  if (response) return response;
  response = await fetch(request);
  if (response.ok) {
    const cached = new Response(response.body, response);
    cached.headers.set('Cache-Control', `public, max-age=${ttl}`);
    ctx?.waitUntil(cache.put(request, cached.clone()));
    return cached;
  }
  return response;
}

async function searchGutenberg(q, limit) {
  const u = `https://www.gutenberg.org/ebooks/search.opds/?query=${encodeURIComponent(q)}`;
  const r = await fetch(u, { headers: { 'User-Agent': 'VibeContentEngine/0.4 (+https://speakme.ir)' } });
  if (!r.ok) throw new Error(`Gutenberg ${r.status}`);
  const xml = await r.text();
  return parseGutenbergOpds(xml).slice(0, limit);
}

function parseGutenbergOpds(xml) {
  const chunks = xml.split(/<entry(?:\s[^>]*)?>/i).slice(1);
  return chunks.map(chunk => chunk.split(/<\/entry>/i)[0]).map(chunk => {
    const idRaw = getXmlTag(chunk, 'id');
    const title = decodeXml(getXmlTag(chunk, 'title'));
    const summary = decodeXml(stripHtml(getXmlTag(chunk, 'summary') || getXmlTag(chunk, 'content')));
    const authorChunk = (chunk.match(/<author[\s\S]*?<\/author>/i) || [''])[0];
    const creator = decodeXml(getXmlTag(authorChunk, 'name'));
    const ebookId = (idRaw.match(/(\d+)\s*$/) || [])[1] || (idRaw.match(/ebooks\/(\d+)/) || [])[1] || '';
    const links = [...chunk.matchAll(/<link\s+([^>]+)>?/gi)].map(m => attrsToObj(m[1]));
    const textLink = links.find(l => /text\/plain/i.test(l.type || '') && l.href) || links.find(l => /text\/html/i.test(l.type || '') && l.href);
    const epubLink = links.find(l => /epub/i.test(l.type || '') && l.href);
    const cover = links.find(l => /image/i.test(l.type || '') && l.href);
    const pageUrl = ebookId ? `https://www.gutenberg.org/ebooks/${ebookId}` : (idRaw || 'https://www.gutenberg.org/');
    return normalizeItem({
      id: `gutenberg:${ebookId || slug(title)}`,
      source: 'gutenberg', type: 'text', title, description: summary,
      creator, source_url: pageUrl, media_url: textLink?.href || epubLink?.href || '',
      thumbnail_url: cover?.href || '', language: '', duration: null,
      license: 'Project Gutenberg / Public Domain status varies by country',
      license_url: 'https://www.gutenberg.org/policy/license.html', commercial_ok: true,
      review_required: true, raw: { ebookId, epub: epubLink?.href || '' }
    });
  }).filter(x => x.title);
}

function getXmlTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}

function attrsToObj(s) {
  const o = {};
  for (const m of s.matchAll(/([:\w-]+)\s*=\s*"([^"]*)"/g)) o[m[1]] = decodeXml(m[2]);
  return o;
}

function decodeXml(s = '') {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

async function searchWikisource(q, limit) {
  const api = new URL('https://en.wikisource.org/w/api.php');
  api.search = new URLSearchParams({
    action: 'query', generator: 'search', gsrsearch: q, gsrnamespace: '0', gsrlimit: String(limit),
    prop: 'extracts|info', exintro: '1', explaintext: '1', exchars: '1400', inprop: 'url', format: 'json', origin: '*'
  }).toString();
  const r = await fetch(api);
  if (!r.ok) throw new Error(`Wikisource ${r.status}`);
  const data = await r.json();
  return Object.values(data.query?.pages || {}).map(p => normalizeItem({
    id: `wikisource:${p.pageid}`, source: 'wikisource', type: 'text', title: p.title,
    description: (p.extract || '').slice(0, 1200), creator: '', source_url: p.fullurl || `https://en.wikisource.org/?curid=${p.pageid}`,
    media_url: p.fullurl || '', thumbnail_url: '', language: 'en', duration: null,
    license: 'Wikisource / CC BY-SA site license + underlying work status', license_url: 'https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use',
    commercial_ok: true, review_required: true, raw: { pageid: p.pageid }
  }));
}

async function searchWikimedia(type, q, limit, safe, ctx) {
  const mediaWord = type === 'image' ? 'image' : type === 'video' ? 'video' : type === 'music' ? 'music audio' : 'audio';
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  api.search = new URLSearchParams({
    action: 'query', generator: 'search', gsrsearch: `${q} ${mediaWord}`, gsrnamespace: '6', gsrlimit: String(limit),
    prop: 'imageinfo|info', iiprop: 'url|mime|extmetadata', iiurlwidth: '900', inprop: 'url', format: 'json', origin: '*'
  }).toString();
  const r = await cachedFetch(api.toString(), {}, 1800, ctx);
  if (!r.ok) throw new Error(`Wikimedia ${r.status}`);
  const data = await r.json();
  const pages = Object.values(data.query?.pages || {});
  const expected = type === 'image' ? 'image/' : type === 'video' ? 'video/' : 'audio/';
  return pages.map(p => {
    const ii = p.imageinfo?.[0] || {};
    const meta = ii.extmetadata || {};
    const mime = ii.mime || '';
    if (!mime.startsWith(expected)) return null;
    const lic = cleanMeta(meta.LicenseShortName?.value || meta.UsageTerms?.value || '');
    const licUrl = meta.LicenseUrl?.value || '';
    const artist = cleanMeta(meta.Artist?.value || meta.Credit?.value || '');
    const desc = cleanMeta(meta.ImageDescription?.value || meta.ObjectName?.value || '');
    const rights = evaluateCommonsLicense(lic, licUrl);
    if (safe && !rights.safe) return null;
    return normalizeItem({
      id: `wikimedia:${p.pageid}`, source: 'wikimedia', type, title: p.title.replace(/^File:/, ''),
      description: desc, creator: artist, source_url: p.fullurl || '', media_url: ii.url || '',
      thumbnail_url: ii.thumburl || ii.url || '', language: '', duration: null, license: lic || 'Unknown', license_url: licUrl,
      commercial_ok: rights.commercial, review_required: !rights.safe || rights.shareAlike, raw: { mime, shareAlike: rights.shareAlike }
    });
  }).filter(Boolean);
}

function evaluateCommonsLicense(lic = '', url = '') {
  const s = `${lic} ${url}`.toLowerCase();
  const nc = /noncommercial|by-nc|\/nc\//.test(s);
  const nd = /no derivatives|by-nd|\/nd\//.test(s);
  const pd = /public domain|cc0|publicdomain/.test(s);
  const by = /cc by|creativecommons\.org\/licenses\/by\//.test(s);
  const sa = /share alike|by-sa|\/sa\//.test(s);
  const commercial = !nc && (pd || by || sa);
  const safe = commercial && !nd && !sa;
  return { commercial, safe, shareAlike: sa };
}

async function searchNasa(type, q, limit, ctx) {
  const mediaType = type === 'podcast' ? 'audio' : type;
  const api = new URL('https://images-api.nasa.gov/search');
  api.search = new URLSearchParams({ q, media_type: mediaType, page_size: String(limit) }).toString();
  const r = await cachedFetch(api.toString(), {}, 1800, ctx);
  if (!r.ok) throw new Error(`NASA ${r.status}`);
  const data = await r.json();
  return (data.collection?.items || []).map(entry => {
    const d = entry.data?.[0] || {};
    const preview = entry.links?.find(l => l.rel === 'preview')?.href || entry.links?.[0]?.href || '';
    return normalizeItem({
      id: `nasa:${d.nasa_id}`, source: 'nasa', type, title: d.title || d.nasa_id,
      description: d.description || d.description_508 || '', creator: d.photographer || d.secondary_creator || d.center || 'NASA',
      source_url: `https://images.nasa.gov/details/${encodeURIComponent(d.nasa_id || '')}`,
      media_url: '', thumbnail_url: preview, language: 'en', duration: null,
      license: 'NASA Media Usage Guidelines', license_url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
      commercial_ok: true, review_required: true, raw: { nasa_id: d.nasa_id, keywords: d.keywords || [], date_created: d.date_created || '', media_type: mediaType }
    });
  });
}

async function searchLibriVox(q, limit, offset, ctx) {
  const api = new URL('https://librivox.org/api/feed/audiobooks/');
  const params = { format: 'json', extended: '1', coverart: '1', limit: String(limit), offset: String(offset) };
  if (q) params.title = q;
  api.search = new URLSearchParams(params).toString();
  const r = await cachedFetch(api.toString(), { headers: { 'User-Agent': 'VibeContentEngine/0.4 (+https://speakme.ir)' } }, 3600, ctx);
  if (!r.ok) throw new Error(`LibriVox ${r.status}`);
  const data = await r.json();
  return (data.books || []).map(b => {
    const authors = (b.authors || []).map(a => [a.first_name, a.last_name].filter(Boolean).join(' ')).join(', ');
    const genres = (b.genres || []).map(g => g.name || g).filter(Boolean);
    return normalizeItem({
      id: `librivox:${b.id}`, source: 'librivox', type: 'podcast', title: b.title,
      description: stripHtml(b.description || '').slice(0, 1600), creator: authors,
      source_url: b.url_librivox || b.url_project || '', media_url: b.url_rss || b.url_zip_file || '',
      thumbnail_url: b.coverart_jpg || b.coverart_thumbnail || '', language: b.language || '',
      duration: Number(b.totaltimesecs || 0) || null,
      license: 'LibriVox recordings: Public Domain in the U.S.', license_url: 'https://librivox.org/pages/public-domain/',
      commercial_ok: true, review_required: true,
      raw: { rss: b.url_rss || '', zip: b.url_zip_file || '', text_source: b.url_text_source || '', genres, sections: b.num_sections || '' }
    });
  });
}

async function searchInternetArchive(q, limit, ctx) {
  const searchQ = `mediatype:audio AND (${q ? `title:(${q}) OR subject:(${q})` : 'collection:opensource_audio'})`;
  const api = new URL('https://archive.org/advancedsearch.php');
  const p = new URLSearchParams();
  p.set('q', searchQ); p.append('fl[]', 'identifier'); p.append('fl[]', 'title'); p.append('fl[]', 'creator');
  p.append('fl[]', 'description'); p.append('fl[]', 'licenseurl'); p.append('fl[]', 'subject'); p.set('rows', String(limit)); p.set('page', '1'); p.set('output', 'json');
  api.search = p.toString();
  const r = await cachedFetch(api.toString(), {}, 1800, ctx);
  if (!r.ok) throw new Error(`Internet Archive ${r.status}`);
  const data = await r.json();
  return (data.response?.docs || []).map(d => {
    const license = Array.isArray(d.licenseurl) ? d.licenseurl[0] : (d.licenseurl || 'Unknown');
    const evald = evaluateCommonsLicense('', license);
    return normalizeItem({
      id: `internetarchive:${d.identifier}`, source: 'internetarchive', type: 'music', title: d.title || d.identifier,
      description: Array.isArray(d.description) ? d.description.join(' ') : (d.description || ''),
      creator: Array.isArray(d.creator) ? d.creator.join(', ') : (d.creator || ''),
      source_url: `https://archive.org/details/${encodeURIComponent(d.identifier)}`,
      media_url: `https://archive.org/metadata/${encodeURIComponent(d.identifier)}`,
      thumbnail_url: `https://archive.org/services/img/${encodeURIComponent(d.identifier)}`,
      language: '', duration: null, license: license, license_url: license.startsWith('http') ? license : '',
      commercial_ok: evald.commercial, review_required: true, raw: { identifier: d.identifier, subjects: d.subject || [] }
    });
  });
}

async function searchSmithsonian(q, limit, env, ctx) {
  if (!env.SI_API_KEY) throw new Error('SI_API_KEY تنظیم نشده است.');
  const api = new URL('https://api.si.edu/openaccess/api/v1.0/search');
  api.search = new URLSearchParams({ q, api_key: env.SI_API_KEY, rows: String(limit), start: '0' }).toString();
  const r = await cachedFetch(api.toString(), {}, 3600, ctx);
  if (!r.ok) throw new Error(`Smithsonian ${r.status}`);
  const data = await r.json();
  return (data.response?.rows || []).map(row => {
    const c = row.content || {};
    const media = c.descriptiveNonRepeating?.online_media?.media || [];
    const image = media.find(m => (m.type || '').toLowerCase().includes('image')) || media[0] || {};
    const freetext = c.freetext || {};
    const desc = (freetext.notes || []).map(x => x.content).filter(Boolean).join(' ').slice(0, 1600);
    return normalizeItem({
      id: `smithsonian:${row.id}`, source: 'smithsonian', type: 'image', title: row.title || row.id,
      description: desc, creator: '', source_url: c.descriptiveNonRepeating?.record_link || '',
      media_url: image.content || image.resources?.[0]?.url || '', thumbnail_url: image.thumbnail || image.content || '',
      language: '', duration: null, license: 'Smithsonian Open Access / CC0 when media is supplied',
      license_url: 'https://www.si.edu/openaccess', commercial_ok: true, review_required: false, raw: { unitCode: row.unitCode || '' }
    });
  }).filter(x => x.media_url || x.thumbnail_url);
}

async function searchPixabay(type, q, limit, env, ctx) {
  if (!env.PIXABAY_API_KEY) throw new Error('PIXABAY_API_KEY تنظیم نشده است.');
  if (!['image', 'video'].includes(type)) return [];
  const base = type === 'video' ? 'https://pixabay.com/api/videos/' : 'https://pixabay.com/api/';
  const api = new URL(base);
  api.search = new URLSearchParams({ key: env.PIXABAY_API_KEY, q, per_page: String(Math.max(3, limit)), safesearch: 'true' }).toString();
  const r = await cachedFetch(api.toString(), {}, 86400, ctx);
  if (!r.ok) throw new Error(`Pixabay ${r.status}`);
  const data = await r.json();
  return (data.hits || []).map(h => normalizeItem({
    id: `pixabay:${h.id}`, source: 'pixabay', type,
    title: h.tags ? h.tags.split(',').slice(0, 4).join(' • ') : `Pixabay ${h.id}`,
    description: h.tags || '', creator: h.user || '', source_url: h.pageURL || '',
    media_url: type === 'video' ? (h.videos?.medium?.url || h.videos?.small?.url || '') : (h.largeImageURL || h.webformatURL || ''),
    thumbnail_url: type === 'video' ? (h.videos?.medium?.thumbnail || h.videos?.small?.thumbnail || '') : (h.webformatURL || h.previewURL || ''),
    language: '', duration: h.duration || null, license: 'Pixabay Content License',
    license_url: 'https://pixabay.com/service/license-summary/', commercial_ok: true, review_required: true,
    raw: { tags: h.tags || '', downloads: h.downloads || 0, likes: h.likes || 0 }
  }));
}

async function handleResolve(request, env, ctx) {
  const item = await request.json();
  if (!item?.source) return json({ error: 'item نامعتبر است.' }, 400);
  if (item.source === 'gutenberg') {
    let resolvedText = '';
    if (item.media_url) {
      const r = await cachedFetch(item.media_url, { headers: { 'User-Agent': 'VibeContentEngine/0.4 (+https://speakme.ir)' } }, 3600, ctx);
      if (r.ok) {
        const ct = r.headers.get('content-type') || '';
        const raw = await r.text();
        resolvedText = ct.includes('html') ? stripHtml(raw) : raw.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
      }
    }
    return json({ item: { ...item, raw: { ...(item.raw || {}), resolved_text: resolvedText.slice(0, 60000) } } });
  }
  if (item.source === 'wikisource') {
    const pageid = item.raw?.pageid;
    if (pageid) {
      const api = new URL('https://en.wikisource.org/w/api.php');
      api.search = new URLSearchParams({ action: 'query', pageids: String(pageid), prop: 'extracts', explaintext: '1', exchars: '30000', format: 'json', origin: '*' }).toString();
      const r = await cachedFetch(api.toString(), {}, 3600, ctx);
      if (r.ok) {
        const data = await r.json();
        const page = data.query?.pages?.[String(pageid)] || {};
        return json({ item: { ...item, raw: { ...(item.raw || {}), resolved_text: (page.extract || '').slice(0, 60000) } } });
      }
    }
    return json({ item });
  }
  if (item.source === 'nasa') {
    const nasaId = item.raw?.nasa_id || String(item.id || '').replace(/^nasa:/, '');
    const r = await cachedFetch(`https://images-api.nasa.gov/asset/${encodeURIComponent(nasaId)}`, {}, 3600, ctx);
    if (!r.ok) return json({ error: `NASA asset ${r.status}` }, 502);
    const data = await r.json();
    const hrefs = (data.collection?.items || []).map(x => x.href).filter(Boolean);
    const media = chooseMedia(hrefs, item.type);
    return json({ item: { ...item, media_url: media || item.media_url, raw: { ...(item.raw || {}), asset_files: hrefs.slice(0, 30) } } });
  }
  if (item.source === 'internetarchive') {
    const identifier = item.raw?.identifier || String(item.id || '').replace(/^internetarchive:/, '');
    const r = await cachedFetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, {}, 1800, ctx);
    if (!r.ok) return json({ error: `Internet Archive metadata ${r.status}` }, 502);
    const data = await r.json();
    const files = (data.files || []).filter(f => /audio|ogg|mp3|flac/i.test(`${f.format || ''} ${f.name || ''}`));
    const chosen = files.find(f => /VBR MP3|MP3/i.test(f.format || '')) || files[0];
    const media = chosen?.name ? `https://archive.org/download/${encodeURIComponent(identifier)}/${encodePath(chosen.name)}` : '';
    return json({ item: { ...item, media_url: media || item.media_url, duration: item.duration || Number(chosen?.length || 0) || null, raw: { ...(item.raw || {}), file: chosen || null } } });
  }
  if (item.source === 'librivox') {
    const id = String(item.id || '').replace(/^librivox:/, '');
    const api = `https://librivox.org/api/feed/audiotracks/?project_id=${encodeURIComponent(id)}&format=json`;
    const r = await cachedFetch(api, { headers: { 'User-Agent': 'VibeContentEngine/0.4 (+https://speakme.ir)' } }, 3600, ctx);
    if (r.ok) {
      const data = await r.json();
      const tracks = data.tracks || data.audiotracks || [];
      const first = tracks[0] || null;
      const media = first?.url || first?.url_audio || first?.mp3 || first?.file || '';
      return json({ item: { ...item, media_url: media || item.media_url, raw: { ...(item.raw || {}), first_track: first, track_count: tracks.length } } });
    }
  }
  return json({ item });
}

function chooseMedia(hrefs, type) {
  const prefs = type === 'video' ? [/\.mp4(\?|$)/i, /\.mov(\?|$)/i, /\.m4v(\?|$)/i]
    : type === 'podcast' ? [/\.mp3(\?|$)/i, /\.wav(\?|$)/i, /\.m4a(\?|$)/i]
    : [/\.jpg(\?|$)/i, /\.jpeg(\?|$)/i, /\.png(\?|$)/i, /\.tif(\?|$)/i];
  for (const re of prefs) { const found = hrefs.find(h => re.test(h)); if (found) return found; }
  return hrefs[0] || '';
}

async function handlePrepare(request, env) {
  const body = await request.json();
  const item = body.item;
  const learningLanguage = body.learning_language || item?.language || 'en';
  const uiLanguage = body.ui_language || 'fa';
  if (!item?.type) return json({ error: 'item نامعتبر است.' }, 400);

  const prepared = rulePrepare(item, learningLanguage, uiLanguage);
  return json({
    prepared,
    ai: false,
    mode: 'rules-only',
    warning: prepared.ready_to_publish
      ? 'بدون AI آماده شد؛ ترجمه فقط هنگام درخواست کاربر ساخته و Cache می‌شود.'
      : `Draft ساخته شد؛ ${prepared.missing_required.length} فیلد اجباری هنوز ناقص است.`
  });
}

function rulePrepare(item, learningLanguage, uiLanguage) {
  const description = normalizeText(item.description || '');
  const sourceText = normalizeText(item.raw?.resolved_text || '');
  const title = normalizeText(item.title || 'Untitled');
  const category = inferCategory(item);
  const keywords = inferKeywordObjects(item, 6);
  const body = item.type === 'text' ? chooseTextBody(sourceText, description, title) : '';
  const readSource = item.type === 'text' ? body : (item.type === 'image' ? `${title} ${description}` : '');
  const readTime = readSource ? Math.max(1, Math.ceil(countWords(readSource) / 190)) : null;
  const theme = ['podcast','music'].includes(item.type) ? deterministicTheme(`${item.source}:${item.id}:${category.key}`) : null;
  const transcript = normalizeText(item.raw?.transcript || item.raw?.resolved_transcript || '');

  const prepared = {
    schema_version: 'vibe-2',
    content_id: crypto.randomUUID(),
    type: item.type,
    source: {
      id: item.source,
      url: item.source_url || '',
      creator: item.creator || '',
      license: item.license || '',
      license_url: item.license_url || '',
      commercial_ok: item.commercial_ok !== false,
      review_required: Boolean(item.review_required)
    },
    field_origins: {
      title: 'source',
      description: description ? 'source' : 'missing',
      body: body ? (sourceText ? 'source-resolved' : 'source-metadata') : 'missing',
      category: 'rules',
      read_time_min: readTime ? 'calculated' : 'missing',
      keywords: keywords.length ? 'rules' : 'missing',
      theme: theme ? 'rules' : 'n/a',
      translation: 'lazy-on-demand'
    },
    learning_language: normalizeLanguage(learningLanguage || item.language || ''),
    original_language: normalizeLanguage(item.language || learningLanguage || ''),
    ui_language: normalizeLanguage(uiLanguage),
    category_key: category.key,
    category_label: category.fa,
    title,
    description: clip(description, 420),
    body: item.type === 'text' ? clip(body, 12000) : '',
    keywords,
    read_time_min: readTime,
    duration_sec: item.duration || null,
    media_url: item.media_url || '',
    poster_url: item.thumbnail_url || '',
    transcript,
    subtitle_url: item.raw?.subtitle_url || '',
    translation: null,
    translation_mode: 'on_demand_cache',
    translation_status: 'not_generated',
    keyword_meaning_mode: 'on_demand_dictionary',
    theme,
    runtime_fields: ['publisher_character','published_at','like_count','reply','bookmark','share','play_progress'],
    status: 'draft',
    provider_raw_id: item.id,
    generated_at: new Date().toISOString()
  };

  // Type-specific behavior matching the approved Vibe UI.
  if (item.type === 'image') {
    // Image Vibe has no visible category chip in the approved UI.
    prepared.ui_category_visible = false;
  } else {
    prepared.ui_category_visible = true;
  }
  if (item.type === 'music') {
    prepared.transcript = '';
    prepared.translation_mode = 'metadata_on_demand_cache';
  }

  const validation = validatePrepared(prepared);
  prepared.required_fields = validation.required;
  prepared.missing_required = validation.missing;
  prepared.completeness = validation.completeness;
  prepared.ready_to_publish = validation.missing.length === 0 && prepared.source.commercial_ok && !prepared.source.review_required;
  prepared.rights_status = !prepared.source.commercial_ok ? 'blocked' : prepared.source.review_required ? 'review' : 'clear';
  return prepared;
}

function requiredFieldsForType(type) {
  const common = ['type','title','source.url','source.license'];
  const map = {
    text: ['body','read_time_min'],
    image: ['media_url','title','description','read_time_min'],
    video: ['media_url','poster_url','duration_sec','title','description','category_label'],
    podcast: ['media_url','duration_sec','title','description','category_label','theme'],
    music: ['media_url','poster_url','duration_sec','title','description','category_label','theme']
  };
  return [...common, ...(map[type] || [])];
}

function validatePrepared(obj) {
  const required = requiredFieldsForType(obj.type);
  const missing = required.filter(path => !hasValue(getPath(obj, path)));
  return {
    required,
    missing,
    completeness: Math.round(((required.length - missing.length) / Math.max(1, required.length)) * 100)
  };
}

function getPath(obj, path) {
  return path.split('.').reduce((v, k) => (v == null ? undefined : v[k]), obj);
}
function hasValue(v) {
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'number') return Number.isFinite(v) && v > 0;
  if (typeof v === 'boolean') return true;
  return v != null && String(v).trim() !== '';
}
function normalizeText(s='') { return stripHtml(String(s)).replace(/\s+/g,' ').trim(); }
function clip(s='', n=420) { s=String(s||'').trim(); return s.length > n ? `${s.slice(0,n).trim()}…` : s; }
function countWords(s='') { return (String(s).trim().match(/\S+/g) || []).length; }
function chooseTextBody(sourceText, description, title) {
  const t = normalizeText(sourceText);
  if (t && countWords(t) >= 70) {
    // Keep a readable excerpt rather than pushing an entire book into one Vibe.
    return excerptByWords(t, 360);
  }
  const d = normalizeText(description);
  if (d && countWords(d) >= 35) return excerptByWords(d, 360);
  return d || title;
}
function excerptByWords(s, maxWords=360) {
  const words = String(s||'').split(/\s+/).filter(Boolean);
  return words.length > maxWords ? `${words.slice(0,maxWords).join(' ')}…` : words.join(' ');
}
function normalizeLanguage(v='') {
  const s=String(v||'').toLowerCase();
  const map={english:'en',german:'de',turkish:'tr',persian:'fa',farsi:'fa',arabic:'ar',french:'fr',spanish:'es',italian:'it'};
  return map[s] || s || '';
}
function inferKeywordObjects(item, n=6) {
  const fromSource = [
    ...(Array.isArray(item.raw?.keywords) ? item.raw.keywords : []),
    ...(Array.isArray(item.raw?.genres) ? item.raw.genres : []),
    ...(Array.isArray(item.raw?.subjects) ? item.raw.subjects : []),
    ...String(item.raw?.tags || '').split(',')
  ].map(x => normalizeText(typeof x === 'string' ? x : (x?.name || ''))).filter(Boolean);
  const inferred = inferKeywords(item, n * 2);
  const seen = new Set();
  return [...fromSource, ...inferred].filter(x => {
    const k=x.toLowerCase(); if(!k || seen.has(k)) return false; seen.add(k); return true;
  }).slice(0,n).map(word => ({ word, meaning: null, meaning_status: 'lazy_dictionary' }));
}
function deterministicTheme(seed='') {
  const themes = [
    { id:'sunset-violet', gradient:['#ff9a72','#e780a5','#8f72d4','#374a91'] },
    { id:'peach-lilac', gradient:['#ffb18a','#f19ac1','#9d83dc','#5264b5'] },
    { id:'ocean-dusk', gradient:['#ffad86','#cf83b3','#6f76c9','#31477e'] },
    { id:'berry-sky', gradient:['#ffa27d','#e36fa7','#8e72d8','#495fa5'] },
    { id:'warm-night', gradient:['#ffc08e','#e78da9','#7c6fc3','#2f447b'] }
  ];
  let h=0; for(const ch of seed) h=(h*31+ch.charCodeAt(0))>>>0;
  return themes[h % themes.length];
}

async function handleLibriVoxBatch(url, env, ctx) {
  const limit = clampInt(url.searchParams.get('limit'), 1, 500, 100);
  const offset = clampInt(url.searchParams.get('offset'), 0, 1000000, 0);
  const q = (url.searchParams.get('q') || '').trim();
  const items = await searchLibriVox(q, limit, offset, ctx);
  return json({ items, next_offset: offset + items.length, note: 'LibriVox asks developers to space repeated requests by several seconds.' });
}

function normalizeItem(x) {
  return {
    id: x.id, source: x.source, type: x.type, title: x.title || '', description: x.description || '', creator: x.creator || '',
    source_url: x.source_url || '', media_url: x.media_url || '', thumbnail_url: x.thumbnail_url || '', language: x.language || '',
    duration: x.duration || null, license: x.license || '', license_url: x.license_url || '', commercial_ok: x.commercial_ok !== false,
    review_required: Boolean(x.review_required), raw: x.raw || {}
  };
}

function inferCategory(item) {
  const s = `${item.title || ''} ${item.description || ''} ${(item.raw?.genres || []).join?.(' ') || ''}`.toLowerCase();
  if (/travel|city|country|culture|town|village|journey/.test(s)) return { key: 'travel_culture', fa: 'سفر و فرهنگ' };
  if (/space|nasa|science|planet|earth|moon|mars/.test(s)) return { key: 'science', fa: 'علم و دانستنی' };
  if (/history|historic|museum|archive/.test(s)) return { key: 'history', fa: 'تاریخ و فرهنگ' };
  if (/habit|life|mind|psychology|wellbeing|health/.test(s)) return { key: 'lifestyle', fa: 'زندگی و رشد' };
  if (item.type === 'music') return { key: 'music_mood', fa: 'موسیقی و حال خوب' };
  if (item.type === 'podcast') return { key: 'podcast', fa: 'پادکست' };
  if (item.source === 'gutenberg' || item.source === 'librivox') return { key: 'book', fa: 'کتاب و داستان' };
  return { key: 'general', fa: 'جالب و خواندنی' };
}

function inferKeywords(item, n = 6) {
  const stop = new Set('the a an and or but of to in on for with from is are was were be been this that it its as by at into about your you i we they he she their our'.split(' '));
  const words = `${item.title || ''} ${stripHtml(item.description || '')}`.toLowerCase().match(/[a-z][a-z-]{2,}/g) || [];
  const counts = {};
  for (const w of words) if (!stop.has(w)) counts[w] = (counts[w] || 0) + 1;
  return Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0,n).map(([w]) => w);
}

function cleanType(type) {
  return ['text','image','video','podcast','music'].includes(type) ? type : 'image';
}
function clampInt(v, min, max, fallback) { const n = Number(v); return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : fallback; }
function stripHtml(s = '') { return s.replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim(); }
function cleanMeta(s = '') { return stripHtml(String(s)); }
function slug(s='') { return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60); }
function encodePath(p='') { return p.split('/').map(encodeURIComponent).join('/'); }
