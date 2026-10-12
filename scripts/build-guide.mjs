// Generate the offline guides from the same sources readers see on GitHub.
import {readFile, writeFile} from 'node:fs/promises';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const context = {module: {exports: {}}, exports: {}, atob, btoa};
vm.runInNewContext(await readFile(new URL('public/vendor/markdown-it/markdown-it.umd.min.js', root), 'utf8'), context);
const md = context.module.exports({html: true, linkify: false});
const chapters = ['start', 'setup', 'tour', 'draw', 'document', 'math', 'export', 'backup', 'mobile', 'troubleshooting', 'development', 'credits'];
for (const he of [false, true]) {
  const source = await readFile(new URL(he ? 'README.he.md' : 'README.md', root), 'utf8');
  const tokens = md.parse(source, {});
  const titles = tokens.filter((t, i) => t.type === 'heading_open' && t.tag === 'h2' && tokens[i + 1].content.match(/^\d+\./)).map(t => tokens[tokens.indexOf(t) + 1].content);
  if (titles.length !== chapters.length) throw Error('Guide chapter count changed; update the chapter map.');
  let chapter = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'html_block' && /^<a id="/.test(token.content)) token.content = '';
    if (token.type === 'heading_open' && token.tag === 'h2' && /^\d+\./.test(tokens[i + 1].content)) token.attrSet('id', chapters[chapter++]);

  }
  const rewriteLinks = list => {
    for (const token of list) {
      if (token.type === 'link_open') {
        const href = token.attrGet('href');
        if (href === 'README.md') token.attrSet('href', 'guide.html');
        if (href === 'README.he.md') token.attrSet('href', 'guide.he.html');
        if (href?.startsWith('public/')) {
          token.attrSet('href', href.slice(7));
          token.attrSet('download', '');
        }
      }
      if (token.children) rewriteLinks(token.children);
    }
  };
  rewriteLinks(tokens);
  // The sidebar supplies the contents; avoid repeating it in the article.
  const contents = tokens.findIndex((t, i) => t.type === 'heading_open' && t.tag === 'h2' && !/^\d+\./.test(tokens[i + 1].content));
  const first = tokens.findIndex(t => t.type === 'heading_open' && t.attrGet('id') === 'start');
  tokens.splice(contents, first - contents);
  const title = he ? 'המדריך לכתב היד שלך' : 'A guide to your handwriting';
  const toc = chapters.map((id, i) => `<a href="#${id}">${md.utils.escapeHtml(titles[i])}</a>`).join('');
  await writeFile(new URL(he ? 'public/guide.he.html' : 'public/guide.html', root), `<!doctype html>
<html lang="${he ? 'he' : 'en'}" dir="${he ? 'rtl' : 'ltr'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${he ? 'המדריך המלא לדיו: מהפעלה וציור אותיות ועד מסמכים, פונטים וגיבוי.' : 'The complete Dyo guide: setup, drawing, handwritten documents, fonts, and backups.'}"><title>${title} — Dyo</title><link rel="stylesheet" href="guide.css"></head>
<body><a class="skip" href="#content">${he ? 'דילוג למדריך' : 'Skip to guide'}</a>
<header><a class="logo" href="./"><b>${he ? 'דיו' : 'Dyo'}</b><span>${he ? 'המדריך למשתמש' : 'The user guide'}</span></a><div class="header-actions"><nav aria-label="${he ? 'שפת המדריך' : 'Guide language'}"><a href="guide.html" lang="en" ${he ? '' : 'aria-current="page"'}>English</a><a href="guide.he.html" lang="he" ${he ? 'aria-current="page"' : ''}>עברית</a></nav><a class="studio-link" href="./">${he ? 'פתיחת הסטודיו' : 'Open the studio'} ↗</a></div></header>
<div class="guide-layout"><aside><details open><summary>${he ? 'תוכן עניינים' : 'Contents'}</summary><nav aria-label="${he ? 'פרקי המדריך' : 'Guide chapters'}">${toc}</nav></details><p>${he ? 'בקצב שלכם. אפשר להתחיל בקטן ולחזור לכל פרק כשצריך.' : 'At your own pace. Start small and return to any chapter when you need it.'}</p></aside>
<main id="content" tabindex="-1"><div class="guide-eyebrow">${he ? 'מציירים · כותבים · שומרים' : 'DRAW · WRITE · KEEP'}</div><article>${md.renderer.render(tokens, md.options, {})}</article><a class="back-top" href="#">${he ? 'חזרה למעלה' : 'Back to top'} ↑</a></main></div>
<footer>${he ? 'האותיות שלכם. המסמכים שלכם. נשמרים מקומית.' : 'Your letters. Your documents. Kept locally.'}</footer>
<script>document.querySelectorAll('.header-actions nav a').forEach(a=>a.addEventListener('click',()=>{a.hash=location.hash}));</script></body></html>\n`);
}
console.log('Built English and Hebrew guides.');
