import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('SnappySnippet Reusable Library', () => {
	test.beforeEach(async ({ page }) => {
		const libraryCode = fs.readFileSync(path.resolve('./dist/snappysnippet.js'), 'utf8');
		await page.goto('https://example.com');
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
				typeof window.SnappySnippet.cleanHtml === 'function' &&
				typeof window.SnappySnippet.DefaultValueFilter === 'function' &&
				typeof window.SnappySnippet.ShorthandPropertyFilter === 'function' &&
				typeof window.SnappySnippet.WebkitPropertiesFilter === 'function' &&
				typeof window.SnappySnippet.SameRulesCombiner === 'function';
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

	test('includeAncestors option includes ancestor markup and styles', async ({ page }) => {
		const result = await page.evaluate(() => {
			const outer = document.createElement('div');
			outer.id = 'ancestor-outer';
			outer.style.backgroundColor = 'rgb(200, 200, 200)';

			const inner = document.createElement('button');
			inner.id = 'target-inner';
			inner.textContent = 'Click me';

			outer.appendChild(inner);
			document.body.appendChild(outer);

			return window.SnappySnippet.extractSnippet(inner, {
				includeAncestors: true
			});
		});

		expect(result.html).toContain('button');
		expect(result.html).toContain('Click me');
		expect(result.css).toBeDefined();
	});

	test('handles pseudo-elements :before and :after', async ({ page }) => {
		const result = await page.evaluate(() => {
			const style = document.createElement('style');
			style.textContent = `
				#pseudo-box::before { content: "BEFORE"; color: rgb(255, 0, 0); }
				#pseudo-box::after { content: "AFTER"; color: rgb(0, 255, 0); }
			`;
			document.head.appendChild(style);

			const div = document.createElement('div');
			div.id = 'pseudo-box';
			div.textContent = 'Main Content';
			document.body.appendChild(div);

			return window.SnappySnippet.extractSnippet(div);
		});

		expect(result.css).toContain(':before');
		expect(result.css).toContain(':after');
	});

	test('converts relative URLs to absolute URLs', async ({ page }) => {
		const result = await page.evaluate(() => {
			const div = document.createElement('div');
			div.innerHTML = '<a href="relative/path.html">Link</a><img src="relative/image.png" />';
			document.body.appendChild(div);

			return window.SnappySnippet.extractSnippet(div);
		});

		expect(result.html).toContain('https://example.com/relative/path.html');
		expect(result.html).toContain('https://example.com/relative/image.png');
	});

	test('SameRulesCombiner merges duplicate CSS rules', async ({ page }) => {
		const combined = await page.evaluate(() => {
			const combiner = new window.SnappySnippet.SameRulesCombiner();
			const styles = [
				{ id: 'DIV_1', node: { color: 'red' }, before: null, after: null },
				{ id: 'DIV_2', node: { color: 'red' }, before: null, after: null }
			];
			return combiner.process(styles);
		});

		expect(combined.length).toBe(1);
		expect(combined[0].id).toEqual(['DIV_1', 'DIV_2']);
	});

	test('WebkitPropertiesFilter strips -webkit- prefixed properties', async ({ page }) => {
		const filtered = await page.evaluate(() => {
			const filter = new window.SnappySnippet.WebkitPropertiesFilter();
			const styles = [
				{ id: 'DIV_1', node: { '-webkit-user-select': 'none', 'color': 'red' } }
			];
			return filter.process(styles);
		});

		expect(filtered[0].node['-webkit-user-select']).toBeUndefined();
		expect(filtered[0].node['color']).toBe('red');
	});

	test('DefaultValueFilter strips browser default properties', async ({ page }) => {
		const filtered = await page.evaluate(() => {
			const filter = new window.SnappySnippet.DefaultValueFilter(document);
			const styles = [
				{ id: 'DIV_1', tagName: 'DIV', node: { display: 'block', color: 'rgb(255, 0, 0)' } }
			];
			const res = filter.process(styles);
			filter.cleanup();
			return res;
		});

		expect(filtered[0].node['display']).toBeUndefined();
		expect(filtered[0].node['color']).toBe('rgb(255, 0, 0)');
	});

	test('throws helpful error when invalid element is provided', async ({ page }) => {
		const errorMessage = await page.evaluate(() => {
			try {
				window.SnappySnippet.extractSnippet(null);
				return null;
			} catch (e) {
				return e.message;
			}
		});

		expect(errorMessage).toContain('requires a valid DOM element or snapshot object');
	});
});
