export const prerender = true;

export function GET() {
	const urls = [
		{ loc: '/', priority: '1.0', changefreq: 'weekly' },
		{ loc: '/play', priority: '0.9', changefreq: 'weekly' },
		{ loc: '/hub', priority: '0.8', changefreq: 'weekly' },
		{ loc: '/help', priority: '0.7', changefreq: 'monthly' },
		{ loc: '/privacy', priority: '0.5', changefreq: 'monthly' },
		{ loc: '/imprint', priority: '0.4', changefreq: 'monthly' },
	];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.map(u => `  <url>
    <loc>https://geocoretd.app${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
		},
	});
}
