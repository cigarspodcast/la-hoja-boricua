#!/usr/bin/env python3
"""Build Vitola Boricua data files from a research JSON.
Usage: python3 build_data.py research.json [data] [site/data]
Writes artesanos.json, cigarros.json, places.json, events.json into data/ (source, NOT published)
and bundle.js into site/data/ (the only data file the app loads; v18: the JSONs no longer live in site/)."""
import json,sys,os,datetime
src=sys.argv[1];out=sys.argv[2] if len(sys.argv)>2 else 'data';bout=sys.argv[3] if len(sys.argv)>3 else 'site/data'
R=json.load(open(src))
os.makedirs(out,exist_ok=True);os.makedirs(bout,exist_ok=True)
FORT={'suave':'suave','media':'media','medio':'media','mediana':'media','fuerte':'fuerte','suave-media':'media','media-fuerte':'fuerte'}
arts=[]
for a in R.get('artesanos',[]):
    arts.append({k:a.get(k) for k in ['id','nombre','pueblo','tipo','historia','instagram','web','facebook','whatsapp','donde_comprar','fuentes','etiqueta','por_confirmar','nota','youtube','instagram_label','iniciales'] if a.get(k)})
aid={a['id']:a for a in arts}
cigs=[]
for c in R.get('cigarros',[]):
    if c.get('hecho_en') and 'puerto rico' not in c['hecho_en'].lower(): continue  # catálogo: solo hechos en PR
    f=(c.get('fortaleza') or '').strip().lower()
    item={'id':c['id'],'nombre':c['nombre'],'artesano_id':c.get('artesano_id') or '','pueblo':c.get('pueblo') or aid.get(c.get('artesano_id'),{}).get('pueblo',''),
          'capa':c.get('capa') or '','fortaleza':FORT.get(f),'vitolas':c.get('vitolas') or [],'notas':c.get('notas') or '','fuentes':c.get('fuentes') or []}
    cigs.append(item)
places=[]
for p in R.get('lugares',[]):
    if p.get('lat') is None or p.get('lng') is None: pass
    cat=(p.get('categoria') or '').lower()
    if cat not in ('lounge','venta'): cat='venta' if 'tabaquer' in (p.get('tipo') or '').lower() or 'tienda' in (p.get('tipo') or '').lower() else 'lounge'
    places.append({k:v for k,v in {'id':p.get('id'),'nombre':p['nombre'],'tipo':p.get('tipo'),'categoria':cat,'pueblo':p.get('pueblo'),'direccion':p.get('direccion'),
      'instagram':p.get('instagram'),'web':p.get('web'),'maps':p.get('maps'),'lat':p.get('lat'),'lng':p.get('lng'),'lat_lng_aprox':p.get('lat_lng_aprox'),'fuentes':p.get('fuentes')}.items() if v not in (None,'',[])})
evs=[]
for e in R.get('actividades',[]):
    evs.append({k:v for k,v in e.items() if v not in (None,'',[])})
fuentes=R.get('fuentes') or []
if not fuentes:  # derive from places + event sources
    seen=set()
    for p in places:
        u=p.get('instagram')
        if u and u not in seen: seen.add(u); fuentes.append({'handle':'@'+u.rstrip('/').split('/')[-1],'url':u,'nombre':p['nombre']})
    for e in evs:
        u=e.get('fuente_url')
        if u and 'instagram.com' in u:
            h='@'+u.split('instagram.com/')[1].split('/')[0]
            if not any(f['handle']==h for f in fuentes): fuentes.append({'handle':h,'url':'https://www.instagram.com/'+h[1:]+'/'})
events={'actualizado':R.get('generated_at') or datetime.datetime.utcnow().isoformat()+'Z','nota':'Lista mantenida a mano en el prototipo; un trabajo programado puede reescribir este archivo.','actividades':evs,'fuentes':fuentes}
def w(name,obj): json.dump(obj,open(os.path.join(out,name),'w'),ensure_ascii=False,indent=1)
w('artesanos.json',arts); w('cigarros.json',cigs); w('places.json',places); w('events.json',events)
bundle={'artesanos':arts,'cigarros':cigs,'places':places,'events':events}
open(os.path.join(bout,'bundle.js'),'w').write('/* generado por build_data.py: copia offline de los JSON */\nwindow.VB_DATA='+json.dumps(bundle,ensure_ascii=False,separators=(',',':'))+';\n')
print(len(arts),'artesanos',len(cigs),'cigarros',len(places),'lugares',len(evs),'actividades',len(fuentes),'fuentes')
