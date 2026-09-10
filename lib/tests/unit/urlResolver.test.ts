import {describe, test} from 'node:test';
import assert from 'node:assert/strict';
import {URLResolver} from '../../src/processing/URLResolver.ts';

describe('URLResolver', () => {
  describe('resolveUrl', () => {
    test('resolves relative URLs against baseURI', async (t) => {
      const cases = [
        {
          url: 'image.png',
          base: 'https://example.com/sub/',
          expected: 'https://example.com/sub/image.png',
        },
        {
          url: '../icons/logo.svg',
          base: 'https://example.com/deep/path/',
          expected: 'https://example.com/deep/icons/logo.svg',
        },
        {
          url: '/static/bundle.css',
          base: 'https://example.com/deep/path/',
          expected: 'https://example.com/static/bundle.css',
        },
      ];

      for (const c of cases) {
        await t.test(`resolves "${c.url}" against "${c.base}"`, () => {
          assert.strictEqual(URLResolver.resolveUrl(c.url, c.base), c.expected);
        });
      }
    });

    test('preserves absolute URLs, data URIs, blobs, and hashes', async (t) => {
      const base = 'https://example.com/app/';
      const cases = [
        'https://cdn.example.com/image.png',
        'http://insecure.example.com/test.jpg',
        '//cdn.example.com/font.woff2',
        'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
        'blob:https://example.com/4e9b980e-b769-42b3',
        'file:///Users/dev/project/logo.png',
        '#fragment-identifier',
        '',
      ];

      for (const url of cases) {
        await t.test(`preserves "${url.slice(0, 30)}"`, () => {
          assert.strictEqual(URLResolver.resolveUrl(url, base), url);
        });
      }
    });
  });

  describe('resolve (CSS declarations)', () => {
    const base = 'https://example.com/styles/main.css';

    test('replaces relative url(...) with resolved absolute URL', () => {
      const cssValue = 'url("../images/bg.png")';
      const resolved = URLResolver.resolve(cssValue, base);
      assert.strictEqual(resolved, 'url("https://example.com/images/bg.png")');
    });

    test('preserves single quotes in url(...)', () => {
      const cssValue = "url('../fonts/font.woff2')";
      const resolved = URLResolver.resolve(cssValue, base);
      assert.strictEqual(resolved, "url('https://example.com/fonts/font.woff2')");
    });

    test('handles unquoted url(...)', () => {
      const cssValue = 'url(../images/tile.png)';
      const resolved = URLResolver.resolve(cssValue, base);
      assert.strictEqual(resolved, "url('https://example.com/images/tile.png')");
    });

    test('preserves data: and absolute URLs inside url(...)', () => {
      const dataUri = 'url("data:image/png;base64,iVBORw0KGgo=") repeat';
      assert.strictEqual(URLResolver.resolve(dataUri, base), dataUri);

      const absolute = 'url("https://cdn.example.com/remote.png")';
      assert.strictEqual(URLResolver.resolve(absolute, base), absolute);
    });

    test('resolves multiple url(...) occurrences in a single property', () => {
      const multi = 'url("icon.png"), url("../patterns/dots.png"), url("https://cdn.com/a.png")';
      const resolved = URLResolver.resolve(multi, base);
      assert.strictEqual(
        resolved,
        'url("https://example.com/styles/icon.png"), url("https://example.com/patterns/dots.png"), url("https://cdn.com/a.png")'
      );
    });

    test('returns untouched property value if no url(...) present', () => {
      const value = '16px bold sans-serif';
      assert.strictEqual(URLResolver.resolve(value, base), value);
    });
  });

  describe('resolveElementAttributes', () => {
    test('resolves relative href and src attributes while preserving fragment links', () => {
      // Mock element interface for Node environment
      function createMockElement(tagName: string, attrs: Record<string, string>, baseURI: string) {
        const attributes = {...attrs};
        return {
          tagName,
          ownerDocument: {baseURI},
          getAttribute(name: string) {
            return attributes[name] ?? null;
          },
          setAttribute(name: string, value: string) {
            attributes[name] = value;
          },
          attributes,
        } as never as Element;
      }

      const anchorFragment = createMockElement('A', {href: '#section-1'}, 'https://example.com/page.html');
      URLResolver.resolveElementAttributes(anchorFragment);
      assert.strictEqual(anchorFragment.getAttribute('href'), '#section-1');

      const anchorRelative = createMockElement('A', {href: 'about.html'}, 'https://example.com/dir/');
      URLResolver.resolveElementAttributes(anchorRelative);
      assert.strictEqual(anchorRelative.getAttribute('href'), 'https://example.com/dir/about.html');

      const img = createMockElement('IMG', {src: '../logo.png'}, 'https://example.com/sub/dir/');
      URLResolver.resolveElementAttributes(img);
      assert.strictEqual(img.getAttribute('src'), 'https://example.com/sub/logo.png');

      const form = createMockElement('FORM', {action: 'submit'}, 'https://example.com/api/');
      URLResolver.resolveElementAttributes(form);
      assert.strictEqual(form.getAttribute('action'), 'https://example.com/api/submit');
    });
  });
});
