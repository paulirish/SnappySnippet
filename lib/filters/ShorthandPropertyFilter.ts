'use strict';

export class ShorthandPropertyFilter {
  cssShorthands: Map<string, string[]>;

  constructor(cssShorthands: Map<string, string[]>) {
    this.cssShorthands = cssShorthands;
  }

  apply(styles: Record<string, string>): Record<string, string> {
    const filteredStyles = {...styles};

    for (const [shorthand, longhands] of this.cssShorthands.entries()) {
      // If the shorthand property exists in the styles, remove its corresponding longhands
      if (filteredStyles[shorthand]) {
        for (const longhand of longhands) {
          delete filteredStyles[longhand];
        }
      }
    }
    return filteredStyles;
  }
}