'use strict';

export class ShorthandPropertyFilter {
  cssShorthands: Map<string, string[]>;
  cssShorthandsForLonghand: Map<string, Set<string>>;
  // Hardcoded list of border-related longhands for comprehensive filtering.
  // This addresses cases where dynamic generation might miss some complex relationships.
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
    // Also consider logical properties that might be returned by getComputedStyle
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

  constructor(cssShorthands: Map<string, string[]>, cssShorthandsForLonghand: Map<string, Set<string>>) {
    this.cssShorthands = cssShorthands;
    this.cssShorthandsForLonghand = cssShorthandsForLonghand;
  }

  apply(styles: Record<string, string>): Record<string, string> {
    const filteredStyles = {...styles};

    const presentShorthands = new Set<string>();

    // Identify all present shorthand properties
    for (const property in filteredStyles) {
      if (this.cssShorthands.has(property)) {
        presentShorthands.add(property);
      }
    }

    // For each present shorthand, remove its corresponding longhand properties
    for (const shorthand of presentShorthands) {
      if (shorthand === 'border' && filteredStyles[shorthand]) {
        for (const longhand of ShorthandPropertyFilter.BORDER_LONGHANDS_TO_REMOVE) {
          delete filteredStyles[longhand];
        }
      } else {
        // Remove immediate longhands defined by cssShorthands map
        const immediateLonghands = this.cssShorthands.get(shorthand);
        if (immediateLonghands) {
          for (const longhand of immediateLonghands) {
            delete filteredStyles[longhand];
          }
        }

        // Also, iterate through all other styles and remove them if they are longhands of the current shorthand
        for (const potentialLonghand in filteredStyles) {
          if (potentialLonghand === shorthand) continue; // Don't delete the shorthand itself

          if (this.cssShorthandsForLonghand.get(potentialLonghand)?.has(shorthand)) {
            delete filteredStyles[potentialLonghand];
          }
        }
      }
    }
    return filteredStyles;
  }
}