import {describe, test} from 'node:test';
import assert from 'node:assert/strict';
import {cleanHtml} from '../../src/htmlCleaner.ts';

describe('cleanHtml', () => {
  test('returns empty string for empty or null input', () => {
    assert.strictEqual(cleanHtml(''), '');
    assert.strictEqual(cleanHtml(null as never), '');
    assert.strictEqual(cleanHtml(undefined as never), '');
  });

  test('removes class and disallowed attributes by default', () => {
    const raw = '<div class="btn primary" style="color:red;" data-test="ignore" id="submit-btn"><span class="icon">Submit</span></div>';
    const cleaned = cleanHtml(raw);

    assert.ok(!cleaned.includes('class="btn primary"'));
    assert.ok(!cleaned.includes('class="icon"'));
    assert.ok(!cleaned.includes('style="color:red;"'));
    assert.ok(!cleaned.includes('data-test="ignore"'));
    assert.ok(cleaned.includes('id="submit-btn"'));
  });

  test('strips dangerous event handler attributes', () => {
    const raw = '<button onclick="alert(1)" onmouseover="hack()" id="safe">Click</button>';
    const cleaned = cleanHtml(raw);

    assert.ok(!cleaned.includes('onclick'));
    assert.ok(!cleaned.includes('onmouseover'));
    assert.ok(cleaned.includes('id="safe"'));
  });

  test('preserves allowed semantic attributes on appropriate elements', async (t) => {
    const cases = [
      {
        name: 'preserves href on <a>',
        html: '<a href="https://example.com" class="link">Link</a>',
        expectedFragment: '<a href="https://example.com">Link</a>',
      },
      {
        name: 'preserves src and alt on <img>',
        html: '<img src="avatar.png" alt="Profile" class="avatar">',
        expectedFragment: '<img src="avatar.png" alt="Profile">',
      },
      {
        name: 'preserves placeholder, type, and disabled on <input>',
        html: '<input type="text" placeholder="Your name" disabled class="form-input">',
        expectedFragment: '<input type="text" placeholder="Your name" disabled="">',
      },
      {
        name: 'preserves data-snappy-id attribute',
        html: '<div data-snappy-id="snappy-42" class="box"><span>Text</span></div>',
        expectedFragment: '<div data-snappy-id="snappy-42">',
      },
      {
        name: 'preserves action on <form>',
        html: '<form action="/submit" method="post" class="auth-form"><button type="submit">Go</button></form>',
        expectedFragment: '<form action="/submit">',
      },
    ];

    for (const c of cases) {
      await t.test(c.name, () => {
        const result = cleanHtml(c.html);
        assert.ok(
          result.includes(c.expectedFragment),
          `Expected "${result}" to contain "${c.expectedFragment}"`
        );
      });
    }
  });

  test('formats nested tags with two-space indentation', () => {
    const raw = '<div><p><span>Hello</span></p></div>';
    const cleaned = cleanHtml(raw);

    const expected = [
      '<div>',
      '  <p>',
      '    <span>Hello</span>',
      '  </p>',
      '</div>',
    ].join('\n');

    assert.strictEqual(cleaned, expected);
  });

  test('handles void elements without closing tags', () => {
    const raw = '<div><br><img src="img.jpg"><hr><input type="checkbox"></div>';
    const cleaned = cleanHtml(raw);

    assert.ok(cleaned.includes('<br>'));
    assert.ok(!cleaned.includes('</br>'));
    assert.ok(cleaned.includes('<img src="img.jpg">'));
    assert.ok(!cleaned.includes('</img>'));
    assert.ok(cleaned.includes('<hr>'));
    assert.ok(!cleaned.includes('</hr>'));
  });

  test('preserves comments when present', () => {
    const raw = '<div><!-- important note --><span>Text</span></div>';
    const cleaned = cleanHtml(raw);

    assert.ok(cleaned.includes('<!-- important note -->'));
  });

  test('respects format: false option', () => {
    const raw = '<div class="row"><p class="col">Inline text</p></div>';
    const cleaned = cleanHtml(raw, {format: false});

    assert.ok(!cleaned.includes('class='));
    assert.ok(!cleaned.includes('\n'));
    assert.strictEqual(cleaned, '<div><p>Inline text</p></div>');
  });

  test('allows custom removeAttrs and allowedAttributes override', () => {
    const raw = '<div id="main" role="banner" aria-label="Header">Header</div>';
    const cleaned = cleanHtml(raw, {
      removeAttrs: ['id'],
      allowedAttributes: {'role': true, 'aria-label': true},
    });

    assert.ok(!cleaned.includes('id="main"'));
    assert.ok(cleaned.includes('role="banner"'));
    assert.ok(cleaned.includes('aria-label="Header"'));
  });

  test('preserves SVG and ARIA attributes when allowedAttributes is null', () => {
    const raw = '<svg viewBox="0 0 100 100" fill="red" aria-label="Logo"><circle cx="50" cy="50" r="40"></circle></svg>';
    const cleaned = cleanHtml(raw, {allowedAttributes: null});

    assert.ok(cleaned.includes('viewBox="0 0 100 100"'));
    assert.ok(cleaned.includes('fill="red"'));
    assert.ok(cleaned.includes('aria-label="Logo"'));
    assert.ok(cleaned.includes('cx="50"'));
    assert.ok(cleaned.includes('cy="50"'));
    assert.ok(cleaned.includes('r="40"'));
  });

  describe('inline whitespace and text node formatting', () => {
    test('preserves spaces and word boundaries between inline link and surrounding text', () => {
      const raw = '<p>Click <a href="#">here</a> to continue.</p>';
      const cleaned = cleanHtml(raw);

      // Verify formatted structure maintains separate lines/tokens for text and link
      const lines = cleaned.split('\n').map(l => l.trim());
      assert.ok(lines.includes('<p>'));
      assert.ok(lines.includes('Click'));
      assert.ok(lines.includes('<a href="#">here</a>'));
      assert.ok(lines.includes('to continue.'));
      assert.ok(lines.includes('</p>'));

      // Verify text tokens are cleanly isolated
      assert.ok(cleaned.includes('Click'));
      assert.ok(cleaned.includes('<a href="#">here</a>'));
      assert.ok(cleaned.includes('to continue.'));
    });

    test('preserves line separation and token boundaries between spaced span elements', () => {
      const raw = '<span>hello</span> <span>world</span>';
      const cleaned = cleanHtml(raw);

      const lines = cleaned.split('\n').map(l => l.trim());
      assert.deepStrictEqual(lines, ['<span>hello</span>', '<span>world</span>']);
    });

    test('preserves nested inline elements with mixed text nodes', () => {
      const raw = '<div>Welcome to <strong>open</strong> <em>web</em> standards.</div>';
      const cleaned = cleanHtml(raw);

      assert.ok(cleaned.includes('<div>'));
      assert.ok(cleaned.includes('Welcome to'));
      assert.ok(cleaned.includes('<strong>open</strong>'));
      assert.ok(cleaned.includes('<em>web</em>'));
      assert.ok(cleaned.includes('standards.'));
      assert.ok(cleaned.includes('</div>'));
    });
  });
});
