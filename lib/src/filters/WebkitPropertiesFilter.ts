import type {StyleRule} from './DefaultValueFilter.ts';

export class WebkitPropertiesFilter {
  apply(styles: Record<string, string>): Record<string, string> {
    const output: Record<string, string> = {};

    for (const property in styles) {
      if (styles.hasOwnProperty(property) && !property.startsWith('-webkit-')) {
        output[property] = styles[property];
      }
    }

    return output;
  }

  process(styles: StyleRule[]): StyleRule[] {
    const output: StyleRule[] = [];

    for (const style of styles) {
      output.push({
        id: style.id,
        tagName: style.tagName,
        node: style.node ? this.apply(style.node) : null,
        before: style.before ? this.apply(style.before) : null,
        after: style.after ? this.apply(style.after) : null,
      });
    }

    return output;
  }
}
