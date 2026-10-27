"""LHB-57: la prueba de que las pruebas nuevas pueden fallar. Cada mutación rompe una línea de lo que se entrega,
corre `node --test test/site.test.js` y debe dar al menos una prueba en rojo. Al final todo se restaura byte por byte.
Uso: python evidence/lhb-57-mutations.py  (desde la raíz del repositorio); con --check solo comprueba que cada texto a mutar aparece una vez."""
import os, re, subprocess, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

sys.stdout.reconfigure(encoding='utf-8')

def run():
    p = subprocess.run(['node', '--test', '--test-timeout=60000', 'test/site.test.js'], cwd=R, capture_output=True, text=True, encoding='utf-8')
    # una prueba que se cuelga hasta el tiempo límite sale como cancelled, no como fail: cuenta como roja
    fail = int(re.search(r'^ℹ fail (\d+)', p.stdout, re.M).group(1)) + int(re.search(r'^ℹ cancelled (\d+)', p.stdout, re.M).group(1))
    names = sorted(set(re.findall(r'^✖ (.+?) \(\d', p.stdout, re.M)))
    return fail, names

LIB = 'functions/_lib/people.js'
API = 'functions/api/people.js'
HO = 'site/hoja.js'
PROF = 'functions/_lib/profile.js'

# (nombre, archivo, texto exacto que existe una vez, texto que lo reemplaza, [otro texto, su reemplazo]...)
MUTS = [
    ('P1 consulta: los perfiles ocultos salen en la busqueda', LIB, "WHERE hidden = 0 AND user_id <> ?1", "WHERE user_id <> ?1"),
    ('P2 consulta: quien busca se encuentra a si mismo', LIB, "user_id <> ?1 AND handle > ?2", "handle > ?2"),
    ('P3 consulta: el cursor no se usa y la segunda pagina repite la primera', LIB, "AND handle > ?2 AND", "AND ?2 = ?2 AND"),
    ('P4 esqueleto: % _ y \\ del texto valen como comodines', LIB, "out += /[\\\\%_]/.test(c) ? '\\\\' + c : c;", 'out += c;'),
    ('P5 esqueleto: busca en cualquier parte del texto y no solo desde el principio', LIB, "return wild ? out : out + '%';", "return '%' + out + '%';"),
    ('P24 esqueleto: las letras fuera del ASCII se piden tal cual y no como comodin', LIB, "if (c.codePointAt(0) > 127) { if (!wild) out += '%'; wild = true; continue; }", 'if (c.codePointAt(0) > 127) { out += c; continue; }'),
    ('P25 esqueleto: se usa todo lo escrito y no solo la primera palabra', LIB, "for (const c of q.split(' ')[0]) {", 'for (const c of q) {'),
    ('P6 consulta: no se busca por el @', LIB, "(handle LIKE ?3 ESCAPE '\\\\' OR first_name", '(first_name'),
    ('P7 consulta: no se busca por el nombre', LIB, " OR first_name LIKE ?3 ESCAPE '\\\\' OR last_name", ' OR last_name'),
    ('P8 consulta: no se busca por el apellido', LIB, " OR last_name LIKE ?3 ESCAPE '\\\\')", ')'),
    ('P9 busqueda: no se comprueba nombre y apellido juntos', LIB, "r.first_name && r.last_name ? r.first_name + ' ' + r.last_name : null]", 'null]'),
    ('P10 consulta: el orden va de la Z a la A', LIB, "ORDER BY handle ASC LIMIT ", "ORDER BY handle DESC LIMIT "),
    ('P12 pagina: la pagina es de otro tamano', LIB, "export const PAGE = 20;", "export const PAGE = 5;"),
    ('P11 pagina: se pide una fila menos y nunca hay siguiente', LIB, 'const more = found.length > PAGE;', 'const more = false;'),
    ('P13 pagina: el siguiente sale aunque no haya mas', LIB, 'next: more ? page[page.length - 1].handle : cut ? last : null', 'next: page.length ? page[page.length - 1].handle : null'),
    ('P14 privacidad: salen datos privados (fecha de nacimiento, genero, apellido)', LIB, "'SELECT handle, first_name, last_name, avatar_key FROM profiles '", "'SELECT * FROM profiles '", 'people: page.map(r => ({ handle: r.handle, display_name: r.first_name && r.last_name ? publicName(r.first_name, r.last_name) : null, avatar_key: r.avatar_key })),', 'people: page,'),
    ('P15 consulta: una letra basta', LIB, "if (n < QMIN) return { error: 'q-short' };", ""),
    ('P16 consulta: sin tope de largo', LIB, "if (n > QMAX) return { error: 'q-long' };", ""),
    ('P17 consulta: se aceptan caracteres de control', LIB, "if (CONTROL.test(q)) return { error: 'q-invalid' };", ""),
    ('P18 consulta: el @ de entrada se busca como letra', LIB, ".replace(/^@/, '')", ""),
    ('P19 consulta: los espacios dobles no se juntan', LIB, ".replace(/\\s+/g, ' ')", ""),
    ('P20 consulta: cualquier cursor vale', LIB, "&& !(typeof rawCursor === 'string' && CURSOR.test(rawCursor))", "&& false"),
    ('P21 consulta: no se recorta el texto de los lados', LIB, "rawQ.normalize('NFC').trim().replace", "rawQ.normalize('NFC').replace"),
    ('P22 nombre publico: sale el display_name guardado de antes (con el apellido entero)', LIB, "'SELECT handle, first_name, last_name, avatar_key FROM profiles '", "'SELECT handle, display_name, first_name, last_name, avatar_key FROM profiles '", 'display_name: r.first_name && r.last_name ? publicName(r.first_name, r.last_name) : null', 'display_name: r.display_name'),
    ('P23 nombre publico: sale el apellido entero', LIB, 'publicName(r.first_name, r.last_name)', "r.first_name + ' ' + r.last_name"),
    ('P27 busqueda: no se comprueba todo lo escrito, basta la primera palabra', LIB, ".some(s => s != null && s.normalize('NFC').toLowerCase().startsWith(ql));", '.some(s => s != null);'),
    ('P28 busqueda: sin tope de revision por llamada', LIB, 'if (scanned >= SCANMAX) { cut = true; break; }', ''),
    ('P30 busqueda: lo escrito con acento suelto no se junta', LIB, "rawQ.normalize('NFC').trim()", 'rawQ.trim()'),
    ('P31 consulta: un @ seguido de un espacio sube la consulta a dos letras', LIB, ".replace(/^@/, '').trim().replace(", ".replace(/^@/, '').replace("),
    ('P32 nombres: se guardan como llegaron (e y un acento suelto)', PROF, "const t = v.normalize('NFC').trim();", 'const t = v.trim();'),
    ('A1 api: buscar no pide sesion ni perfil', API, "const g = await requireProfile(request, env);", "const g = { user: { sub: '' } };"),
    ('A2 api: una consulta mala no da 400', API, "  if (p.error) return json({ error: p.error }, 400);\n", ""),
    ('A3 api: la busqueda no sabe quien busca', API, "searchPeople(env.DB, g.user.sub, p)", "searchPeople(env.DB, '', p)"),
    ('H1 pantalla: la pestana Personas no esta en el submenu', HO, "['personas','Personas'],", ""),
    ('H2 pantalla: la ruta no abre Personas', HO, ",personas:vPersonas}[sub]", "}[sub]"),
    ('H3 pantalla: se busca con una sola letra', HO, "const PQ_MIN=2;", "const PQ_MIN=1;"),
    ('H4 pantalla: una respuesta vieja pinta encima de la nueva', HO, "if($('#psF')!==form||mine!==seq)return;", ""),
    ('H5 pantalla: el @ y los espacios sobrantes viajan en la consulta', HO, ".trim().replace(/^@/,'').replace(/\\s+/g,' ');\nconst pqOk", ";\nconst pqOk"),
    ('H6 pantalla: Ver mas no manda el cursor', HO, "(more&&next?'&cursor='+encodeURIComponent(next):'')", "''"),
    ('H7 pantalla: Ver mas reemplaza en vez de agregar', HO, "if(!more){next=null;$('#psL').innerHTML=''}", "next=null;$('#psL').innerHTML='';"),
    ('H8 pantalla: la busqueda no espera a que se deje de escribir', HO, "timer=setTimeout(()=>run(false),350)", "run(false)"),
    ('H9 pantalla: la foto de cualquier sitio se carga', HO, "p.avatar_key.startsWith(CLERK_IMG_URL)?p.avatar_key:''", "p.avatar_key:''"),
    ('H10 pantalla: el nombre no se escapa', HO, "<b>${esc(nm)}</b>", "<b>${nm}</b>"),
    ('H11 pantalla: un error de red se queda con el mensaje de buscando', HO, "r={status:0,body:{}}}", "throw x}"),
    ('H13 pantalla: escribir no descarta la respuesta que iba en camino', HO, 'clearTimeout(timer);seq++;next=null;', 'clearTimeout(timer);next=null;'),
    ('H14 pantalla: escribir no suelta el cursor de la busqueda anterior', HO, 'clearTimeout(timer);seq++;next=null;', 'clearTimeout(timer);seq++;'),
    ('H15 pantalla: el temporizador de una pantalla ya cerrada sigue buscando', HO, "const run=async more=>{if($('#psF')!==form)return;const q=", 'const run=async more=>{const q='),
    ('H16 pantalla: sin nadie en la tanda y con mas por revisar dice que no hay nadie', HO, "say(n||next?'':'No encontramos a nadie con ese nombre.')", "say(n?'':'No encontramos a nadie con ese nombre.')"),
    ('H12 cache: el shell se publica con la version de antes', 'site/sw.js', "const VERSION='lhb-v57';", "const VERSION='lhb-v55';"),
]

