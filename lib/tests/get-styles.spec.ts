import {test, expect} from '@playwright/test';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('getNonDefaultComputedStyles - HTML Extraction & Unique ID Assignment', () => {
  test.beforeEach(async ({page}) => {
    const filePath = path.resolve(__dirname, '../test-harness.html');
    await page.goto(`file://${filePath}`);
    await page.addScriptTag({path: 'dist/get-styles.iife.js'});
  });

  test('should return correct HTML structure with unique data-snappy-id attributes', async ({page}) => {
    const result = await page.evaluate(() => {
      const element = document.querySelector('.container');
      if (!element) return null;
      return SnappySnippet.getNonDefaultComputedStyles(element);
    });

    expect(result).not.toBeNull();
    expect(result.html).toBeDefined();

    const expectedHtmlPattern = /<div class="container" data-snappy-id="snappy-\d+">\s*<p data-snappy-id="snappy-\d+">\s*<span data-snappy-id="snappy-\d+">Hello World<\/span>\s*<\/p>\s*<\/div>/;
    expect(result.html).toMatch(expectedHtmlPattern);

    const snappyIds = (result.html.match(/data-snappy-id="(snappy-\d+)"/g) || []).map(id => id.split('=')[1]);
    const uniqueSnappyIds = new Set(snappyIds);
    expect(snappyIds.length).toBe(uniqueSnappyIds.size);
    expect(snappyIds.length).toBeGreaterThan(0);
  });

  test('should preserve original attributes on cloned elements', async ({page}) => {
    const result = await page.evaluate(() => {
      const element = document.querySelector('.container');
      if (!element) return null;
      return SnappySnippet.getNonDefaultComputedStyles(element);
    });

    expect(result).not.toBeNull();
    expect(result.html).toContain('class="container"');
  });
});

