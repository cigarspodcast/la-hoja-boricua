"""LHB-111 proof, on a scratch copy of the worktree: each mutant brings back one piece of art from outside the line-art set, and the
LHB-111 test must turn red. The copy is restored after each.
usage: python evidence/lhb-111-mutations.py WORKTREE SCRATCH"""
import os, re, shutil, subprocess, sys

WT, D = sys.argv[1], sys.argv[2]
if os.path.exists(D):
    shutil.rmtree(D)
shutil.copytree(WT, D, ignore=shutil.ignore_patterns('.git', 'node_modules', 'evidence'))
PAT = 'LHB-111'
MUTS = [
    ('site/hoja.js', 'a header with a drawing outside the set', "VBArt.banda())}", "VBArt.leaf('#8fd162'))}"),
    ('site/app.js', 'a photo-less cigar card without the silhouette', ':`<div class="ph sin-foto" ${c.foto?`data-photo="${esc(c.foto)}"`:\'\'}>${cigarSVG(c)}</div>`', ':`<div class="ph sin-foto" ${c.foto?`data-photo="${esc(c.foto)}"`:\'\'}>${VBArt.leaf(\'#8fd162\')}</div>`'),
    ('site/hoja.js', 'the humidor without the silhouette', "${VBArt.silueta('')}</span>`}", "${VBArt.leaf('#a9c487')}</span>`}"),
    ('site/app.js', 'a decorative bitmap back in a view', "${cigarSVG(c)}</div>`)(fotoOf(c))}", "${cigarSVG(c)}<img src=\"img/guagua/guagua_recorte.webp\" alt=\"\"></div>`)(fotoOf(c))}"),
    ('site/art.js', 'a drawing with its own colour', '<circle class="ac" cx="98" cy="22" r="8"/>', '<circle fill="#ffd25a" cx="98" cy="22" r="8"/>'),
    ('site/art.js', 'a drawing without its accent', '<rect class="ac" x="42" y="54" width="36" height="6" rx="3"/>', '<rect x="42" y="54" width="36" height="6" rx="3"/>'),
    ('site/styles.css', 'the empty state with a different drawing', "M36 68H64V80H36Z", "M36 68H64V82H36Z"),
    ('site/app.js', 'Codex r1: a coloured SVG in the header helper', '<div class="sec-art">${art}</div></header>`;', '<div class="sec-art">${art}<svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="#e33"/></svg></div></header>`;'),
    ('site/404.html', 'Codex r1: a decorative SVG on a static page', '</body>', '<svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="#e33"/></svg></body>'),
    ('site/styles.css', 'Codex r1: a bitmap through CSS', '.lart{', '.hero::after{background:url(img/hero/banner.webp)}.lart{'),
    ('site/styles.css', 'Codex r1: the accent not painted', '.lart .ac{fill:var(--art-ac)}', '.lart .ac{}'),
    ('site/styles.css', 'Codex r1: the empty state without its accent', 'background:radial-gradient(7px 4.9px at 50.4px 22.4px,var(--warm) 100%,var(--on-surface) 100%);', 'background:var(--on-surface);'),
    ('site/404.html', 'Codex r2: a coloured SVG with an icon viewBox on a static page', '</body>', '<svg style="width:200px;height:200px" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="red"/><circle cx="12" cy="12" r="5" fill="blue"/></svg></body>'),
    ('site/u.css', 'Codex r2: an SVG background through u.css', ':root{', 'body{background:url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22%3E%3Ccircle r=%2250%22 fill=%22red%22/%3E%3C/svg%3E")}:root{'),
    ('site/hoja.js', 'Codex r2: a coloured SVG with an icon viewBox in a template', 'const CAL_ICO=', 'const CAL_X=`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#e33"/></svg>`;const CAL_ICO='),
    ('site/404.html', 'Codex r3: a sized SVG with single-quoted colours and an icon viewBox on a static page', '</body>', '<svg width="200" height="200" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill=\'red\'/><circle cx="12" cy="12" r="5" fill=\'blue\'/></svg></body>'),
    ('site/hoja.js', 'Codex r3: an unquoted colour in an icon-shaped SVG in a template', 'const CAL_ICO=', 'const CAL_X=`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill=red /></svg>`;const CAL_ICO='),
    ('site/app.js', 'Codex r3: an icon-shaped SVG with a size of its own in the header helper', '<div class="sec-art">${art}</div></header>`;', '<div class="sec-art">${art}<svg width="240" height="240" viewBox="0 0 24 24"><path d="M2 2h20v20H2z"/></svg></div></header>`;'),
    ('site/404.html', 'Codex r4: a single-quoted SVG data URI image on a static page', '</body>', '<img alt="" src=\'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3Ccircle cx="50" cy="50" r="40" fill="red"/%3E%3C/svg%3E\'></body>'),
    ('site/404.html', 'Codex r4: an unquoted decorative image on a static page', '</body>', '<img alt="" src=../img/guagua/campo.webp></body>'),
    ('site/404.html', 'Codex r4: a decorative image through picture and source srcset', '</body>', '<picture><source srcset="img/guagua/campo.webp 1x"><img alt="" src="icons/icon.svg"></picture></body>'),
    ('site/hoja.js', 'Codex r4: a single-quoted decorative image in a template', 'const CAL_ICO=', 'const CAL_X=`<img alt="" src=\'img/guagua/campo.webp\'>`;const CAL_ICO='),
    ('site/app.js', 'Codex r4: a decorative bitmap set from script', 'const thumbS=', 'const LHB_X=()=>{const i=new Image();i.src=\'img/guagua/campo.webp\';return i};const thumbS='),
    ('site/hoja.js', 'Codex r4: a decorative image inside an attribute that comes and goes', 'const CAL_ICO=', 'const CAL_X=x=>`<span ${x?\'data-bg="img/guagua/campo.webp"\':\'\'}></span>`;const CAL_ICO='),
    ('site/app.js', 'Codex r4: a second image data URI in a script', 'const thumbS=', 'const LHB_X=\'data:image/png;base64,iVBORw0KGgo=\';const thumbS='),
    ('site/404.html', 'Codex r5: an inline script that draws a data URI image on a static page', '</body>', '<script>const decoration=new Image();decoration.alt=\'\';decoration.src=\'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Ccircle cx="50" cy="50" r="40" fill="red"/%3E%3C/svg%3E\';document.body.append(decoration);</script></body>'),
    ('site/404.html', 'Codex r5: a decorative background set by a handler attribute', '<body', '<body onload="document.body.style.backgroundImage=\'url(img/adorno.webp)\'"'),
    ('site/sync.js', 'Codex r5: a decorative image named in a script outside the five', '/* La Hoja Boricua · Mi Hoja entre teléfonos', "const LHB_X='img/adorno.webp';/* La Hoja Boricua · Mi Hoja entre teléfonos"),
    ('site/app.js', 'Codex r5: a decorative image set with setAttribute', 'const thumbS=', 'const LHB_X=i=>i.setAttribute(\'src\',\'img/adorno.webp\');const thumbS='),
    ('site/sync.js', 'Codex r6: a decorative SVG inserted by a script outside the five', '/* La Hoja Boricua · Mi Hoja entre teléfonos', "document.body&&document.body.insertAdjacentHTML('beforeend','<svg width=\"200\" height=\"200\" viewBox=\"0 0 50 50\" aria-hidden=\"true\"><circle cx=\"25\" cy=\"25\" r=\"20\" fill=\"red\"/></svg>');/* La Hoja Boricua · Mi Hoja entre teléfonos"),
    ('site/sync.js', 'Codex r6: an SVG made through the DOM', '/* La Hoja Boricua · Mi Hoja entre teléfonos', "const LHB_X=()=>document.createElementNS('http://www.w3.org/2000/svg','svg');/* La Hoja Boricua · Mi Hoja entre teléfonos"),
    ('site/cuenta.js', 'Codex r6: a decorative canvas drawing', '/* La Hoja Boricua · cuenta (LHB-25)', "const LHB_X=()=>{const c=document.createElement('canvas').getContext('2d');c.fillStyle='red';c.fillRect(0,0,9,9)};/* La Hoja Boricua · cuenta (LHB-25)"),
    ('site/404.html', 'Codex r7: a canvas drawing in an inline script on a static page', '</body>', '<canvas id="decoration" width="200" height="200" aria-hidden="true"></canvas><script>const ink=document.getElementById(\'decoration\').getContext(\'2d\');ink.fillStyle=\'red\';ink.beginPath();ink.arc(100,100,80,0,Math.PI*2);ink.fill();</script></body>'),
    ('site/404.html', 'Codex r7: an SVG made through the DOM in an inline script on a static page', '</body>', '<script>const s=document.createElementNS(\'http://www.w3.org/2000/svg\',\'svg\');s.setAttribute(\'viewBox\',\'0 0 50 50\');s.innerHTML=\'<circle cx="25" cy="25" r="20" fill="red"/>\';document.body.append(s);</script></body>'),
    ('site/art.js', 'Codex r8: a drawing of the set with an inline single-quoted style', '<circle class="ac" cx="98" cy="22" r="8"/>', '<circle class="ac" style=\'fill:red;stroke:blue\' cx="98" cy="22" r="8"/>'),
    ('site/404.html', 'Codex r8: an uppercase SVG on a static page', '</body>', '<SVG width="200" height="200" viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="20" fill="red"/></SVG></body>'),
    ('site/404.html', 'Codex r8: an SVG left unclosed on a static page', '</body>', '<svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="red"/></body>'),
    ('site/hoja.js', 'Codex r8: an uppercase SVG in a template', 'const CAL_ICO=', 'const CAL_X=`<SVG viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="red"/></SVG>`;const CAL_ICO='),
    ('site/404.html', 'Codex r9: a new linked stylesheet (the file is added by the next control)', '</head>', '<link rel="stylesheet" href="/decoration.css"></head>'),
    ('site/lugares/l.css', 'Codex r9: an @import of another stylesheet', ':root', '@import url("/decoration.css");:root'),
    ('site/styles.css', 'Codex r9: an image drawn by image-set', '.lart{', '.hero::before{background:image-set("img/hero/banner.webp" 1x)}.lart{'),
    ('functions/u/[handle].js', 'Codex r9: a coloured SVG on the passport page made in functions', '<main>', '<main><svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="red"/></svg>'),
    ('site/u.css', 'Codex r10: an uppercase URL( with an SVG decoration', ':root{', 'main::after{content:"";display:block;width:200px;height:200px;background:URL("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 50 50\'%3E%3Ccircle cx=\'25\' cy=\'25\' r=\'20\' fill=\'red\'/%3E%3C/svg%3E")}:root{'),
    ('site/404.html', 'Codex r10: an image-set() in an inline style block', '</head>', '<style>main::after{content:"";display:block;width:200px;height:200px;background:image-set("/img/hero/banner.webp" 1x)}</style></head>'),
    ('site/404.html', 'Codex r10: an image in a single-quoted style attribute', '<body', '<body style=\'background:Url("/img/hero/banner.webp")\''),
    ('site/styles.css', 'Codex r10: a CSS escape that spells url', '.lart{', '.hero::before{background:u\\72 l("img/hero/banner.webp")}.lart{'),
    ('site/app.js', 'Codex r11: a style block with a bitmap in the header helper', '<div class="sec-art">${art}</div></header>`;', '<div class="sec-art">${art}<style>.sec-art{background:url("/img/hero/banner.webp") center/cover}</style></div></header>`;'),
    ('site/hoja.js', 'Codex r11: a bitmap set through element.style', 'const CAL_ICO=', 'const CAL_X=e=>{e.style.backgroundImage="URL(img/hero/banner.webp)"};const CAL_ICO='),
    ('site/app.js', 'Codex r11: an image-set in a style attribute of a template', 'const thumbS=', 'const LHB_X=x=>`<b style="background:Image-Set(${x} 1x)"></b>`;const thumbS='),
    ('site/app.js', 'Codex r12: an unquoted style attribute with an escaped url in the header helper', '<div class="sec-art">${art}</div></header>`;', '<div class="sec-art">${art}<span style=background:u\\\\72l(/img/hero/banner.webp);display:block;width:92px;height:92px></span></div></header>`;'),
    ('site/hoja.js', 'Codex r12: an escaped url set through element.style', 'const CAL_ICO=', 'const CAL_X=e=>{e.style.background="u\\\\72 l(img/hero/banner.webp)"};const CAL_ICO='),
    ('site/hoja.js', 'Codex r12: a JavaScript escape that spells url through element.style', 'const CAL_ICO=', 'const CAL_X=e=>{e.style.background="\\u0075rl(img/hero/banner.webp)"};const CAL_ICO='),
    ('site/i18n.js', 'Codex r12: an image function in an escaped-quote style attribute of a string', 'style=\\"color:var(--accent-ink)\\">Sube', 'style=\\"color:var(--accent-ink);background:element(#hero)\\">Sube'),
    ('site/app.js', 'Codex r13: an HTML character reference that spells url in a style attribute of the header helper', '<div class="sec-art">${art}</div></header>`;', '<div class="sec-art">${art}<span style="background:u&#114;l(/img/hero/banner.webp);display:block;width:92px;height:92px"></span></div></header>`;'),
    ('site/404.html', 'Codex r13: an HTML character reference that spells url in a style attribute of a static page', '<body', '<body style="background:u&#114;l(/img/hero/banner.webp)"'),
    ('site/app.js', 'Codex r13: a decorative bitmap reached by climbing out of an allowed folder', "${cigarSVG(c)}</div>`)(fotoOf(c))}", "${cigarSVG(c)}<img src=\"img/hero/../guagua/guagua_recorte.webp\" alt=\"\"></div>`)(fotoOf(c))}"),
    ('site/404.html', 'Codex r13: a stylesheet in a data URI with an encoded url', '</head>', '<link rel="stylesheet" href="data:text/css,body%7Bbackground:u%72l(/img/hero/banner.webp)%7D"></head>'),
    ('site/404.html', 'Codex r14: character references in a stylesheet link', '</head>', '<link rel="style&#115;heet" href="data&#58;text/css,body%7Bbackground:u%72l(/img/hero/banner.webp)%7D"></head>'),
    ('site/hoja.js', 'Codex r14: a stylesheet link made by a script with an escaped name', 'const CAL_ICO=', "const CAL_X=()=>{const l=document.createElement('link');l.rel='stylesheet';l.href='deco\\x2ecss';document.head.append(l)};const CAL_ICO="),
    ('site/404.html', 'Codex r15: a coloured drawing in a frame document (srcdoc) on a static page', '</body>', '<iframe title="Decoration" srcdoc="&lt;svg width=\'200\' height=\'200\' viewBox=\'0 0 100 100\'&gt;&lt;circle cx=\'50\' cy=\'50\' r=\'45\' fill=\'red\'/&gt;&lt;/svg&gt;"></iframe></body>'),
    ('site/hoja.js', 'Codex r15: a coloured drawing whose tag is written through a JavaScript escape', 'const CAL_ICO=', 'const CAL_X=`\\x3csvg viewBox="0 0 50 50"><circle cx="25" cy="25" r="20" fill="#e33"/></svg>`;const CAL_ICO='),
    ('site/hoja.js', 'Codex r15: a frame document set by a script', 'const CAL_ICO=', "const CAL_X=f=>{f.srcdoc='<svg viewBox=\"0 0 50 50\"></svg>'};const CAL_ICO="),
    ('site/404.html', 'Codex r16: an icon-shaped SVG coloured by an animation on a static page', '</body>', '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11"><set attributeName="fill" to="red"/></circle></svg></body>'),
    ('site/art.js', 'Codex r16: a drawing whose accent is coloured by an animation', '<circle class="ac" cx="98" cy="22" r="8"/>', '<circle class="ac" cx="98" cy="22" r="8"><set attributeName="fill" to="red"/></circle>'),
    ('site/hoja.js', 'Codex r16: a script that paints an SVG', 'const CAL_ICO=', "const CAL_X=e=>{e.setAttribute('fill','red')};const CAL_ICO="),
    ('site/styles.css', 'Codex r16: an animation inside the empty-state SVG data URI', "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 100'", "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 100'%3E%3Canimate attributeName='opacity' values='0;1' dur='1s'/%3E%3Cg"),
    ('site/404.html', 'Codex r17: a drawing painted through cssText by a script on a static page', '</body>', '<svg viewBox="0 0 24 24"><circle id="deco" cx="12" cy="12" r="11"/></svg><script>document.getElementById("deco").style.cssText="fill:red";</script></body>'),
    ('site/hoja.js', 'Codex r17: a drawing painted through Object.assign on its style', 'const CAL_ICO=', "const CAL_X=e=>{Object.assign(e.style,{fill:'#e33'})};const CAL_ICO="),
    ('site/404.html', 'Codex r18: an icon tinted red through its color by a script on a static page', '</body>', '<svg viewBox="0 0 24 24"><circle id="deco" cx="12" cy="12" r="11" fill="currentColor"/></svg><script>document.getElementById("deco").style.setProperty("color","red");</script></body>'),
    ('site/hoja.js', 'Codex r18: a drawing tinted by a filter set by a script', 'const CAL_ICO=', 'const CAL_X=e=>{e.style.filter="hue-rotate(140deg) saturate(4)"};const CAL_ICO='),
    ('site/app.js', 'Codex r18: the accent of the set rewritten in the header helper', '<div class="sec-art">${art}</div></header>`;', '<div class="sec-art" style="--art-ac:#e33">${art}</div></header>`;'),
    ('site/hoja.js', 'Codex r19: a filter set with a space in the member access', 'const CAL_ICO=', "const CAL_X=e=>{e.style .filter='hue-rotate(90deg)'};const CAL_ICO="),
    ('site/hoja.js', 'Codex r19: a colour through a custom property the script makes', 'const CAL_ICO=', "const CAL_X=e=>{e.style.cssText='--deco:red;color:var(--deco)'};const CAL_ICO="),
    ('site/hoja.js', 'Codex r19: a colour set on a style held in a variable', 'const CAL_ICO=', "const CAL_X=e=>{const s=e.style;s.color='red'};const CAL_ICO="),
    ('site/app.js', 'Codex r19: a colour taken from data in the header helper', '<div class="sec-art">${art}</div></header>`;', '<div class="sec-art" style="color:${tint}">${art}</div></header>`;'),
    ('site/hoja.js', 'Codex r20: a filter written with brackets on a style held in a variable', 'const CAL_ICO=', "const CAL_X=e=>{const s=e.style;s['filter']='hue-rotate(90deg)'};const CAL_ICO="),
    ('site/styles.css', 'Codex r20: a later rule that paints the outlines the colour of their ground', '.lart .ac{fill:var(--art-ac)}', '.lart .ac{fill:var(--art-ac)}.lart{stroke:var(--surface)}'),
    ('site/styles.css', 'Codex r20: the amber behind the accent rewritten under the header', '.lart .ac{fill:var(--art-ac)}', '.lart .ac{fill:var(--art-ac)}.sec-art{--amber:#e33}'),
    ('site/art.js', 'Codex r20: a drawing tinted by a filter attribute', '<circle class="ac" cx="98" cy="22" r="8"/>', '<circle class="ac" cx="98" cy="22" r="8" filter="hue-rotate(140deg)"/>'),
    ('site/styles.css', 'Codex r21: nearly transparent outlines through stroke-opacity', '.lart .ac{fill:var(--art-ac)}', '.lart .ac{fill:var(--art-ac)}.lart{stroke-opacity:.01}'),
    ('site/styles.css', 'Codex r21: the accent rule moved under @media print', '.lart .ac{fill:var(--art-ac)}', '@media print{.lart .ac{fill:var(--art-ac)}}'),
    ('site/styles.css', 'Codex r21: an animation on the header that fades its drawing', '.lart .ac{fill:var(--art-ac)}', '.lart .ac{fill:var(--art-ac)}.sec-head{animation:glo 1s infinite}'),
    ('site/art.js', 'Codex r22: nearly transparent outlines through a stroke-opacity attribute on every drawing', 'aria-hidden="true" focusable="false">${body}</svg>`;', 'aria-hidden="true" focusable="false" stroke-opacity=".01">${body}</svg>`;'),
    ('site/app.js', 'Codex r22: the header drawing made nearly transparent by an inline style', '<div class="sec-art">${art}</div></header>`;', '<div class="sec-art" style="opacity:.01">${art}</div></header>`;'),
    ('site/hoja.js', 'Codex r22: a drawing faded by a script', 'const CAL_ICO=', 'const CAL_X=e=>{e.style.opacity=.01};const CAL_ICO='),
    ('site/404.html', 'Codex r22: an icon with a stroke too thin to see on a static page', '</body>', '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width=".01" d="M4 12h16"/></svg></body>'),
    ('site/styles.css', 'Codex r23: the empty-state mask drawing made nearly transparent inside its data URI', "stroke-linejoin='round'%3E", "stroke-linejoin='round' opacity='.01'%3E"),
    ('site/styles.css', 'Codex r23: the grain texture changed inside its data URI', 'numOctaves=%22', 'numOctaves=%229%22 data-x=%22'),
    ('site/styles.css', 'Codex r24: a later background that hides the empty-state drawing', '.lart .ac{fill:var(--art-ac)}', '.lart .ac{fill:var(--art-ac)}.empty:before{background:var(--surface)}'),
    ('site/styles.css', 'Codex r24: a later pseudo-element background reached by another selector', '.lart .ac{fill:var(--art-ac)}', '.lart .ac{fill:var(--art-ac)}.view>div:last-child::before{background:var(--surface)}'),
    ('site/styles.css', 'Codex r25: the silhouette frame given the page ground, unreadable at night', '.lart .ac{fill:var(--art-ac)}', '.lart .ac{fill:var(--art-ac)}.card .ph.sin-foto,.detail-ph.sin-foto{background:var(--surface)}'),
    ('site/styles.css', 'Codex r25: the header ground behind the drawing changed', '.lart .ac{fill:var(--art-ac)}', '.lart .ac{fill:var(--art-ac)}.sec-head{background-color:var(--on-surface)}'),
    ('site/app.js', 'Codex r26: the header given the photo ground inline, unreadable at night', '`<header class="sec-head">', '`<header class="sec-head" style="background:var(--photo)">'),
    ('site/hoja.js', 'Codex r26: a ground set by a script', 'const CAL_ICO=', "const CAL_X=e=>{e.style.backgroundColor='#EFEBE2'};const CAL_ICO="),
    ('site/app.js', 'Codex r27: an inline ground hidden behind a comment before its colon', '`<header class="sec-head">', '`<header class="sec-head" style="background/**/:var(--photo)">'),
    ('site/404.html', 'Codex r27: a page ground hidden behind a comment before its colon', '<body', '<body style="background /* x */ :var(--photo)"'),
    ('site/styles.css', 'Codex r28: the accent token registered transparent and not inherited', '.lart .ac{fill:var(--art-ac)}', '.lart .ac{fill:var(--art-ac)}@property --art-ac{syntax:"<color>";inherits:false;initial-value:transparent}'),
    ('site/styles.css', 'Codex r28: a layer that reorders the cascade', '.lart .ac{fill:var(--art-ac)}', '.lart .ac{fill:var(--art-ac)}@layer base{.x{color:inherit}}'),
    ('site/hoja.js', 'Codex r28: the accent token registered by a script', 'const CAL_ICO=', "const CAL_X=()=>CSS.registerProperty({name:'--art-ac',syntax:'<color>',inherits:false,initialValue:'transparent'});const CAL_ICO="),
    ('site/styles.css', 'Codex r29: the accent registration hidden behind the CSS legacy delimiters at the end of the sheet', 'sil,.detail-ph .sil{width:100%;height:auto;aspect-ratio:2/1}', 'sil,.detail-ph .sil{width:100%;height:auto;aspect-ratio:2/1}\n<!--\n@property --art-ac{syntax:"<color>";inherits:false;initial-value:transparent}\n-->'),
    ('site/styles.css', 'Codex r29: an at-rule reached after a selector without a delimiter', '.lart .ac{fill:var(--art-ac)}', '.lart .ac{fill:var(--art-ac)} x @layer base{.y{color:inherit}}'),
    ('site/art.js', 'Codex r30: the share-image silhouette made nearly transparent', '${st}>', '${st}${lit?\' opacity=".01"\':\'\'}>'),
    ('site/art.js', 'Codex r31: the share-image silhouette body filled solid with ink', 'const st=lit?` fill="none" stroke=', 'const st=lit?` fill="${lit.ink}" stroke='),
    ('site/art.js', 'Codex r31: the share-image accent stroked instead of filled', 'ac=lit?` fill="${lit.ac}"`', 'ac=lit?` stroke="${lit.ac}"`'),
    ('site/art.js', 'Codex r32: the share-image silhouette without its SVG namespace', ' xmlns="http://www.w3.org/2000/svg"', ''),
    ('site/art.js', 'Codex r33: the share-image silhouette root with a duplicate namespace attribute', 'const st=lit?` fill="none"', 'const st=lit?` xmlns="http://www.w3.org/2000/svg" fill="none"'),
    ('site/art.js', 'Codex r34: the share-image silhouette shapes taken out of the SVG namespace', '<ellipse cx=', '<ellipse${lit?\' xmlns=""\':\'\'} cx='),
    ('site/art.js', 'Codex r35: the share-image silhouette shapes with uppercase tag names', '<ellipse cx=', '<ELLIPSE cx='),
    ('site/art.js', 'Codex r35b: the share-image silhouette with an uppercase attribute name', '<path d="M96 122', '<path D="M0 0" d="M96 122'),
    ('site/art.js', 'Codex r36: the ranchon accent shrunk to nothing', '<circle class="ac" cx="98" cy="22" r="8"/>', '<circle class="ac" cx="98" cy="22" r="0"/>'),
    ('site/styles.css', 'the silhouette ink that follows the theme on the fixed light frame', '.lart.sil,.lart.aqui{--art-ink:var(--fixed-text)}', '.lart.aqui{--art-ink:var(--fixed-text)}'),
]


