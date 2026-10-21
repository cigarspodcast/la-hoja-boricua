#!/usr/bin/env python3
"""v6: regenera site/data/bundle.js (copia offline) a partir de los JSON ya editados en site/data.
Uso: python3 tools/rebuild_bundle.py site/data"""
import json,sys,os
d=sys.argv[1] if len(sys.argv)>1 else 'site/data'
L=lambda n:json.load(open(os.path.join(d,n),encoding='utf-8'))
b={'artesanos':L('artesanos.json'),'cigarros':L('cigarros.json'),'places':L('places.json'),'events':L('events.json')}
open(os.path.join(d,'bundle.js'),'w',encoding='utf-8').write('/* generado por build_data.py: copia offline de los JSON */\nwindow.VB_DATA='+json.dumps(b,ensure_ascii=False,separators=(',',':'))+';\n')
print({k:len(v) for k,v in b.items() if isinstance(v,list)})
