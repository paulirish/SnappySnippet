import { test, expect } from '@playwright/test';
import path from 'path';
import { getNonDefaultComputedStyles } from '../get-styles.ts';

test.describe('getNonDefaultComputedStyles', () => {
  test('should return non-default styles for an element and its children', async ({ page }) => {
    const filePath = path.resolve(__dirname, '../index.html');
    await page.goto(`file://${filePath}`);

    const styles = await page.evaluate(() => {
      const element = document.querySelector('.container');
      return getNonDefaultComputedStyles(element);
    });

    // Check the container element's styles
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
