"""LHB-38: la prueba de que las pruebas nuevas pueden fallar. Cada mutación rompe una línea de lo que se entrega,
corre `node --test test/site.test.js` y debe dar al menos una prueba en rojo. Al final todo se restaura byte por byte.
Uso: python evidence/lhb-38-mutations.py  (desde la raíz del repositorio); con --check solo comprueba que cada texto a mutar aparece una vez."""
import os, re, subprocess, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

sys.stdout.reconfigure(encoding='utf-8')

def run():
    p = subprocess.run(['node', '--test', '--test-timeout=60000', 'test/site.test.js'], cwd=R, capture_output=True, text=True, encoding='utf-8')
    # una prueba que se cuelga hasta el tiempo límite sale como cancelled, no como fail: cuenta como roja
    fail = int(re.search(r'^ℹ fail (\d+)', p.stdout, re.M).group(1)) + int(re.search(r'^ℹ cancelled (\d+)', p.stdout, re.M).group(1))
    names = sorted(set(re.findall(r'^✖ (.+?) \(\d', p.stdout, re.M)))
    return fail, names

HO = 'site/hoja.js'
CS = 'site/styles.css'
SW = 'site/sw.js'

# (nombre, archivo, texto exacto que existe una vez, texto que lo reemplaza, [otro texto, su reemplazo]...)
MUTS = [
    ('M1 defaults: una entrada de antes no recibe foto', HO, "if(typeof e.foto!=='string')e.foto='';\n", ''),
    ('M2 defaults: un publica que no es booleano se queda como llegó', HO, "if(typeof e.publica!=='boolean')e.publica=false;", 'if(e.publica===undefined)e.publica=false;'),
    ('M3 defaults: el día por defecto es hoy y no el de la fecha de la cata', HO, "e.consumido=typeof e.fecha==='string'&&okDay(e.fecha.slice(0,10))?e.fecha.slice(0,10):hoy();", 'e.consumido=hoy();'),
    ('M4 defaults: un día que no existe se acepta', HO, 'if(!okDay(e.consumido))', 'if(!e.consumido)'),
    ('M5 okDay: el 31 de abril pasa por válido', HO, '&&d.getDate()===+v.slice(8,10)};', '};'),
    ('M6 defaults: la marca no se corta a 60', HO, "e.marca=typeof e.marca==='string'?e.marca.trim().slice(0,60):'';", "e.marca=typeof e.marca==='string'?e.marca.trim():'';"),
    ('M7 normalize: no pasa las entradas por los valores por defecto', HO, 'o.diario.forEach(entryDefaults);return o}', 'return o}'),
    ('M8 borrador: nace pública', HO, "foto:'',publica:false,consumido:hoy(),marca:'',inicio", "foto:'',publica:true,consumido:hoy(),marca:'',inicio"),
    ('M9 cata nueva: no suelta la foto del borrador que se deja', HO, 'const old=S().draft;if(old&&old.foto)FOTOS.del(old.foto);', ''),
    ('M10 fotos: otra base que la de app.js', HO, "indexedDB.open('vitola-boricua',1);r.onupgradeneeded=()=>r.result.createObjectStore('fotos');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));\n const tx=(mode,fn)=>open().then(db=>new Promise((res,rej)=>{const t=db.transaction('fotos',mode);const q=fn(t.objectStore('fotos'));t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error)}));\n return{put", "indexedDB.open('fotos-del-diario',1);r.onupgradeneeded=()=>r.result.createObjectStore('fotos');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));\n const tx=(mode,fn)=>open().then(db=>new Promise((res,rej)=>{const t=db.transaction('fotos',mode);const q=fn(t.objectStore('fotos'));t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error)}));\n return{put"),
    ('M11 formulario: el día admite fechas futuras', HO, 'min="2000-01-01" max="${hoy()}"', 'min="2000-01-01"'),
    ('M12 formulario: pide marca aunque el cigarro sea del catálogo', HO, '${!c?`<div class="field"><label for="cMarca">', '${true?`<div class="field"><label for="cMarca">'),
    ('M13 formulario: la casilla pública sale marcada siempre', HO, 'id="cPublica" ${CD.publica?\'checked\':\'\'}>', 'id="cPublica" checked>'),
    ('M14 formulario: un día futuro escrito se acepta', HO, 'const v=okDay(cf.value)&&cf.value<=hoy()?cf.value:hoy();', 'const v=okDay(cf.value)?cf.value:hoy();'),
    ('M15 formulario: la marca no se guarda en el borrador', HO, 'cm.oninput=()=>{CD.marca=cm.value;persistDraft()};', 'cm.oninput=()=>{CD.marca=cm.value};'),
    ('M16 formulario: pública no se guarda en el borrador', HO, 'cp.onchange=()=>{CD.publica=cp.checked;persistDraft()};', 'cp.onchange=()=>{CD.publica=cp.checked};'),
    ('M17 foto: se achica a otra medida', HO, 'A.resizeImage(f,1100,.8)', 'A.resizeImage(f,512,.8)'),
    ('M18 foto: acepta lo que no es imagen', HO, "   if(!/^image\\//.test(f.type)){if(h)h.textContent='Escoge una imagen.';return}\n", ''),
    ('M19 foto: la que llega tarde queda guardada', HO, 'if(CD!==mine){if(ok)FOTOS.del(key);return}', 'if(CD!==mine){return}'),
    ('M20 foto: cambiarla deja la anterior en el teléfono', HO, 'const old=CD.foto;CD.foto=key;persistDraft();if(old)FOTOS.del(old);', 'const old=CD.foto;CD.foto=key;persistDraft();'),
    ('M21 foto: quitarla no la borra del teléfono', HO, "CD.foto='';persistDraft();if(old)FOTOS.del(old);", "CD.foto='';persistDraft();"),
    ('M22 foto: un fallo al guardar la da por puesta', HO, "Intenta otra vez.';return}\n   const old=CD.foto;", "Intenta otra vez.'}\n   const old=CD.foto;"),
    ('M23 guardar: la entrada no lleva la foto', HO, "foto:CD.foto||'',publica:!!CD.publica", "foto:'',publica:!!CD.publica"),
    ('M24 guardar: la entrada siempre es privada', HO, 'publica:!!CD.publica,consumido', 'publica:false,consumido'),
    ('M25 guardar: un día futuro o malo se guarda tal cual', HO, 'consumido:okDay(CD.consumido)&&CD.consumido<=hoy()?CD.consumido:hoy(),marca', 'consumido:CD.consumido,marca'),
    ('M26 guardar: un cigarro del catálogo también lleva marca', HO, "marca:c?'':String(CD.marca||'').trim().slice(0,60),actualizado", "marca:String(CD.marca||'').trim().slice(0,60),actualizado"),
    ('M27 guardar: la marca no se corta', HO, "marca:c?'':String(CD.marca||'').trim().slice(0,60),actualizado", "marca:c?'':String(CD.marca||'').trim(),actualizado"),
    ('M28 diario: se ve el día en que se anotó y no el que se fumó', HO, '${fmtF(d.consumido||d.fecha)}', '${fmtF(d.fecha)}'),
    ('M29 diario: la marca no se muestra', HO, "${d.artesano||d.marca?' · '+esc(d.artesano||d.marca):''}", "${d.artesano?' · '+esc(d.artesano):''}"),
    ('M30 diario: todas las tarjetas llevan foto', HO, '${d.foto?`<div class="dfoto"', '${true?`<div class="dfoto"'),
    ('M31 diario: la casilla pública no refleja el estado', HO, 'data-dpub="${esc(d.id)}" ${d.publica?\'checked\':\'\'}>', 'data-dpub="${esc(d.id)}" >'),
    ('M32 diario: la casilla no cambia la entrada', HO, 'x.publica=!!b.checked;x.actualizado=new Date().toISOString()', 'x.actualizado=new Date().toISOString()'),
    ('M33 diario: cambiarla no marca la entrada como actualizada', HO, 'x.publica=!!b.checked;x.actualizado=new Date().toISOString()}', 'x.publica=!!b.checked}'),
    ('M34 diario: borrar una entrada deja su foto', HO, 'if(x&&x.foto)FOTOS.del(x.foto);', ''),
    ('M35 respaldo: exportar no lleva los campos nuevos', HO, 'mihoja:{...s,draft:null},', 'mihoja:{...s,draft:null,diario:s.diario.map(({foto,publica,consumido,marca,...r})=>r)},'),
    ('M36 respaldo: importar pierde foto y pública', HO, 's.diario=byId(s.diario,inc.diario)', 's.diario=byId(s.diario,inc.diario.map(({foto,publica,...r})=>r))'),
    ('M37 respaldo: importar no pasa por los valores por defecto', HO, 'const inc=upgrade(JSON.parse(JSON.stringify(m)));', 'const inc=JSON.parse(JSON.stringify(m));'),
    ('M38 esquema: sube a 2 (no es aditivo)', HO, "const KEY='lhb_mihoja_v1',SCHEMA=1;", "const KEY='lhb_mihoja_v1',SCHEMA=2;"),
    ('M39 formulario: el botón de foto no cambia con foto', HO, "${CD.foto?'Cambiar foto':'Añadir foto'}", 'Añadir foto'),
    ('C1 estilos: una foto que no se encuentra deja un hueco', CS, '.dfoto:empty{display:none}\n', ''),
    ('C2 estilos: la foto sin tamaño', CS, '.dfoto img{display:block;width:100%;max-height:260px;object-fit:cover;border-radius:12px}\n', ''),
    ('V1 caché: el shell nuevo con la versión de antes', SW, "const VERSION='lhb-v58';", "const VERSION='lhb-v55';"),
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
