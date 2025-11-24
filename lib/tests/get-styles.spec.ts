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
    // Simulate a base URI for testing relative URLs
    await page.goto(`file://${filePath.replace(///lib/, '/test/')}`);
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
    // The exact resolved URL will depend on the test runner's environment.
    // We'll check for the pattern of a resolved absolute URL.
    expect(result.css).toMatch(/background-image: url\(['"]?file:\/\/.*?\/gfx\/devtools-logo.png['"]?\)/);
  });

  test('should keep absolute URLs unchanged', async ({page}) => {
    // Inject an element with an absolute URL style
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
    expect(result.css).toContain('background-image: url("https://example.com/bg.png")');
  });

  test('should keep data URIs unchanged', async ({page}) => {
    // Inject an element with a data URI style
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
    expect(result.css).toContain('background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=")');
  });
});