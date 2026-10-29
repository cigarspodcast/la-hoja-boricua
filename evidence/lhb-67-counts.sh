#!/bin/bash
# LHB-67 counts, the ticket's counting basis: grep -o of #[0-9a-fA-F]{3,8} and of rgba?\( per file, every occurrence counted
# (comments and the :root token definitions included). Before = facelift HEAD at the time of the run; after = the working tree.
# usage: bash evidence/lhb-67-counts.sh WORKTREE [BASE]   (BASE defaults to HEAD)
cd "$1" || exit 2
echo "LHB-67 color literal counts, $(date -u +%Y-%m-%dT%H:%MZ), base $(git rev-parse --short ${2:-HEAD})"
echo "basis: grep -oE '#[0-9a-fA-F]{3,8}' and grep -oE 'rgba?\(' per file, every occurrence"
printf '%-16s %10s %10s %10s %10s\n' file hex-before hex-after rgba-before rgba-after
for f in site/styles.css site/app.js site/hoja.js site/cuenta.js; do
  hb=$(git show ${2:-HEAD}:$f | grep -oE '#[0-9a-fA-F]{3,8}' | wc -l)
  ha=$(grep -oE '#[0-9a-fA-F]{3,8}' $f | wc -l)
  rb=$(git show ${2:-HEAD}:$f | grep -oE 'rgba?\(' | wc -l)
  ra=$(grep -oE 'rgba?\(' $f | wc -l)
  printf '%-16s %10s %10s %10s %10s\n' $f $hb $ha $rb $ra
done
echo "styles.css after, outside :root (the token definitions): $(python -c "import re;s=open('site/styles.css',encoding='utf-8').read();s=re.sub(r':root\{[^}]*\}','',s,count=1);s=re.sub(r'/\*[\s\S]*?\*/','',s);print(len(re.findall(r'#[0-9a-fA-F]{3,8}\b|rgba?\(',s)))")"
echo "every literal left is in the test's ALLOW67 list with its reason; the test's own tally is in evidence/lhb-67-tests.txt"
