import { test, expect } from '@playwright/test';
import path from 'path';
import { getNonDefaultComputedStyles } from '../get-styles.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('getNonDefaultComputedStyles', () => {
  test('should return non-default styles for an element and its children', async ({ page }) => {
    const filePath = path.resolve(__dirname, '../index.html');
    await page.goto(`file://${filePath}`);
    await page.addScriptTag({ path: 'dist/get-styles.iife.js' });

    const styles = await page.evaluate(() => {
      const element = document.querySelector('.container');
      if (!element) return null;
      return SnappySnippet.getNonDefaultComputedStyles(element);
    });

    // Check the container element's styles
    expect(styles).not.toBeNull();
    if (!styles) return;

    expect(styles.tagName).toBe('DIV');
    expect(styles.attributes.class).toBe('container');
    expect(styles.styles['border-top']).toBe('1px solid rgb(0, 0, 0)');
    expect(styles.styles['border-right']).toBe('1px solid rgb(0, 0, 0)');
    expect(styles.styles['border-bottom']).toBe('1px solid rgb(0, 0, 0)');
    expect(styles.styles['border-left']).toBe('1px solid rgb(0, 0, 0)');
    expect(styles.styles.color).toBe('rgb(255, 0, 0)');

    // Check the child paragraph element's styles
    expect(styles.children.length).toBe(1);
    const pStyles = styles.children[0];
    expect(pStyles.tagName).toBe('P');
    expect(pStyles.styles.font).toBe('16px sans-serif');
  });
});
