import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderDiscord } from '../js/discord-md.js';
const t = (input, expected, label) =>
  test(label, () => {
    const html = renderDiscord(input);
    for (const e of expected) assert.ok(html.includes(e), `expected ${e} in ${html}`);
  });
t('# Big\n## Mid\n### Small', ['<div class="dmd-h1">Big', 'dmd-h2">Mid', 'dmd-h3">Small'], 'headings');
t('#NoSpace', ['<div>#NoSpace</div>'], 'no heading without space');
t(
  '- **Declares: A**\n- ***✅ Can place on: B***',
  [
    '<ul class="dmd-list"><li><strong>Declares: A</strong></li>',
    '<li><strong><em>✅ Can place on: B</em></strong></li></ul>',
  ],
  'list + bold/bold-italic',
);
t('- a\n  - b\n- c', ['<li>a</li><ul class="dmd-list"><li>b</li></ul><li>c</li>'], 'nested list');
t('1. one\n2. two', ['<ol class="dmd-list"><li>one</li><li>two</li></ol>'], 'numbered list');
t(
  '__u__ ~~s~~ ||sp|| *i* _j_ `c*d*`',
  ['<u>u</u>', '<s>s</s>', 'dmd-spoiler">sp<', '<em>i</em>', '<em>j</em>', '<code class="dmd-code">c*d*</code>'],
  'inline styles',
);
t('snake_case_name x', ['snake_case_name'], 'underscores inside words stay');
t('x\\_y\\*z', ['x_y*z'], 'escapes');
t('<script>alert(1)</script> & "q"', ['&lt;script&gt;', '&amp;', '&quot;q&quot;'], 'HTML is escaped');
t('-# small', ['dmd-sub">small'], 'subtext');
t('> quoted\nnot', ['dmd-quote">quoted', '<div>not</div>'], 'quote');
t('```js\nconst x = 1 **2**\n```', ['<pre class="dmd-pre">const x = 1 **2**</pre>'], 'code block');
t('## 𑣲 Chickens ꒰ঌ(•͈⌔•͈)໒꒱', ['dmd-h2">𑣲 Chickens ꒰ঌ(•͈⌔•͈)໒꒱'], 'unicode decorations');
t(
  '[x](https://e.com) [y](javascript:alert(1))',
  ['dmd-link" title="https://e.com">x', '[y](javascript:alert(1))'],
  'links: only https',
);
t('a\n\nb', ['<div>a</div><div class="dmd-blank"></div><div>b</div>'], 'blank line');
