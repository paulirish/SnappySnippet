'use strict';

export class SameRulesCombiner {
  static combine(stylesById: Record<string, any>): Record<string, string[]> {
    const combinedRules: Record<string, string[]> = {};

    for (const snappyId in stylesById) {
      if (stylesById.hasOwnProperty(snappyId)) {
        const {styles, pseudo} = stylesById[snappyId];

        // Process main element styles
        const styleKey = JSON.stringify(styles);
        if (!combinedRules[styleKey]) {
          combinedRules[styleKey] = [];
        }
        combinedRules[styleKey].push(`[data-snappy-id="${snappyId}"]`);

        // Process pseudo-element styles
        for (const pseudoElement in pseudo) {
          if (pseudo.hasOwnProperty(pseudoElement)) {
            const pseudoStyleKey = JSON.stringify(pseudo[pseudoElement]);
            if (!combinedRules[pseudoStyleKey]) {
              combinedRules[pseudoStyleKey] = [];
            }
            combinedRules[pseudoStyleKey].push(`[data-snappy-id="${snappyId}"]${pseudoElement}`);
          }
        }
      }
    }
    return combinedRules;
  }
}
