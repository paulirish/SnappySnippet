'use strict';

export class CSSStringifier {
  static stringify(combinedRules: Record<string, string[]>): string {
    let cssString = '';

    for (const styleKey in combinedRules) {
      if (combinedRules.hasOwnProperty(styleKey)) {
        const selectors = combinedRules[styleKey];
        // The styleKey is a JSON string of the style object. Parse it back.
        const styles = JSON.parse(styleKey);

        if (Object.keys(styles).length === 0) {
          continue; // Skip if no styles are present for this rule
        }

        cssString += `${selectors.join(', ')} {
`;
        for (const property in styles) {
          if (styles.hasOwnProperty(property)) {
            cssString += `  ${property}: ${styles[property]};
`;
          }
        }
        cssString += `}

`;
      }
    }

    return cssString.trim();
  }
}