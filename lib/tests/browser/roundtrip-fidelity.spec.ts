import {test, expect} from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const bundlePath = path.resolve('dist/snappysnippet.js');
const bundleCode = fs.readFileSync(bundlePath, 'utf8');

test.describe('Round-Trip Visual & Style Fidelity', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('about:blank');
    await page.evaluate((code) => {
      const script = document.createElement('script');
      script.textContent = code;
      document.head.appendChild(script);
    }, bundleCode);
  });

  test('extracted styled card matches original computed styles when sandboxed in iframe', async ({page}) => {
    const comparison = await page.evaluate(() => {
      // 1. Create and style original element in main page
      const originalCard = document.createElement('div');
      originalCard.id = 'target-card';
      originalCard.style.color = 'rgb(255, 255, 255)';
      originalCard.style.backgroundColor = 'rgb(40, 50, 60)';
      originalCard.style.fontSize = '18px';
      originalCard.style.padding = '24px';
      originalCard.style.margin = '16px';
      originalCard.style.borderRadius = '12px';
      originalCard.style.display = 'flex';
      originalCard.style.flexDirection = 'column';
      originalCard.innerHTML = '<span style="color: rgb(255, 200, 0); font-weight: bold;">Yellow Badge</span><p style="margin-top: 8px;">Description</p>';
      document.body.appendChild(originalCard);

      // Measure original in-situ computed styles
      const origStyle = window.getComputedStyle(originalCard);
      const originalValues = {
        color: origStyle.color,
        backgroundColor: origStyle.backgroundColor,
        fontSize: origStyle.fontSize,
        paddingTop: origStyle.paddingTop,
        marginTop: origStyle.marginTop,
        borderRadius: origStyle.borderRadius,
        display: origStyle.display,
      };

      // 2. Extract snippet
      const snippet = (window as any).SnappySnippet.extractSnippet(originalCard);

      // 3. Mount in fresh iframe sandbox
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Cannot access iframe document');

      iframeDoc.open();
      iframeDoc.write(`<!DOCTYPE html><html><head><style>${snippet.css}</style></head><body>${snippet.html}</body></html>`);
      iframeDoc.close();

      // Find mounted element in sandbox
      const mountedCard = iframeDoc.body.firstElementChild as HTMLElement;
      const mountedStyle = iframe.contentWindow!.getComputedStyle(mountedCard);

      const mountedValues = {
        color: mountedStyle.color,
        backgroundColor: mountedStyle.backgroundColor,
        fontSize: mountedStyle.fontSize,
        paddingTop: mountedStyle.paddingTop,
        marginTop: mountedStyle.marginTop,
        borderRadius: mountedStyle.borderRadius,
        display: mountedStyle.display,
      };

      iframe.remove();
      originalCard.remove();

      return {originalValues, mountedValues};
    });

    expect(comparison.mountedValues.color).toBe(comparison.originalValues.color);
    expect(comparison.mountedValues.backgroundColor).toBe(comparison.originalValues.backgroundColor);
    expect(comparison.mountedValues.fontSize).toBe(comparison.originalValues.fontSize);
    expect(comparison.mountedValues.paddingTop).toBe(comparison.originalValues.paddingTop);
    expect(comparison.mountedValues.marginTop).toBe(comparison.originalValues.marginTop);
    expect(comparison.mountedValues.borderRadius).toBe(comparison.originalValues.borderRadius);
    expect(comparison.mountedValues.display).toBe(comparison.originalValues.display);
  });
});