test.describe('getNonDefaultComputedStyles - URL Resolving', () => {
  test.beforeEach(async ({page}) => {
    const filePath = path.resolve(__dirname, '../test-harness.html');
    await page.goto(`file://${filePath}`);
    await page.addScriptTag({path: 'dist/get-styles.iife.js'});
  });

  test('should resolve relative URLs to absolute URLs', async ({page}) => {
    const result = await page.evaluate(() => {
      const element = document.querySelector('.url-test');
      if (!element) return null;
      return SnappySnippet.getNonDefaultComputedStyles(element);
    });

    expect(result).not.toBeNull();
    expect(result.css).toBeDefined();
    expect(result.css).toMatch(/background:.*?url\(['"]?file:\/\/.*?\/gfx\/devtools-logo.png['"]?\)/);
  });

  test('should keep absolute URLs unchanged', async ({page}) => {
    await page.evaluate(() => {
      const div = document.createElement('div');
      div.className = 'absolute-url-test';
      div.style.backgroundImage = 'url(https://example.com/bg.png)';
      document.body.appendChild(div);
    });

    const result = await page.evaluate(() => {
      const element = document.querySelector('.absolute-url-test');
      if (!element) return null;
      return SnappySnippet.getNonDefaultComputedStyles(element);
    });

    expect(result).not.toBeNull();
    expect(result.css).toBeDefined();
    expect(result.css).toContain('background: rgba(0, 0, 0, 0) url("https://example.com/bg.png") repeat scroll 0% 0% / auto padding-box border-box');
  });

  test('should keep data URIs unchanged', async ({page}) => {
    await page.evaluate(() => {
      const div = document.createElement('div');
      div.className = 'data-url-test';
      div.style.backgroundImage = 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=)';
      document.body.appendChild(div);
    });

    const result = await page.evaluate(() => {
      const element = document.querySelector('.data-url-test');
      if (!element) return null;
      return SnappySnippet.getNonDefaultComputedStyles(element);
    });

    expect(result).not.toBeNull();
    expect(result.css).toBeDefined();
    expect(result.css).toContain('background: rgba(0, 0, 0, 0) url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=") repeat scroll 0% 0% / auto padding-box border-box');
  });
});

test.describe('getNonDefaultComputedStyles - Shorthand Property Filtering', () => {
  test.beforeEach(async ({page}) => {
    const filePath = path.resolve(__dirname, '../test-harness.html');
    await page.goto(`file://${filePath}`);
    await page.addScriptTag({path: 'dist/get-styles.iife.js'});
  });

  test('should remove longhand properties when shorthand is present (margin)', async ({page}) => {
    const result = await page.evaluate(() => {
      const element = document.querySelector('.shorthand-test');
      if (!element) return null;
      return SnappySnippet.getNonDefaultComputedStyles(element);
    });

    expect(result).not.toBeNull();
    expect(result.css).toBeDefined();
    expect(result.css).toContain('margin: 10px');
    expect(result.css).not.toContain('margin-top');
    expect(result.css).not.toContain('margin-right');
    expect(result.css).not.toContain('margin-bottom');
    expect(result.css).not.toContain('margin-left');
  });

  test('should remove longhand properties when shorthand is present (border)', async ({page}) => {
    const result = await page.evaluate(() => {
      const element = document.querySelector('.shorthand-border-test');
      if (!element) return null;
      return SnappySnippet.getNonDefaultComputedStyles(element);
    });

    expect(result).not.toBeNull();
    expect(result.css).toBeDefined();
    expect(result.css).toContain('border: 2px solid rgb(0, 0, 255)');
    expect(result.css).not.toContain('border-width');
    expect(result.css).not.toContain('border-style');
    expect(result.css).not.toContain('border-color');
  });

  test('should not remove longhand properties if no shorthand is present', async ({page}) => {
    await page.evaluate(() => {
      const div = document.createElement('div');
      div.className = 'no-shorthand-test';
      div.style.paddingTop = '5px';
      div.style.paddingLeft = '10px';
      document.body.appendChild(div);
    });

    const result = await page.evaluate(() => {
      const element = document.querySelector('.no-shorthand-test');
      if (!element) return null;
      return SnappySnippet.getNonDefaultComputedStyles(element);
    });

    expect(result).not.toBeNull();
    expect(result.css).toBeDefined();
    expect(result.css).toContain('padding: 5px 0px 0px 10px'); // Computed shorthand
    expect(result.css).not.toContain('padding-top:');
    expect(result.css).not.toContain('padding-left:');
  });
});

test.describe('getNonDefaultComputedStyles - CSS Rule Combining', () => {
  test.beforeEach(async ({page}) => {
    const filePath = path.resolve(__dirname, '../test-harness.html');
    await page.goto(`file://${filePath}`);
    await page.addScriptTag({path: 'dist/get-styles.iife.js'});
  });

  test('should combine rules for two sibling elements with identical styles', async ({page}) => {
    const result = await page.evaluate(() => {
      const element1 = document.querySelector('.combined-rules-1');
      const element2 = document.querySelector('.combined-rules-2');
      if (!element1 || !element2) return null;
      // Process a common ancestor or both elements individually and combine results
      // For this test, we'll process the parent of these elements to get a more focused CSS output
      return SnappySnippet.getNonDefaultComputedStyles(document.querySelector('#combined-rules-container')!);
    });

    expect(result).not.toBeNull();
    expect(result.css).toBeDefined();

    // Expect a single rule combining the two selectors
    // The exact data-snappy-id values will vary, so we use regex
        expect(result.css).toContain('color: rgb(0, 128, 0);');
        expect(result.css).toContain('font: 18px Times;');
        expect(result.css).not.toContain('font-size:');
        // Verify that the two selectors are combined. The exact order of elements might vary,
        // and other default styles might be present, so we check for presence and combination.
        expect(result.css).toMatch(/ \[data-snappy-id="snappy-\d+"\]\, \[data-snappy-id="snappy-\d+"\]/);
    
  });

  test('should combine rules for a pseudo-element and a regular element if styles are identical', async ({page}) => {
    // Create an additional element with the same style as the pseudo-element
    await page.evaluate(() => {
      const container = document.querySelector('#pseudo-combined-container');
      const div = document.createElement('div');
      div.className = 'pseudo-match-test';
      div.style.color = 'purple'; // Match pseudo-element color
      // Pseudo-element content is not directly applied to element's style, so we don't set it here
      container?.appendChild(div);
    });

    const result = await page.evaluate(() => {
      const container = document.querySelector('#pseudo-combined-container');
      if (!container) return null;
      return SnappySnippet.getNonDefaultComputedStyles(container);
    });

    expect(result).not.toBeNull();
    expect(result.css).toBeDefined();

        expect(result.css).toContain(`content: '"hello"'`);

        expect(result.css).toContain('color: rgb(128, 0, 128);');

        // Verify that the pseudo-element and regular element selectors are combined.
        expect(result.css).toContain('[data-snappy-id="snappy-\\d+"]::before, [data-snappy-id="snappy-\\d+"]');

    
  });

  test('should create distinct rules for elements with different styles', async ({page}) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'distinct-rules-container';
      document.body.appendChild(container);

      const div1 = document.createElement('div');
      div1.className = 'distinct-rule-1';
      div1.style.backgroundColor = 'red';
      container.appendChild(div1);

      const div2 = document.createElement('div');
      div2.className = 'distinct-rule-2';
      div2.style.backgroundColor = 'blue';
      container.appendChild(div2);
    });

    const result = await page.evaluate(() => {
      const container = document.querySelector('#distinct-rules-container');
      if (!container) return null;
      return SnappySnippet.getNonDefaultComputedStyles(container);
    });

    expect(result).not.toBeNull();
    expect(result.css).toBeDefined();

    expect(result.css).toContain('background: rgb(255, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box;');
    expect(result.css).not.toContain('background-color: rgb(255, 0, 0);');
    expect(result.css).toContain('background: rgb(0, 0, 255) none repeat scroll 0% 0% / auto padding-box border-box;');
    expect(result.css).not.toContain('background-color: rgb(0, 0, 255);');

    // Ensure they are not combined, by checking for unique selectors with their styles
    expect(result.css).toMatch(/\S*\[data-snappy-id="snappy-\d+"\] \{[^}]*background: rgb\(255, 0, 0\) none repeat scroll 0% 0% \/ auto padding-box border-box;[^}]*}/);
    expect(result.css).toMatch(/\S*\[data-snappy-id="snappy-\d+"\] \{[^}]*background: rgb\(0, 0, 255\) none repeat scroll 0% 0% \/ auto padding-box border-box;[^}]*}/);
  });
});

