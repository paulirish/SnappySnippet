import type {StyleRule} from '../filters/DefaultValueFilter.ts';

function formatSelector(id: string, pseudo = ''): string {
  const base = id.startsWith('#') || id.startsWith('[') || id.startsWith('.')
    ? id
    : `#${id}`;
  return `${base}${pseudo}`;
}

function formatSelectors(ids: string | string[], pseudo = ''): string {
  const list = Array.isArray(ids) ? ids : [ids];
  return list.map(id => formatSelector(id, pseudo)).join(', ');
}

function formatDeclarations(styles: Record<string, string>): string {
  let output = '';
  for (const [prop, val] of Object.entries(styles)) {
    if (val !== undefined && val !== '') {
      output += `  ${prop}: ${val};\n`;
    }
  }
  return output;
}

export class CSSStringifier {
  process(styles: StyleRule[]): string {
    return CSSStringifier.processRules(styles);
  }

  static processRules(styles: StyleRule[]): string {
    let output = '';

    for (const style of styles) {
      if (style.node && Object.keys(style.node).length > 0) {
        const decls = formatDeclarations(style.node);
        if (decls.length > 0) {
          output += `${formatSelectors(style.id)} {\n${decls}}\n\n`;
        }
      }

      if (style.before && Object.keys(style.before).length > 0) {
        const decls = formatDeclarations(style.before);
        if (decls.length > 0) {
          output += `${formatSelectors(style.id, ':before')} {\n${decls}}\n\n`;
        }
      }

      if (style.after && Object.keys(style.after).length > 0) {
        const decls = formatDeclarations(style.after);
        if (decls.length > 0) {
          output += `${formatSelectors(style.id, ':after')} {\n${decls}}\n\n`;
        }
      }
    }

    return output.trim();
  }

  static stringify(combinedRules: Record<string, string[]>): string {
    let cssString = '';

    for (const styleKey of Object.keys(combinedRules)) {
      const selectors = combinedRules[styleKey];
      if (!selectors || selectors.length === 0) {
        continue;
      }

      try {
        const styles = JSON.parse(styleKey) as Record<string, string>;
        if (Object.keys(styles).length === 0) {
          continue;
        }

        const decls = formatDeclarations(styles);
        if (decls.length > 0) {
          cssString += `${selectors.join(', ')} {\n${decls}}\n\n`;
        }
      } catch {
        continue;
      }
    }

    return cssString.trim();
  }
}
