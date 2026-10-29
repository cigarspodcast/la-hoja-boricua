#!/bin/sh
# LHB-75: the preview's and production's X-Robots-Tag, saved as evidence. Pages assets are measured with HEAD; the /u/ profile page is a
# Pages Function that answers GET only (a HEAD request there falls through to the static 404 page), so it is measured with GET.
# usage: sh evidence/lhb-75-curl.sh > evidence/lhb-75-preview-curl.txt
P=https://facelift.la-hoja-boricua.pages.dev
echo "LHB-75 curl record, taken $(date -u '+%Y-%m-%dT%H:%M:%SZ') from this machine. Preview: branch facelift, sw $(curl -s $P/sw.js | grep -o 'lhb-v[0-9]*' | head -1)."
echo "Before the guard (07:26Z) the same preview answered x-robots-tag: noindex, the Pages default for preview URLs."
for u in $P/ $P/cigarros/cohoba-robusto-maduro $P/lugares/casa-de-montecristo-vsj https://lahojaboricua.com/ https://lahojaboricua.com/cigarros/cohoba-robusto-maduro https://la-hoja-boricua.pages.dev/; do
  echo; echo "== HEAD $u"; curl -sI "$u" | grep -i -E '^HTTP|^x-robots-tag'
done
for u in $P/u/ana https://lahojaboricua.com/u/ana; do
  echo; echo "== GET $u (Pages Function)"; curl -s -D - -o /dev/null "$u" | grep -i -E '^HTTP|^x-robots-tag'
done
echo
echo "Reading: preview assets answer noindex, nofollow (the _headers rule; nofollow is what the Pages default lacks). Production"
echo "(lahojaboricua.com and la-hoja-boricua.pages.dev) answers no x-robots-tag on assets, as before. The /u/ Function answers its own"
echo "noindex, follow on both hosts: _headers does not apply to Function responses."
