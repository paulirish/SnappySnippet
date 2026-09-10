import {DEFAULT_SHORTHANDS} from '../cssMetadata.ts';
import type {StyleRule} from './DefaultValueFilter.ts';

export class ShorthandPropertyFilter {
  cssShorthands: Map<string, string[]>;
  cssShorthandsForLonghand: Map<string, Set<string>>;

  private static BORDER_LONGHANDS_TO_REMOVE = [
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'border-top-style',
    'border-right-style',
    'border-bottom-style',
    'border-left-style',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'border-width',
    'border-style',
    'border-color',
    'border-top',
    'border-right',
    'border-bottom',
    'border-left',
    'border-block-start',
    'border-block-end',
    'border-inline-start',
    'border-inline-end',
    'border-block-start-width',
    'border-block-end-width',
    'border-inline-start-width',
    'border-inline-end-width',
    'border-block-start-style',
    'border-block-end-style',
    'border-inline-start-style',
    'border-inline-end-style',
    'border-block-start-color',
    'border-block-end-color',
    'border-inline-start-color',
    'border-inline-end-color',
    'border-block',
    'border-inline',
  ];

  constructor(
    cssShorthandsOrXdata?:
      | Map<string, string[]>
      | Record<string, string[]>
      | {cssShorthands?: Map<string, string[]> | Record<string, string[]>; cssShorthandsForLonghand?: Map<string, Set<string>>}
      | null,
    cssShorthandsForLonghand?: Map<string, Set<string>> | null
  ) {
    this.cssShorthands = new Map();
    this.cssShorthandsForLonghand = cssShorthandsForLonghand ?? new Map();

    if (cssShorthandsOrXdata instanceof Map) {
      this.cssShorthands = new Map(cssShorthandsOrXdata);
    } else if (cssShorthandsOrXdata && typeof cssShorthandsOrXdata === 'object') {
      if ('cssShorthands' in cssShorthandsOrXdata && cssShorthandsOrXdata.cssShorthands) {
        const raw = cssShorthandsOrXdata.cssShorthands;
        if (raw instanceof Map) {
          this.cssShorthands = new Map(raw);
        } else if (Array.isArray(raw)) {
          for (const item of raw) {
            if (Array.isArray(item) && item.length === 2) {
              this.cssShorthands.set(item[0] as string, item[1] as string[]);
            }
          }
        } else {
          for (const [key, val] of Object.entries(raw)) {
            this.cssShorthands.set(key, val as string[]);
          }
        }
        if (cssShorthandsOrXdata.cssShorthandsForLonghand instanceof Map) {
          this.cssShorthandsForLonghand = new Map(cssShorthandsOrXdata.cssShorthandsForLonghand);
        }
      } else {
        for (const [key, val] of Object.entries(cssShorthandsOrXdata as Record<string, string[]>)) {
          this.cssShorthands.set(key, val);
        }
      }
    }

    if (this.cssShorthands.size === 0) {
      for (const [key, val] of Object.entries(DEFAULT_SHORTHANDS)) {
        this.cssShorthands.set(key, [...val]);
      }
    }

    if (this.cssShorthandsForLonghand.size === 0) {
      for (const [shorthand, longhands] of this.cssShorthands.entries()) {
        for (const longhand of longhands) {
          const set = this.cssShorthandsForLonghand.get(longhand);
          if (set) {
            set.add(shorthand);
          } else {
            this.cssShorthandsForLonghand.set(longhand, new Set([shorthand]));
          }
        }
      }
    }
  }

  apply(styles: Record<string, string>): Record<string, string> {
    const filteredStyles = {...styles};
    const presentShorthands = new Set<string>();

    for (const property in filteredStyles) {
      if (this.cssShorthands.has(property) && filteredStyles[property]) {
        presentShorthands.add(property);
      }
    }

    for (const shorthand of presentShorthands) {
      if (shorthand === 'border' && filteredStyles[shorthand]) {
        for (const longhand of ShorthandPropertyFilter.BORDER_LONGHANDS_TO_REMOVE) {
          delete filteredStyles[longhand];
        }
      } else {
        const immediateLonghands = this.cssShorthands.get(shorthand);
        if (immediateLonghands) {
          for (const longhand of immediateLonghands) {
            delete filteredStyles[longhand];
          }
        }

        for (const potentialLonghand in filteredStyles) {
          if (potentialLonghand === shorthand) continue;

          if (this.cssShorthandsForLonghand.get(potentialLonghand)?.has(shorthand)) {
            delete filteredStyles[potentialLonghand];
          }
        }
      }
    }

    return filteredStyles;
  }

  process(styles: StyleRule[]): StyleRule[] {
    const output: StyleRule[] = [];

    for (const rule of styles) {
      output.push({
        id: rule.id,
        tagName: rule.tagName,
        node: rule.node ? this.apply(rule.node) : null,
        before: rule.before ? this.apply(rule.before) : null,
        after: rule.after ? this.apply(rule.after) : null,
      });
    }

    return output;
  }
}
