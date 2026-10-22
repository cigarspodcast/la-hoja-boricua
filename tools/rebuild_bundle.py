#!/usr/bin/env python3
"""v6/v18: regenera site/data/bundle.js a partir de los JSON fuente editados en data/ (fuera de site/).
Uso: python3 tools/rebuild_bundle.py [data] [site/data]"""
import json,sys,os
d=sys.argv[1] if len(sys.argv)>1 else 'data';o=sys.argv[2] if len(sys.argv)>2 else 'site/data'
L=lambda n:json.load(open(os.path.join(d,n),encoding='utf-8'))
b={'artesanos':L('artesanos.json'),'cigarros':L('cigarros.json'),'places':L('places.json'),'events':L('events.json')}
open(os.path.join(o,'bundle.js'),'w',encoding='utf-8').write('/* generado por build_data.py: copia offline de los JSON */\nwindow.VB_DATA='+json.dumps(b,ensure_ascii=False,separators=(',',':'))+';\n')
print({k:len(v) for k,v in b.items() if isinstance(v,list)})
