import type {StyleRule} from '../filters/DefaultValueFilter.ts';

function compareObjects(
  a: Record<string, string> | null | undefined,
  b: Record<string, string> | null | undefined
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

export class SameRulesCombiner {
  process(styles: StyleRule[]): StyleRule[] {
    return SameRulesCombiner.processRules(styles);
  }

  static processRules(styles: StyleRule[]): StyleRule[] {
    const copy: StyleRule[] = styles.map(s => ({
      id: Array.isArray(s.id) ? [...s.id] : s.id,
      tagName: s.tagName,
      node: s.node ? {...s.node} : null,
      before: s.before ? {...s.before} : null,
      after: s.after ? {...s.after} : null,
    }));

    const output: StyleRule[] = [];

    for (let i = 0; i < copy.length; i++) {
      const ruleA = copy[i];
      const ids: string[] = Array.isArray(ruleA.id) ? [...ruleA.id] : [ruleA.id];

      for (let j = i + 1; j < copy.length; j++) {
        const ruleB = copy[j];

        if (
          compareObjects(ruleA.node, ruleB.node) &&
          compareObjects(ruleA.before, ruleB.before) &&
          compareObjects(ruleA.after, ruleB.after)
        ) {
          if (Array.isArray(ruleB.id)) {
            ids.push(...ruleB.id);
          } else {
            ids.push(ruleB.id);
          }
          copy.splice(j, 1);
          j--;
        }
      }

      output.push({
        id: ids.length === 1 ? ids[0] : ids,
        tagName: ruleA.tagName,
        node: ruleA.node,
        before: ruleA.before,
        after: ruleA.after,
      });
    }

    return output;
  }

  static combine(
    stylesById: Record<string, {styles: Record<string, string>; pseudo: Record<string, Record<string, string>>}>
  ): Record<string, string[]> {
    const combinedRules: Record<string, string[]> = {};

    for (const snappyId of Object.keys(stylesById)) {
      const {styles, pseudo} = stylesById[snappyId];

      const baseSelector = snappyId.startsWith('#') || snappyId.startsWith('[')
        ? snappyId
        : (snappyId.includes('snappy-') ? `[data-snappy-id="${snappyId}"]` : `#${snappyId}`);

      if (styles && Object.keys(styles).length > 0) {
        const styleKey = JSON.stringify(styles);
        if (!combinedRules[styleKey]) {
          combinedRules[styleKey] = [];
        }
        combinedRules[styleKey].push(baseSelector);
      }

      if (pseudo) {
        for (const pseudoElement of Object.keys(pseudo)) {
          const pseudoStyles = pseudo[pseudoElement];
          if (pseudoStyles && Object.keys(pseudoStyles).length > 0) {
            const pseudoKey = JSON.stringify(pseudoStyles);
            if (!combinedRules[pseudoKey]) {
              combinedRules[pseudoKey] = [];
            }
            combinedRules[pseudoKey].push(`${baseSelector}${pseudoElement}`);
          }
        }
      }
    }

    return combinedRules;
  }
}
