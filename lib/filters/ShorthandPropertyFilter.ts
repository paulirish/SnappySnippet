'use strict';

export class ShorthandPropertyFilter {
  private cssShorthands: Map<string, string[]>;

  constructor(cssShorthands: Map<string, string[]>) {
    this.cssShorthands = cssShorthands;
  }

  apply(styles: Record<string, string>): Record<string, string> {
    const filteredStyles = {...styles};

    for (const [shorthand, longhands] of this.cssShorthands.entries()) {
      if (filteredStyles[shorthand]) {
        // If the shorthand is present, remove all its corresponding longhands
        for (const longhand of longhands) {
          delete filteredStyles[longhand];
        }
      }
    }
    return filteredStyles;
  }
}
