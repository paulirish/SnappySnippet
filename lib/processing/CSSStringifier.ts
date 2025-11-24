'use strict';

export class CSSStringifier {
  static stringify(combinedCssRules: Record<string, string[]>): string {
    let cssString = '';

    for (const ruleKey in combinedCssRules) {
      if (combinedCssRules.hasOwnProperty(ruleKey)) {
        const selectors = combinedCssRules[ruleKey];
        const styles = JSON.parse(ruleKey);

        if (Object.keys(styles).length === 0) {
          continue; // Skip empty style blocks
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
    return cssString;
  }
}
