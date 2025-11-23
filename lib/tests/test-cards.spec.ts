import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// Assuming get-styles.js is bundled and exposed globally as SnappySnippet
// You would typically bundle get-styles.js into an IIFE for browser usage.
// For now, we'll assume it's loaded via a script tag.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('test-cards.html visual regression', () => {
  test('should match inline snapshot for the first card', async ({ page }) => {
    const filePath = path.resolve(__dirname, '../test-cards.html');
    await page.goto(`file://${filePath}`);

    // Load the get-styles.js into the page context
    // This assumes get-styles.js is a simple script that defines global functions
    await page.addScriptTag({ path: path.resolve(__dirname, '../get-styles.js') });

    // Get the first card element
    const firstCard = await page.waitForSelector('.card:first-child');

    // Evaluate getNonDefaultComputedStyles in the page context
    const styles = await page.evaluate((cardElement) => {
      // getNonDefaultComputedStyles is now available globally after scriptTag
      return (window as any).getNonDefaultComputedStyles(cardElement);
    }, firstCard);

    // Match inline snapshot for the styles object
    expect(styles.styles).toMatchInlineSnapshot(`
      Object {
        "-webkit-backdrop-filter": "blur(5px)",
        "-webkit-text-fill-color": "rgb(255, 0, 85)",
        "-webkit-text-stroke-color": "rgb(255, 0, 85)",
        "align-items": "center",
        "animation-duration": "4s",
        "animation-iteration-count": "infinite",
        "animation-name": "glitter",
        "animation-timing-function": "linear",
        "backdrop-filter": "blur(5px)",
        "background-blend-mode": "overlay",
        "background-color": "rgb(255, 0, 85)",
        "background-image": "linear-gradient(to top right, rgb(255, 0, 85), rgb(255, 138, 128))",
        "border": "1px solid rgba(255, 255, 255, 0.2)",
        "border-bottom-left-radius": "15px",
        "border-bottom-right-radius": "15px",
        "border-top-left-radius": "15px",
        "border-top-right-radius": "15px",
        "box-shadow": "rgba(0, 0, 0, 0.4) 0px 10px 20px, rgba(255, 255, 255, 0.2) 0px 0px 0px 1px inset",
        "clip-path": "inset(0px 0px 0px 0px round 15px)",
        "color": "rgb(255, 0, 85)",
        "cursor": "pointer",
        "display": "flex",
        "flex-direction": "column",
        "font-family": "Roboto, sans-serif",
        "height": "225px",
        "justify-content": "space-around",
        "margin": "10px",
        "padding": "10px",
        "perspective-origin": "75px 112.5px",
        "position": "relative",
        "text-shadow": "rgb(255, 0, 85) 0px 0px 10px",
        "transform-style": "preserve-3d",
        "transition-delay": "0s",
        "transition-duration": "0.3s",
        "transition-property": "all",
        "transition-timing-function": "ease-in-out",
        "width": "150px",
        "z-index": "auto",
      }
    `);

    // You might also want to assert on child styles or other properties
    expect(styles.children[0].tagName).toBe('DIV'); // Rank element
    expect(styles.children[0].styles.color).toBe('rgb(255, 0, 85)');
    expect(styles.children[1].tagName).toBe('DIV'); // Suit element
    expect(styles.children[1].styles.color).toBe('rgb(255, 0, 85)');
  });
});
