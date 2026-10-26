/* Shared by the isolated content script, the playground and Node tests. */
(() => {
  'use strict';
  const MAX_TEXT = 20000;
  const MAX_COLORS = 200;
  const HEX_LENGTHS = new Set([3, 4, 6, 8]);
  const WORD = /[\p{L}\p{N}_-]/u;
  const START = /#[\da-f]+|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi;

  function isWord(char) { return Boolean(char && WORD.test(char)); }

  function parseColors(input, options = {}) {
    const text = String(input).slice(0, MAX_TEXT);
    const validate = options.validate || ((value) => globalThis.CSS?.supports('color', value) === true);
    const results = [];
    const occupied = [];
    const scanner = new RegExp(START);
    let match;
    const before = (start) => start ? text[start - 1] : (options.before || '');
    const after = (end) => end < text.length ? text[end] : (String(input)[end] || options.after || '');

    while ((match = scanner.exec(text)) && results.length < MAX_COLORS) {
      const start = match.index;
      const followsColor = results.length > 0 && results[results.length - 1].end === start;
      if ((isWord(before(start)) && !followsColor) || before(start) === '#') continue;
      let end = scanner.lastIndex;
      let format = 'HEX';
      if (match[0][0] === '#') {
        if (!HEX_LENGTHS.has(match[0].length - 1) || isWord(after(end))) continue;
      } else {
        // Balance parentheses so calc() is supported, without interpreting code.
        let depth = 1;
        while (end < text.length && depth) {
          if (text[end] === '(') depth++;
          if (text[end] === ')') depth--;
          end++;
        }
        scanner.lastIndex = end;
        occupied.push([start, end]);
        const nextFunction = /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i.test(text.slice(end));
        if (depth || (isWord(after(end)) && !nextFunction)) continue;
        format = match[0].slice(0, -1).toUpperCase();
      }
      const raw = text.slice(start, end);
      // Page variables and currentColor cannot be resolved faithfully in our UI.
      if (/\b(?:var|env|attr|currentcolor|inherit|initial|revert|unset)\b/i.test(raw)) continue;
      if (format !== 'HEX' && !validate(raw)) continue;
      results.push({ raw, css: raw, format, start, end });
      occupied.push([start, end]);
    }

    if (options.bareHex && results.length < MAX_COLORS) {
      for (const bare of text.matchAll(/[\da-f]+/gi)) {
        const start = bare.index;
        const end = start + bare[0].length;
        if (!HEX_LENGTHS.has(bare[0].length) || isWord(before(start)) || before(start) === '#' || isWord(after(end))) continue;
        if (occupied.some(([left, right]) => start < right && end > left)) continue;
        results.push({ raw: bare[0], css: `#${bare[0]}`, format: 'HEX', start, end });
        if (results.length === MAX_COLORS) break;
      }
    }
    return results.sort((a, b) => a.start - b.start);
  }

  const api = Object.freeze({ parseColors, MAX_TEXT, MAX_COLORS });
  globalThis.ColorPickerParser = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
