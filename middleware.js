// Vercel Edge Middleware — sends first-time visitors of "/" to their language.
// Manual choice always wins: the switcher stores a jl_lang cookie that is honoured here.
export const config = { matcher: '/' };

const LOC = ['es','de','fr','pt','it','nl','pl','tr','ru','ja','ko','zh','ar','hi','id'];

const BY_COUNTRY = {
  ES:'es', MX:'es', AR:'es', CO:'es', CL:'es', PE:'es', VE:'es', EC:'es', GT:'es', CU:'es', BO:'es', DO:'es', UY:'es', PY:'es', CR:'es', PA:'es',
  DE:'de', AT:'de', CH:'de', LI:'de',
  FR:'fr', BE:'fr', LU:'fr', MC:'fr', SN:'fr', CI:'fr', CM:'fr',
  BR:'pt', PT:'pt', AO:'pt', MZ:'pt',
  IT:'it', SM:'it', VA:'it',
  NL:'nl', SR:'nl',
  PL:'pl', TR:'tr',
  RU:'ru', BY:'ru', KZ:'ru', KG:'ru', UZ:'ru', AM:'ru', AZ:'ru', MD:'ru',
  JP:'ja', KR:'ko',
  CN:'zh', TW:'zh', HK:'zh', MO:'zh', SG:'zh',
  SA:'ar', AE:'ar', EG:'ar', MA:'ar', DZ:'ar', TN:'ar', IQ:'ar', JO:'ar', KW:'ar', QA:'ar', OM:'ar', BH:'ar', LB:'ar', LY:'ar', YE:'ar', SD:'ar',
  IN:'hi', ID:'id'
};

const ALIAS = { 'pt-br':'pt', 'pt-pt':'pt', 'zh-cn':'zh', 'zh-hans':'zh', 'zh-sg':'zh', 'zh-tw':'zh', 'zh-hant':'zh', 'zh-hk':'zh' };

function fromAcceptLanguage(header) {
  if (!header) return null;
  const tags = header.split(',').map(part => {
    const [tag, q] = part.trim().split(';q=');
    return { tag: tag.toLowerCase(), q: q ? parseFloat(q) : 1 };
  }).sort((a, b) => b.q - a.q);
  for (const { tag } of tags) {
    if (tag === '*') continue;
    const base = tag.split('-')[0];
    const hit = ALIAS[tag] || ALIAS[base] || (LOC.includes(base) ? base : null);
    if (hit) return hit;
    if (base === 'en') return 'en';
  }
  return null;
}

export default function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  if (/bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|whatsapp|telegrambot|preview/i.test(ua)) return;

  const cookie = request.headers.get('cookie') || '';
  const saved = (cookie.match(/(?:^|;\s*)jl_lang=([a-z-]+)/i) || [])[1];
  if (saved) {
    if (saved === 'en' || !LOC.includes(saved)) return;
    return Response.redirect(new URL('/' + saved + '/', request.url), 307);
  }

  const country = request.headers.get('x-vercel-ip-country');
  const target = fromAcceptLanguage(request.headers.get('accept-language'))
    || (country ? BY_COUNTRY[country.toUpperCase()] : null);

  if (!target || target === 'en' || !LOC.includes(target)) return;
  return Response.redirect(new URL('/' + target + '/', request.url), 307);
}
