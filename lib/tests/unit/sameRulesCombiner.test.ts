import {describe, test} from 'node:test';
import assert from 'node:assert/strict';
import {SameRulesCombiner} from '../../src/processing/SameRulesCombiner.ts';
import type {StyleRule} from '../../src/filters/DefaultValueFilter.ts';

describe('SameRulesCombiner', () => {
  describe('process (pipeline)', () => {
    test('combines duplicate style rules into single rule with array of IDs', () => {
      const combiner = new SameRulesCombiner();
      const input: StyleRule[] = [
        {
          id: 'DIV_1',
          tagName: 'DIV',
          node: {color: 'red', margin: '0px'},
          before: null,
          after: null,
        },
        {
          id: 'DIV_2',
          tagName: 'DIV',
          node: {color: 'red', margin: '0px'},
          before: null,
          after: null,
        },
      ];

      const result = combiner.process(input);
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].id, ['DIV_1', 'DIV_2']);
      assert.deepStrictEqual(result[0].node, {color: 'red', margin: '0px'});
    });

    test('combines three or more identical rules', () => {
      const combiner = new SameRulesCombiner();
      const input: StyleRule[] = [
        {id: 'LI_1', node: {padding: '5px'}},
        {id: 'LI_2', node: {padding: '5px'}},
        {id: 'LI_3', node: {padding: '5px'}},
      ];

      const result = combiner.process(input);
      assert.strictEqual(result.length, 1);
      assert.deepStrictEqual(result[0].id, ['LI_1', 'LI_2', 'LI_3']);
    });

    test('keeps distinct rules separate when properties or values differ', () => {
      const combiner = new SameRulesCombiner();
      const input: StyleRule[] = [
        {id: 'DIV_1', node: {color: 'red'}},
        {id: 'DIV_2', node: {color: 'blue'}},
        {id: 'DIV_3', node: {color: 'red', 'font-size': '12px'}},
      ];

      const result = combiner.process(input);
      assert.strictEqual(result.length, 3);
      assert.strictEqual(result[0].id, 'DIV_1');
      assert.strictEqual(result[1].id, 'DIV_2');
      assert.strictEqual(result[2].id, 'DIV_3');
    });

    test('requires both element styles AND pseudo-elements to match to combine', () => {
      const combiner = new SameRulesCombiner();
      const input: StyleRule[] = [
        {
          id: 'SPAN_1',
          node: {color: 'black'},
          before: {content: "'['"},
        },
        {
          id: 'SPAN_2',
          node: {color: 'black'},
          before: {content: "']'"},
        },
      ];

      const result = combiner.process(input);
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].id, 'SPAN_1');
      assert.strictEqual(result[1].id, 'SPAN_2');
    });

    test('handles empty input gracefully', () => {
      const combiner = new SameRulesCombiner();
      assert.deepStrictEqual(combiner.process([]), []);
    });
  });

  describe('combine (stylesById format)', () => {
    test('groups selectors with identical styles under JSON style keys', () => {
      const stylesById = {
        'snappy-1': {
          styles: {color: 'rgb(0, 128, 0)', font: '18px Times'},
          pseudo: {},
        },
        'snappy-2': {
          styles: {color: 'rgb(0, 128, 0)', font: '18px Times'},
          pseudo: {},
        },
        'snappy-3': {
          styles: {color: 'rgb(255, 0, 0)'},
          pseudo: {},
        },
      };

      const combined = SameRulesCombiner.combine(stylesById);
      const keys = Object.keys(combined);
      assert.strictEqual(keys.length, 2);

      const greenKey = JSON.stringify({color: 'rgb(0, 128, 0)', font: '18px Times'});
      assert.deepStrictEqual(combined[greenKey], [
        '[data-snappy-id="snappy-1"]',
        '[data-snappy-id="snappy-2"]',
      ]);

      const redKey = JSON.stringify({color: 'rgb(255, 0, 0)'});
      assert.deepStrictEqual(combined[redKey], [
        '[data-snappy-id="snappy-3"]',
      ]);
    });

    test('resolves #id selectors when IDs do not start with snappy-', () => {
      const stylesById = {
        'DIV_1': {
          styles: {color: 'red'},
          pseudo: {},
        },
        'DIV_2': {
          styles: {color: 'red'},
          pseudo: {},
        },
      };

      const combined = SameRulesCombiner.combine(stylesById);
      const redKey = JSON.stringify({color: 'red'});
      assert.deepStrictEqual(combined[redKey], ['#DIV_1', '#DIV_2']);
    });

    test('resolves [data-snappy-id] selector for prefixed snappy IDs', () => {
      const stylesById = {
        'custom_snappy-1': {
          styles: {display: 'flex'},
          pseudo: {},
        },
      };

      const combined = SameRulesCombiner.combine(stylesById);
      const flexKey = JSON.stringify({display: 'flex'});
      assert.deepStrictEqual(combined[flexKey], ['[data-snappy-id="custom_snappy-1"]']);
    });
  });
});
