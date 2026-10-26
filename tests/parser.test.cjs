const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseColors, MAX_COLORS } = require('../src/parser.js');
const parse = (text, options = {}) => parseColors(text, { validate: () => true, ...options });

test('HEX lengths, case and alpha are preserved', () => {
  assert.deepEqual(parse('#abc #ABCD #00ff99 #00ff9980').map(c => c.css), ['#abc', '#ABCD', '#00ff99', '#00ff9980']);
});
test('adjacent HEX codes and mixed punctuation', () => {
  assert.deepEqual(parse('#ff0000#00ff00，#00f；#abcd').map(c => c.raw), ['#ff0000', '#00ff00', '#00f', '#abcd']);
});
test('invalid lengths and identifiers do not become partial HEX', () => {
  assert.equal(parse('#ab #abcde #abcdefg #123456789 id#fff #fffg ##fff').length, 0);
});
test('partial selections respect surrounding characters', () => {
  assert.equal(parse('#fff', { after: 'f' }).length, 0);
  assert.equal(parse('#fff', { before: 'a' }).length, 0);
});
test('mixed functions retain exact offsets', () => {
  const source = '顏色：rgb(255, 0, 0)，hsl(120 100% 50% / .5)；oklch(60% .2 30)';
  const colors = parse(source);
  assert.equal(colors.length, 3);
  colors.forEach(c => assert.equal(source.slice(c.start, c.end), c.raw));
});
test('nested calc, newlines and adjacent functions', () => {
  assert.equal(parse('rgb(calc(100 + 20) 0 0)hsl(30\n80% 50%)').length, 2);
});
test('CSS validation rejects invalid functions', () => {
  assert.equal(parseColors('rgb(nope) #fff', { validate: () => false }).length, 1);
});
test('page-dependent colors and incomplete functions are rejected', () => {
  assert.equal(parse('rgb(var(--r) 0 0) color(from currentColor srgb r g b) rgb(1 2').length, 0);
});
test('bare HEX is opt-in and is not extracted from functions', () => {
  assert.equal(parse('FF0099').length, 0);
  assert.deepEqual(parse('FF0099, abc; rgb(255, 100, 200)', { bareHex: true }).map(c => c.css), ['#FF0099', '#abc', 'rgb(255, 100, 200)']);
  assert.equal(parse('coffee abcdefghi rgb(123 nope)', { bareHex: true, validate: () => false }).length, 0);
});
test('ordinary words and named colors are ignored', () => {
  assert.equal(parse('red blue transparent coffee 123').length, 0);
});
test('selection limits prevent unbounded work', () => {
  assert.equal(parse('#fff '.repeat(500)).length, MAX_COLORS);
  assert.equal(parse(' '.repeat(20000) + '#fff').length, 0);
});
