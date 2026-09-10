import {test, expect} from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const bundlePath = path.resolve('dist/snappysnippet.js');
const bundleCode = fs.readFileSync(bundlePath, 'utf8');

test.describe('SVG & Vector Graphics Subtree', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('about:blank');
    await page.evaluate((code) => {
      const script = document.createElement('script');
      script.textContent = code;
      document.head.appendChild(script);
    }, bundleCode);
  });

  test('preserves inline SVG icon with path and attributes', async ({page}) => {
    const result = await page.evaluate(() => {
      const container = document.createElement('div');
      container.className = 'icon-button-wrapper';
      container.innerHTML = `
        <button class="action-btn" style="display: inline-flex; align-items: center; color: rgb(33, 33, 33); padding: 8px;">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
          <span style="margin-left: 8px;">Next Step</span>
        </button>
      `;
      document.body.appendChild(container);

      const snippet = (window as any).SnappySnippet.extractSnippet(container.firstElementChild);

      // Mount in iframe sandbox
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Cannot access iframe document');

      iframeDoc.open();
      iframeDoc.write(`<!DOCTYPE html><html><head><style>${snippet.css}</style></head><body>${snippet.html}</body></html>`);
      iframeDoc.close();

      const mountedBtn = iframeDoc.body.firstElementChild as HTMLElement;
      const mountedSvg = mountedBtn.querySelector('svg');
      const mountedPath = mountedSvg?.querySelector('path');

      const attributes = {
        hasViewBox: mountedSvg?.getAttribute('viewBox') === '0 0 24 24',
        width: mountedSvg?.getAttribute('width'),
        height: mountedSvg?.getAttribute('height'),
        fill: mountedSvg?.getAttribute('fill'),
        stroke: mountedSvg?.getAttribute('stroke'),
        strokeWidth: mountedSvg?.getAttribute('stroke-width'),
        pathD: mountedPath?.getAttribute('d'),
      };

      const svgStyle = iframe.contentWindow!.getComputedStyle(mountedSvg!);
      const computedStyles = {
        fill: svgStyle.fill,
        stroke: svgStyle.stroke,
      };

      iframe.remove();
      container.remove();

      return {
        html: snippet.html,
        css: snippet.css,
        attributes,
        computedStyles,
      };
    });

    // Check HTML attribute preservation
    expect(result.html).toContain('viewBox="0 0 24 24"');
    expect(result.html).toContain('width="24"');
    expect(result.html).toContain('height="24"');
    expect(result.html).toContain('fill="none"');
    expect(result.html).toContain('stroke="currentColor"');
    expect(result.html).toContain('stroke-width="2"');
    expect(result.html).toContain('d="M5 12h14M12 5l7 7-7 7"');

    // Check attributes evaluated in DOM
    expect(result.attributes.hasViewBox).toBe(true);
    expect(result.attributes.width).toBe('24');
    expect(result.attributes.height).toBe('24');
    expect(result.attributes.fill).toBe('none');
    expect(result.attributes.stroke).toBe('currentColor');
    expect(result.attributes.pathD).toBe('M5 12h14M12 5l7 7-7 7');

    // Check SVG computed styles inside iframe
    expect(result.computedStyles.fill).toBe('none');
    expect(result.computedStyles.stroke).toBe('rgb(33, 33, 33)');
  });

  test('extracts complex multi-shape SVG diagram with circle and rect', async ({page}) => {
    const result = await page.evaluate(() => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="chart-badge" style="background-color: rgb(240, 240, 240); padding: 12px;">
          <svg viewBox="0 0 100 100" width="80" height="80" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="40" fill="rgb(0, 100, 200)" stroke="rgb(0, 50, 100)" stroke-width="4"></circle>
            <rect x="25" y="25" width="50" height="50" fill="rgb(255, 255, 255)"></rect>
          </svg>
        </div>
      `;
      document.body.appendChild(container);

      const snippet = (window as any).SnappySnippet.extractSnippet(container.firstElementChild);

      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Cannot access iframe document');

      iframeDoc.open();
      iframeDoc.write(`<!DOCTYPE html><html><head><style>${snippet.css}</style></head><body>${snippet.html}</body></html>`);
      iframeDoc.close();

      const circle = iframeDoc.body.querySelector('circle');
      const rect = iframeDoc.body.querySelector('rect');

      const circleFill = iframe.contentWindow!.getComputedStyle(circle!).fill;
      const rectFill = iframe.contentWindow!.getComputedStyle(rect!).fill;

      iframe.remove();
      container.remove();

      return {
        html: snippet.html,
        css: snippet.css,
        circleFill,
        rectFill,
      };
    });

    expect(result.html).toContain('circle');
    expect(result.html).toContain('cx="50"');
    expect(result.html).toContain('cy="50"');
    expect(result.html).toContain('r="40"');
    expect(result.html).toContain('rect');
    expect(result.html).toContain('x="25"');
    expect(result.html).toContain('y="25"');

    expect(result.circleFill).toBe('rgb(0, 100, 200)');
    expect(result.rectFill).toBe('rgb(255, 255, 255)');
  });
});
