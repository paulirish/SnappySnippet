import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('SnappySnippet Reusable Library', () => {
	test.beforeEach(async ({ page }) => {
		const libraryCode = fs.readFileSync(path.resolve('./dist/snappysnippet.js'), 'utf8');
		await page.goto('about:blank');
		await page.evaluate((code) => {
			const script = document.createElement('script');
			script.textContent = code;
			document.head.appendChild(script);
		}, libraryCode);
	});

	test('exposes SnappySnippet library API on window', async ({ page }) => {
		const isDefined = await page.evaluate(() => {
			return typeof window.SnappySnippet !== 'undefined' &&
				typeof window.SnappySnippet.extractSnippet === 'function' &&
				typeof window.SnappySnippet.Snapshooter === 'function' &&
				typeof window.SnappySnippet.cleanHtml === 'function';
		});
		expect(isDefined).toBe(true);
	});

	test('extracts HTML and CSS from a target element', async ({ page }) => {
		const result = await page.evaluate(() => {
			const container = document.createElement('div');
			container.id = 'test-container';
			container.style.color = 'rgb(255, 0, 0)';
			container.style.fontSize = '20px';
			container.innerHTML = '<span class="child-class" style="font-weight: bold;">Hello World</span>';
			document.body.appendChild(container);

			const extracted = window.SnappySnippet.extractSnippet(container, {
				removeDefaultValues: true,
				propertiesCleanUp: true,
				removeWebkitProperties: true,
				combineSameRules: true,
				fixHTMLIndentation: true,
				idPrefix: 'custom_'
			});

			return extracted;
		});

		expect(result.html).toContain('<div id="custom_DIV_1">');
		expect(result.html).toContain('Hello World');
		expect(result.html).not.toContain('class="child-class"'); // class attribute stripped
		expect(result.css).toContain('color: rgb(255, 0, 0);');
	});

	test('cleanHtml formats HTML and removes disallowed attributes', async ({ page }) => {
		const cleaned = await page.evaluate(() => {
			const rawHtml = '<div class="foo" style="color:red;" id="bar" data-test="123"><span>Test</span></div>';
			return window.SnappySnippet.cleanHtml(rawHtml);
		});

		expect(cleaned).toContain('<div id="bar">');
		expect(cleaned).not.toContain('class="foo"');
		expect(cleaned).not.toContain('data-test');
	});

	test('embedCSS option embeds CSS in style tag', async ({ page }) => {
		const result = await page.evaluate(() => {
			const el = document.createElement('p');
			el.textContent = 'Embedded CSS Test';
			el.style.color = 'rgb(0, 0, 255)';
			document.body.appendChild(el);

			return window.SnappySnippet.extractSnippet(el, {
				embedCSS: true
			});
		});

		expect(result.css).toBe('');
		expect(result.html).toContain('<style type="text/css">');
		expect(result.html).toContain('color: rgb(0, 0, 255);');
		expect(result.html).toContain('Embedded CSS Test');
	});
});