test.describe('getNonDefaultComputedStyles - CSS Stringification', () => {
  test.beforeEach(async ({page}) => {
    const filePath = path.resolve(__dirname, '../test-harness.html');
    await page.goto(`file://${filePath}`);
    await page.addScriptTag({path: 'dist/get-styles.iife.js'});
  });

  test('should generate valid and formatted CSS for a simple rule', async ({page}) => {
    await page.evaluate(() => {
      const div = document.createElement('div');
      div.className = 'simple-rule-test';
      div.style.color = 'red';
      div.style.fontSize = '16px';
      document.body.appendChild(div);
    });

    const result = await page.evaluate(() => {
      const element = document.querySelector('.simple-rule-test');
      if (!element) return null;
      return SnappySnippet.getNonDefaultComputedStyles(element);
    });

    expect(result).not.toBeNull();
    expect(result.css).toBeDefined();
    expect(result.css).toContain('[data-snappy-id=\"snappy-1\"] {');
    expect(result.css).toContain('[data-snappy-id="snappy-1"], [data-snappy-id="snappy-1"]::before, [data-snappy-id="snappy-1"]::after {');
    expect(result.css).toContain('color: rgb(255, 0, 0);');
    expect(result.css).toContain('font-size: 16px;');
    expect(result.css).toContain('}');
  });

  test('should return an empty CSS string if no non-default styles are found', async ({page}) => {
    await page.evaluate(() => {
      const div = document.createElement('div');
      div.className = 'empty-styles-test';
      document.body.appendChild(div);
    });

    const result = await page.evaluate(() => {
      const element = document.querySelector('.empty-styles-test');
      if (!element) return null;
      return SnappySnippet.getNonDefaultComputedStyles(element);
    });

    expect(result).not.toBeNull();
    expect(result.css).toBeDefined();
    expect(result.css).toBe('');
  });

  test('should handle pseudo-element selectors correctly', async ({page}) => {
    const result = await page.evaluate(() => {
      const element = document.querySelector('.pseudo-element-test');
      if (!element) return null;
      return SnappySnippet.getNonDefaultComputedStyles(element);
    });

    expect(result).not.toBeNull();
    expect(result.css).toBeDefined();
    expect(result.css).toEqual('TODO FILL THIS IN');
  });
});
