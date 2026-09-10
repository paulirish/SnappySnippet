import {test, expect} from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const bundlePath = path.resolve('dist/snappysnippet.js');
const bundleCode = fs.readFileSync(bundlePath, 'utf8');

test.describe('Zero-Noise Invariant', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('about:blank');
    await page.evaluate((code) => {
      const script = document.createElement('script');
      script.textContent = code;
      document.head.appendChild(script);
    }, bundleCode);
  });

  test('unstyled element subtree produces completely empty CSS', async ({page}) => {
    const result = await page.evaluate(() => {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = '<p>Plain text inside paragraph</p>';
      document.body.appendChild(wrapper);

      return (window as any).SnappySnippet.extractSnippet(wrapper);
    });

    expect(result.html).toBeDefined();
    expect(result.html).toContain('Plain text inside paragraph');
    expect(result.css).toBe('');
  });

  test('unstyled deep DOM structure produces zero CSS', async ({page}) => {
    const result = await page.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML = `
        <article>
          <header>
            <h1>Heading</h1>
          </header>
          <section>
            <p>Text</p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </section>
        </article>
      `;
      document.body.appendChild(container);

      return (window as any).SnappySnippet.extractSnippet(container);
    });

    expect(result.html).toContain('Heading');
    expect(result.css).toBe('');
  });
});
