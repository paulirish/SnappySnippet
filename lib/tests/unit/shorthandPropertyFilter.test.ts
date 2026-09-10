import {describe, test} from 'node:test';
import assert from 'node:assert/strict';
import {ShorthandPropertyFilter} from '../../src/filters/ShorthandPropertyFilter.ts';
import type {StyleRule} from '../../src/filters/DefaultValueFilter.ts';

describe('ShorthandPropertyFilter', () => {
  test('strips margin longhands when asymmetric margin shorthand is present', () => {
    const filter = new ShorthandPropertyFilter();
    const input = {
      margin: '10px 20px 30px 40px',
      'margin-top': '10px',
      'margin-right': '20px',
      'margin-bottom': '30px',
      'margin-left': '40px',
      color: 'rgb(0, 0, 0)',
    };

    const output = filter.apply(input);

    assert.strictEqual(output.margin, '10px 20px 30px 40px');
    assert.strictEqual(output['margin-top'], undefined);
    assert.strictEqual(output['margin-right'], undefined);
    assert.strictEqual(output['margin-bottom'], undefined);
    assert.strictEqual(output['margin-left'], undefined);
    assert.strictEqual(output.color, 'rgb(0, 0, 0)');
  });

  test('strips padding longhands when 2-value asymmetric padding shorthand is present', () => {
    const filter = new ShorthandPropertyFilter();
    const input = {
      padding: '5px 15px',
      'padding-top': '5px',
      'padding-right': '15px',
      'padding-bottom': '5px',
      'padding-left': '15px',
    };

    const output = filter.apply(input);

    assert.strictEqual(output.padding, '5px 15px');
    assert.strictEqual(output['padding-top'], undefined);
    assert.strictEqual(output['padding-right'], undefined);
    assert.strictEqual(output['padding-bottom'], undefined);
    assert.strictEqual(output['padding-left'], undefined);
  });

  test('strips border-radius corner longhands when multi-value border-radius is present', () => {
    const filter = new ShorthandPropertyFilter();
    const input = {
      'border-radius': '4px 8px 12px 16px',
      'border-top-left-radius': '4px',
      'border-top-right-radius': '8px',
      'border-bottom-right-radius': '12px',
      'border-bottom-left-radius': '16px',
    };

    const output = filter.apply(input);

    assert.strictEqual(output['border-radius'], '4px 8px 12px 16px');
    assert.strictEqual(output['border-top-left-radius'], undefined);
    assert.strictEqual(output['border-top-right-radius'], undefined);
    assert.strictEqual(output['border-bottom-right-radius'], undefined);
    assert.strictEqual(output['border-bottom-left-radius'], undefined);
  });

  test('strips background longhands when composite background shorthand is present', () => {
    const filter = new ShorthandPropertyFilter();
    const input = {
      background: 'rgb(255, 0, 0) url("image.png") repeat-x scroll 0% 0%',
      'background-color': 'rgb(255, 0, 0)',
      'background-image': 'url("image.png")',
      'background-repeat': 'repeat-x',
      'background-attachment': 'scroll',
      'background-position': '0% 0%',
      'background-size': 'auto',
      'background-clip': 'border-box',
      'background-origin': 'padding-box',
    };

    const output = filter.apply(input);

    assert.strictEqual(output.background, 'rgb(255, 0, 0) url("image.png") repeat-x scroll 0% 0%');
    assert.strictEqual(output['background-color'], undefined);
    assert.strictEqual(output['background-image'], undefined);
    assert.strictEqual(output['background-repeat'], undefined);
    assert.strictEqual(output['background-attachment'], undefined);
    assert.strictEqual(output['background-position'], undefined);
  });

  test('strips font longhands when composite font shorthand is present', () => {
    const filter = new ShorthandPropertyFilter();
    const input = {
      font: 'italic bold 16px/1.5 sans-serif',
      'font-style': 'italic',
      'font-weight': 'bold',
      'font-size': '16px',
      'line-height': '1.5',
      'font-family': 'sans-serif',
    };

    const output = filter.apply(input);

    assert.strictEqual(output.font, 'italic bold 16px/1.5 sans-serif');
    assert.strictEqual(output['font-style'], undefined);
    assert.strictEqual(output['font-weight'], undefined);
    assert.strictEqual(output['font-size'], undefined);
    assert.strictEqual(output['line-height'], undefined);
    assert.strictEqual(output['font-family'], undefined);
  });

  test('strips directional border longhands when border-top shorthand is present', () => {
    const filter = new ShorthandPropertyFilter();
    const input = {
      'border-top': '2px dashed rgb(0, 128, 0)',
      'border-top-width': '2px',
      'border-top-style': 'dashed',
      'border-top-color': 'rgb(0, 128, 0)',
      'border-bottom-width': '1px',
    };

    const output = filter.apply(input);

    assert.strictEqual(output['border-top'], '2px dashed rgb(0, 128, 0)');
    assert.strictEqual(output['border-top-width'], undefined);
    assert.strictEqual(output['border-top-style'], undefined);
    assert.strictEqual(output['border-top-color'], undefined);
    assert.strictEqual(output['border-bottom-width'], '1px');
  });

  test('strips all directional and sub-property border longhands when full border is present', () => {
    const filter = new ShorthandPropertyFilter();
    const input = {
      border: '1px solid rgb(0, 0, 0)',
      'border-top': '1px solid rgb(0, 0, 0)',
      'border-right': '1px solid rgb(0, 0, 0)',
      'border-bottom': '1px solid rgb(0, 0, 0)',
      'border-left': '1px solid rgb(0, 0, 0)',
      'border-width': '1px',
      'border-style': 'solid',
      'border-color': 'rgb(0, 0, 0)',
      'border-top-width': '1px',
      'border-top-style': 'solid',
      'border-top-color': 'rgb(0, 0, 0)',
    };

    const output = filter.apply(input);

    assert.strictEqual(output.border, '1px solid rgb(0, 0, 0)');
    assert.strictEqual(output['border-top'], undefined);
    assert.strictEqual(output['border-right'], undefined);
    assert.strictEqual(output['border-bottom'], undefined);
    assert.strictEqual(output['border-left'], undefined);
    assert.strictEqual(output['border-width'], undefined);
    assert.strictEqual(output['border-style'], undefined);
    assert.strictEqual(output['border-color'], undefined);
    assert.strictEqual(output['border-top-width'], undefined);
  });

  test('processes StyleRule array in pipeline correctly', () => {
    const filter = new ShorthandPropertyFilter();
    const rules: StyleRule[] = [
      {
        id: '#DIV_1',
        node: {
          margin: '8px 16px',
          'margin-top': '8px',
          'margin-right': '16px',
          'margin-bottom': '8px',
          'margin-left': '16px',
        },
        before: {
          padding: '4px',
          'padding-top': '4px',
          'padding-bottom': '4px',
        },
        after: null,
      },
    ];

    const processed = filter.process(rules);

    assert.strictEqual(processed.length, 1);
    assert.strictEqual(processed[0].node?.margin, '8px 16px');
    assert.strictEqual(processed[0].node?.['margin-top'], undefined);
    assert.strictEqual(processed[0].before?.padding, '4px');
    assert.strictEqual(processed[0].before?.['padding-top'], undefined);
  });
});
