import {test, expect} from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const bundlePath = path.resolve('dist/snappysnippet.js');
const bundleCode = fs.readFileSync(bundlePath, 'utf8');
const fixturesHtmlPath = path.resolve('lib/tests/fixtures/fancycards.html');

const CARD_SUITS = ['spades', 'hearts', 'diamonds', 'clubs', 'joker'] as const;

test.describe('Real-World Component Fixtures - Fancy 3D Cards', () => {
  test.beforeEach(async ({page}) => {
    await page.goto(`file://${fixturesHtmlPath}`);
    await page.evaluate((code) => {
      const script = document.createElement('script');
      script.textContent = code;
      document.head.appendChild(script);
    }, bundleCode);
  });

  for (const suit of CARD_SUITS) {
    test(`extracts and renders card[data-suit="${suit}"] with style fidelity in iframe sandbox`, async ({page}) => {
      const comparison = await page.evaluate((targetSuit) => {
        const card = document.querySelector(`.card[data-suit="${targetSuit}"]`);
        if (!card) throw new Error(`Card with suit ${targetSuit} not found`);

        // 1. Measure in-situ styles of the original card
        const origStyle = window.getComputedStyle(card);
        const origCardValues = {
          position: origStyle.position,
          borderRadius: origStyle.borderRadius,
          flexShrink: origStyle.flexShrink,
          transformStyle: origStyle.transformStyle,
        };

        // Measure child element styles (.card__name)
        const nameEl = card.querySelector('.card__name');
        let origNameValues: {fontSize: string; textTransform: string} | null = null;
        if (nameEl) {
          const nameStyle = window.getComputedStyle(nameEl);
          origNameValues = {
            fontSize: nameStyle.fontSize,
            textTransform: nameStyle.textTransform,
          };
        }

        // 2. Extract snippet
        const snippet = (window as any).SnappySnippet.extractSnippet(card);

        // 3. Mount in fresh iframe sandbox
        const iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        const iframeDoc = iframe.contentWindow?.document;
        if (!iframeDoc) throw new Error('Cannot access iframe document');

        iframeDoc.open();
        iframeDoc.write(`<!DOCTYPE html><html><head><style>${snippet.css}</style></head><body>${snippet.html}</body></html>`);
        iframeDoc.close();

        const mountedCard = iframeDoc.body.firstElementChild as HTMLElement;
        const mountedStyle = iframe.contentWindow!.getComputedStyle(mountedCard);
        const mountedCardValues = {
          position: mountedStyle.position,
          borderRadius: mountedStyle.borderRadius,
          flexShrink: mountedStyle.flexShrink,
          transformStyle: mountedStyle.transformStyle,
        };

        let mountedNameValues: {fontSize: string; textTransform: string} | null = null;
        for (const el of iframeDoc.body.querySelectorAll('*')) {
          if (nameEl && el.textContent === nameEl.textContent) {
            const elStyle = iframe.contentWindow!.getComputedStyle(el);
            mountedNameValues = {
              fontSize: elStyle.fontSize,
              textTransform: elStyle.textTransform,
            };
            break;
          }
        }

        iframe.remove();

        return {
          html: snippet.html,
          css: snippet.css,
          origCardValues,
          mountedCardValues,
          origNameValues,
          mountedNameValues,
        };
      }, suit);

      // Assert non-empty and well-formed outputs
      expect(comparison.html).toBeDefined();
      expect(comparison.html.length).toBeGreaterThan(0);
      expect(comparison.css).toBeDefined();
      expect(comparison.css.length).toBeGreaterThan(0);
      expect(comparison.html).toMatch(/<div [^>]*id="DIV_\d+"[^>]*>/);

      // Assert core computed style fidelity on card root
      expect(comparison.mountedCardValues.position).toBe(comparison.origCardValues.position);
      expect(comparison.mountedCardValues.borderRadius).toBe(comparison.origCardValues.borderRadius);
      expect(comparison.mountedCardValues.flexShrink).toBe(comparison.origCardValues.flexShrink);
      expect(comparison.mountedCardValues.transformStyle).toBe(comparison.origCardValues.transformStyle);

      // Assert child element fidelity
      if (comparison.origNameValues && comparison.mountedNameValues) {
        expect(comparison.mountedNameValues.fontSize).toBe(comparison.origNameValues.fontSize);
        expect(comparison.mountedNameValues.textTransform).toBe(comparison.origNameValues.textTransform);
      }
    });
  }
});
