"""LHB-118: write U+FFFD in the test's CSS escape decoder as the JS escape \\uFFFD instead of the raw character."""
P = 'test/site.test.js'
s = open(P, encoding='utf-8', newline='').read()
old = "String.fromCodePoint(c):'" + chr(0xFFFD) + "'}"
new = "String.fromCodePoint(c):'\\uFFFD'}"
assert s.count(old) == 1 and s.count(chr(0xFFFD)) == 1, (s.count(old), s.count(chr(0xFFFD)))
s = s.replace(old, new)
open(P, 'w', encoding='utf-8', newline='').write(s)
print('raw FFFD left:', s.count(chr(0xFFFD)), '| escape present:', new in s)