def load(rel):
    p = os.path.join(R, *rel.split('/'))
    orig = open(p, 'rb').read()
    text = orig.decode('utf-8')
    return p, orig, '\r\n' in text, text.replace('\r\n', '\n')

def main():
    if '--check' in sys.argv:
        bad = 0
        for name, rel, a, b, *more in MUTS:
            t = load(rel)[3]
            for x in [a] + more[0::2]:
                n = t.count(x)
                if n != 1: bad += 1; print(name, '-> aparece', n, 'veces')
        print('mutaciones:', len(MUTS), 'con anclaje malo:', bad)
        return 1 if bad else 0
    base = run()
    print('baseline', base)
    assert base[0] == 0, 'la línea base debe estar en verde'
    bad = 0
    only = [x for x in sys.argv[1:] if not x.startswith('--')]  # p. ej. C6 C7 S8: solo esas mutaciones
    for name, rel, a, b, *more in MUTS:
        if only and name.split()[0] not in only: continue
        p, orig, crlf, t = load(rel)
        if t.count(a) != 1:
            print(name, '-> ERROR: el texto a mutar aparece', t.count(a), 'veces'); bad += 1; continue
        m = t.replace(a, b, 1)
        for a2, b2 in zip(more[0::2], more[1::2]):
            assert m.count(a2) == 1, (name, a2)
            m = m.replace(a2, b2, 1)
        open(p, 'wb').write((m.replace('\n', '\r\n') if crlf else m).encode('utf-8'))
        try:
            fail, names = run()
        finally:
            open(p, 'wb').write(orig)
        verdict = 'ROJO (bien)' if fail > 0 else 'SOBREVIVIÓ'
        if fail == 0: bad += 1
        print(name, '->', verdict, 'fail=%d' % fail)
        for n in names[:4]: print('     ', n[:150])
    final = run()
    print('restaurado', final)
    print('mutaciones:', len(MUTS), 'sobrevivieron o con error:', bad)
    return 0 if bad == 0 and final[0] == 0 else 1

if __name__ == '__main__':
    sys.exit(main())
