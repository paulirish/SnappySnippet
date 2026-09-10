import type {StyleRule} from './DefaultValueFilter.ts';

export const MODERN_BROWSER_NOISE_PROPERTIES = new Set([
  'inline-size',
  'block-size',
  'min-inline-size',
  'min-block-size',
  'max-inline-size',
  'max-block-size',
  'caret-color',
  '-webkit-text-fill-color',
  '-webkit-text-stroke-color',
  '-webkit-user-modify',
  'margin-block',
  'margin-block-start',
  'margin-block-end',
  'margin-inline',
  'margin-inline-start',
  'margin-inline-end',
  'padding-block',
  'padding-block-start',
  'padding-block-end',
  'padding-inline',
  'padding-inline-start',
  'padding-inline-end',
  'border-block',
  'border-block-color',
  'border-block-style',
  'border-block-width',
  'border-block-start',
  'border-block-start-color',
  'border-block-start-style',
  'border-block-start-width',
  'border-block-end',
  'border-block-end-color',
  'border-block-end-style',
  'border-block-end-width',
  'border-inline',
  'border-inline-color',
  'border-inline-style',
  'border-inline-width',
  'border-inline-start',
  'border-inline-start-color',
  'border-inline-start-style',
  'border-inline-start-width',
  'border-inline-end',
  'border-inline-end-color',
  'border-inline-end-style',
  'border-inline-end-width',
  'border-start-start-radius',
  'border-start-end-radius',
  'border-end-start-radius',
  'border-end-end-radius',
  'inset-block',
  'inset-block-start',
  'inset-block-end',
  'inset-inline',
  'inset-inline-start',
  'inset-inline-end',
  'overflow-block',
  'overflow-inline',
  'column-rule',
  'column-rule-color',
  'column-rule-style',
  'column-rule-width',
  'text-emphasis',
  'text-emphasis-color',
  'text-emphasis-style',
  'text-decoration-color',
]);

export interface ModernNoiseFilterOptions {
  preserveDimensions?: boolean;
}

export class ModernNoiseFilter {
  static pruneStyles(
    styles: Record<string, string>,
    options: ModernNoiseFilterOptions = {}
  ): Record<string, string> {
    const output: Record<string, string> = {};

    for (const [prop, val] of Object.entries(styles)) {
      if (MODERN_BROWSER_NOISE_PROPERTIES.has(prop)) {
        continue;
      }
      output[prop] = val;
    }

    if (!options.preserveDimensions) {
      delete output['width'];
      delete output['height'];
    }

    if (!output['transform'] || output['transform'] === 'none') {
      delete output['transform-origin'];
    }

    if (!output['perspective'] || output['perspective'] === 'none') {
      delete output['perspective-origin'];
    }

    return output;
  }

  static process(
    styles: StyleRule[],
    options: ModernNoiseFilterOptions = {}
  ): StyleRule[] {
    const output: StyleRule[] = [];

    for (const rule of styles) {
      output.push({
        id: rule.id,
        tagName: rule.tagName,
        node: rule.node ? ModernNoiseFilter.pruneStyles(rule.node, options) : null,
        before: rule.before ? ModernNoiseFilter.pruneStyles(rule.before, options) : null,
        after: rule.after ? ModernNoiseFilter.pruneStyles(rule.after, options) : null,
      });
    }

    return output;
  }
}
