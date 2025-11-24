"use strict";

export class SameRulesCombiner {
  static combine(stylesById: Record<string, any>): Record<string, string[]> {
    const combinedRules: Record<string, string[]> = {};

    for (const snappyId in stylesById) {
      if (stylesById.hasOwnProperty(snappyId)) {
        const elementStyles = stylesById[snappyId].styles;
        const elementPseudo = stylesById[snappyId].pseudo;

        // Process element styles
        if (Object.keys(elementStyles).length > 0) {
          const stylesKey = JSON.stringify(elementStyles);
          if (combinedRules[stylesKey]) {
            combinedRules[stylesKey].push(`[data-snappy-id="${snappyId}"]`);
          } else {
            combinedRules[stylesKey] = [`[data-snappy-id="${snappyId}"]`];
          }
        }

        // Process pseudo-element styles
        for (const pseudoElement in elementPseudo) {
          if (elementPseudo.hasOwnProperty(pseudoElement)) {
            const pseudoStyles = elementPseudo[pseudoElement];
            if (Object.keys(pseudoStyles).length > 0) {
              const pseudoStylesKey = JSON.stringify(pseudoStyles);
              const pseudoSelector = `[data-snappy-id="${snappyId}"]${pseudoElement}`;
              if (combinedRules[pseudoStylesKey]) {
                combinedRules[pseudoStylesKey].push(pseudoSelector);
              } else {
                combinedRules[pseudoStylesKey] = [pseudoSelector];
              }
            }
          }
        }
      }
    }
    return combinedRules;
  }
}
