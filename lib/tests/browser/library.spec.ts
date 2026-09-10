import {test, expect} from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const bundlePath = path.resolve('dist/snappysnippet.js');
const bundleCode = fs.readFileSync(bundlePath, 'utf8');

test.describe('SnappySnippet Browser Library API', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('about:blank');
    await page.evaluate((code) => {
      const script = document.createElement('script');
      script.textContent = code;
      document.head.appendChild(script);
    }, bundleCode);
  });

  test('exposes all expected API symbols on window.SnappySnippet', async ({page}) => {
    const api = await page.evaluate(() => {
      const s = (window as any).SnappySnippet;
      return {
        hasExtractSnippet: typeof s?.extractSnippet === 'function',
        hasGetNonDefaultComputedStyles: typeof s?.getNonDefaultComputedStyles === 'function',
        hasSnapshooter: typeof s?.Snapshooter === 'function',
        hasCleanHtml: typeof s?.cleanHtml === 'function',
        hasDefaultValueFilter: typeof s?.DefaultValueFilter === 'function',
        hasShorthandPropertyFilter: typeof s?.ShorthandPropertyFilter === 'function',
        hasWebkitPropertiesFilter: typeof s?.WebkitPropertiesFilter === 'function',
        hasSameRulesCombiner: typeof s?.SameRulesCombiner === 'function',
        hasCSSStringifier: typeof s?.CSSStringifier === 'function',
        hasURLResolver: typeof s?.URLResolver === 'function',
        hasGetCssMetadata: typeof s?.getCssMetadata === 'function',
      };
    });

    expect(api.hasExtractSnippet).toBe(true);
    expect(api.hasGetNonDefaultComputedStyles).toBe(true);
    expect(api.hasSnapshooter).toBe(true);
    expect(api.hasCleanHtml).toBe(true);
    expect(api.hasDefaultValueFilter).toBe(true);
    expect(api.hasShorthandPropertyFilter).toBe(true);
    expect(api.hasWebkitPropertiesFilter).toBe(true);
    expect(api.hasSameRulesCombiner).toBe(true);
    expect(api.hasCSSStringifier).toBe(true);
    expect(api.hasURLResolver).toBe(true);
    expect(api.hasGetCssMetadata).toBe(true);
  });

  test('extracts snippet using default #TAG_1 selector strategy with class stripping', async ({page}) => {
    const result = await page.evaluate(() => {
      const container = document.createElement('div');
      container.className = 'container-box';
      container.style.color = 'rgb(255, 0, 0)';
      container.innerHTML = '<span class="child-text" style="font-weight: bold;">Hello World</span>';
      document.body.appendChild(container);

      return (window as any).SnappySnippet.extractSnippet(container);
    });

    expect(result.html).toMatch(/<div [^>]*id="DIV_\d+"[^>]*>/);
    expect(result.html).toMatch(/<span [^>]*id="SPAN_\d+"[^>]*>Hello World<\/span>/);
    expect(result.html).not.toContain('class="container-box"');
    expect(result.html).not.toContain('class="child-text"');
    expect(result.css).toMatch(/#DIV_\d+ \{/);
    expect(result.css).toContain('color: rgb(255, 0, 0);');
  });

  test('supports selectorStrategy: data-attribute with class preservation', async ({page}) => {
    const result = await page.evaluate(() => {
      const container = document.createElement('div');
      container.className = 'my-card';
      container.style.backgroundColor = 'rgb(10, 20, 30)';
      container.innerHTML = '<p class="description" style="color: rgb(200, 200, 200);">Card text</p>';
      document.body.appendChild(container);

      return (window as any).SnappySnippet.extractSnippet(container, {
        selectorStrategy: 'data-attribute',
      });
    });

    expect(result.html).toContain('data-snappy-id="snappy-');
    expect(result.html).toContain('class="my-card"');
    expect(result.html).toContain('class="description"');
    expect(result.css).toContain('[data-snappy-id="snappy-');
    expect(result.css).toContain('background: rgb(10, 20, 30)');
  });

  test('supports includeAncestors option', async ({page}) => {
    const result = await page.evaluate(() => {
      const section = document.createElement('section');
      section.id = 'outer-section';
      section.style.backgroundColor = 'rgb(240, 240, 240)';

      const wrapper = document.createElement('div');
      wrapper.id = 'inner-wrapper';

      const btn = document.createElement('button');
      btn.textContent = 'Submit';
      btn.style.color = 'rgb(0, 128, 0)';

      wrapper.appendChild(btn);
      section.appendChild(wrapper);
      document.body.appendChild(section);

      return (window as any).SnappySnippet.extractSnippet(btn, {
        includeAncestors: true,
      });
    });

    expect(result.html).toContain('<section');
    expect(result.html).toContain('<div');
    expect(result.html).toContain('<button');
    expect(result.html).toContain('Submit');
    expect(result.html).toContain('</button>');
    expect(result.html).toContain('</div>');
    expect(result.html).toContain('</section>');
    expect(result.css).toContain('color: rgb(0, 128, 0);');
  });

  test('supports embedCSS option', async ({page}) => {
    const result = await page.evaluate(() => {
      const div = document.createElement('div');
      div.style.color = 'rgb(0, 0, 255)';
      div.textContent = 'Blue text';
      document.body.appendChild(div);

      return (window as any).SnappySnippet.extractSnippet(div, {
        embedCSS: true,
      });
    });

    expect(result.css).toBe('');
    expect(result.html).toContain('<style type="text/css">');
    expect(result.html).toContain('color: rgb(0, 0, 255);');
    expect(result.html).toContain('Blue text');
  });

  test('extracts pseudo-elements :before and :after', async ({page}) => {
    const result = await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = `
        .quoted::before { content: "“"; color: rgb(128, 0, 0); }
        .quoted::after { content: "”"; color: rgb(0, 0, 128); }
      `;
      document.head.appendChild(style);

      const div = document.createElement('div');
      div.className = 'quoted';
      div.textContent = 'Quote content';
      document.body.appendChild(div);

      return (window as any).SnappySnippet.extractSnippet(div);
    });

    expect(result.css).toContain(':before');
    expect(result.css).toContain(':after');
    expect(result.css).toContain('color: rgb(128, 0, 0);');
    expect(result.css).toContain('color: rgb(0, 0, 128);');
  });
});
