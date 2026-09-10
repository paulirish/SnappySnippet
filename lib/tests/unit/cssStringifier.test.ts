import {describe, test} from 'node:test';
import assert from 'node:assert/strict';
import {CSSStringifier} from '../../src/processing/CSSStringifier.ts';
import type {StyleRule} from '../../src/filters/DefaultValueFilter.ts';

describe('CSSStringifier', () => {
  describe('process (StyleRule[] pipeline)', () => {
    test('formats simple style rule with indentation', () => {
      const stringifier = new CSSStringifier();
      const rules: StyleRule[] = [
        {
          id: 'DIV_1',
          tagName: 'DIV',
          node: {color: 'rgb(255, 0, 0)', 'font-size': '16px'},
          before: null,
          after: null,
        },
      ];

      const result = stringifier.process(rules);
      const expected = [
        '#DIV_1 {',
        '  color: rgb(255, 0, 0);',
        '  font-size: 16px;',
        '}',
      ].join('\n');

      assert.strictEqual(result, expected);
    });

    test('formats multiple combined IDs with comma separation', () => {
      const stringifier = new CSSStringifier();
      const rules: StyleRule[] = [
        {
          id: ['DIV_1', 'DIV_2'],
          tagName: 'DIV',
          node: {margin: '10px'},
          before: null,
          after: null,
        },
      ];

      const result = stringifier.process(rules);
      assert.ok(result.startsWith('#DIV_1, #DIV_2 {'));
      assert.ok(result.includes('  margin: 10px;'));
    });

    test('formats pseudo-element blocks with appropriate pseudo selectors', () => {
      const stringifier = new CSSStringifier();
      const rules: StyleRule[] = [
        {
          id: 'SPAN_1',
          tagName: 'SPAN',
          node: {color: 'blue'},
          before: {content: "'['", color: 'gray'},
          after: {content: "']'", color: 'gray'},
        },
      ];

      const result = stringifier.process(rules);
      assert.ok(result.includes('#SPAN_1 {'));
      assert.ok(result.includes('#SPAN_1:before {'));
      assert.ok(result.includes("  content: '[';"));
      assert.ok(result.includes('#SPAN_1:after {'));
      assert.ok(result.includes("  content: ']';"));
    });

    test('preserves attribute selectors without prepending hash', () => {
      const stringifier = new CSSStringifier();
      const rules: StyleRule[] = [
        {
          id: '[data-snappy-id="snappy-1"]',
          tagName: 'DIV',
          node: {display: 'flex'},
          before: null,
          after: null,
        },
      ];

      const result = stringifier.process(rules);
      assert.ok(result.startsWith('[data-snappy-id="snappy-1"] {'));
      assert.ok(!result.includes('#[data-snappy-id'));
    });

    test('skips empty rule blocks', () => {
      const stringifier = new CSSStringifier();
      const rules: StyleRule[] = [
        {
          id: 'DIV_1',
          tagName: 'DIV',
          node: {},
          before: null,
          after: null,
        },
        {
          id: 'DIV_2',
          tagName: 'DIV',
          node: {color: 'black'},
          before: null,
          after: null,
        },
      ];

      const result = stringifier.process(rules);
      assert.ok(!result.includes('#DIV_1'));
      assert.ok(result.includes('#DIV_2 {'));
    });
  });

  describe('stringify (Static map-based)', () => {
    test('stringifies combined rules map correctly', () => {
      const combined = {
        '{"color":"red","font-size":"14px"}': ['#DIV_1', '#DIV_2'],
      };

      const result = CSSStringifier.stringify(combined);
      assert.ok(result.includes('#DIV_1, #DIV_2 {'));
      assert.ok(result.includes('  color: red;'));
      assert.ok(result.includes('  font-size: 14px;'));
    });

    test('returns empty string for empty map or empty style objects', () => {
      assert.strictEqual(CSSStringifier.stringify({}), '');
      assert.strictEqual(CSSStringifier.stringify({'{}': ['#DIV_1']}), '');
    });
  });
});