NEWFILES = [('site/decoration.css', 'Codex r9: a new stylesheet with an SVG decoration, found by the walk', 'main::after{content:"";display:block;width:200px;height:200px;background:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 50 50\'%3E%3Ccircle cx=\'25\' cy=\'25\' r=\'20\' fill=\'red\'/%3E%3C/svg%3E")}\n')]


def runp():
    r = subprocess.run(['node', '--test', '--test-timeout=60000', '--test-name-pattern=' + PAT, 'test/site.test.js'], cwd=D, capture_output=True, text=True, encoding='utf-8', errors='replace')
    out = r.stdout + r.stderr
    g = lambda k: int((re.search(r'^ℹ ' + k + r' (\d+)', out, re.M) or [0, 0])[1])
    return {'pass': g('pass'), 'fail': g('fail')}


def edit(rel, old, new):
    p = os.path.join(D, rel)
    s = open(p, 'rb').read().decode('utf-8')
    assert s.count(old) >= 1, (rel, old[:80], s.count(old))
    open(p, 'wb').write(s.replace(old, new).encode('utf-8'))


t = runp()
print('baseline (no mutation): pass %d fail %d' % (t['pass'], t['fail']))
assert t['fail'] == 0 and t['pass'] > 0
red = 0
for rel, name, a, b in MUTS:
    edit(rel, a, b)
    t = runp()
    ok = t['fail'] > 0
    red += ok
    print('%-72s %s (fail %d)' % (name, 'RED (caught)' if ok else 'GREEN (survived)', t['fail']))
    shutil.copy(os.path.join(WT, rel), os.path.join(D, rel))
for rel, name, body in NEWFILES:
    p = os.path.join(D, rel)
    open(p, 'w', encoding='utf-8').write(body)
    t = runp()
    ok = t['fail'] > 0
    red += ok
    print('%-72s %s (fail %d)' % (name, 'RED (caught)' if ok else 'GREEN (survived)', t['fail']))
    os.remove(p)
print('RESULT %d of %d red' % (red, len(MUTS) + len(NEWFILES)))
sys.exit(0 if red == len(MUTS) + len(NEWFILES) else 1)
