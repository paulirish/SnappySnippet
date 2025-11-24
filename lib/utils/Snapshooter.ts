"use strict";

import { URLResolver } from '../processing/URLResolver.js';

export class Snapshooter {
  cssData: any;
  shorthandsToCamelCase: Record<string, string>;
  constructor(cssData: any) {
    this.cssData = cssData;
    this.shorthandsToCamelCase = {} as Record<string, string>;
    for (const [shorthand, _] of this.cssData.cssShorthands) {
      this.shorthandsToCamelCase[shorthand] = shorthand.replace(/-([a-z])/g, (_: string, char: string) => char.toUpperCase());
    }
  }

  styleDeclarationToSimpleObject(style: CSSStyleDeclaration, baseURI: string) {
    let i, l, cssName;
    const output: Record<string, string> = {};

    for (i = 0, l = style.length; i < l; i++) {
      let propertyName = style[i];
      let propertyValue = style.getPropertyValue(propertyName);
      output[propertyName] = URLResolver.resolve(propertyValue, baseURI);
    }

    // Work around http://crbug.com/313670 (the "content" property is not present as a computed style indexed property value).
    output['content'] = this.fixContentProperty(style.content);

    // Since shorthand properties are not available in the indexed array, copy them from named properties
    for (cssName in this.shorthandsToCamelCase) {
      if (this.shorthandsToCamelCase.hasOwnProperty(cssName)) {
        let propertyValue = style.getPropertyValue(cssName);
        output[cssName] = URLResolver.resolve(propertyValue, baseURI);
      }
    }

    return output;
  }

  // Partial workaround for http://crbug.com/315028 (single words in the "content" property are not wrapped with quotes)
  fixContentProperty(content: string) {
    let values, output, value, i, l;

    output = [];

    if (content) {
      //content property can take multiple values - we need to split them up
      //FIXME this won't work for '\''
      values = content.match(/(?:[^\s']+|'[^']*')+/g);

      if (values) {
        for (i = 0, l = values.length; i < l; i++) {
          value = values[i];

          if (value.match(/^(url\()|(attr\()|normal|none|open-quote|close-quote|no-open-quote|no-close-quote|chapter_counter|'/g)) {
            output.push(value);
          } else {
            output.push("'" + value + "'" );
          }
        }
      }
    }

    return output.join(' ');
  }

  dumpCSS(node: Element, pseudoElement: string | null, baseURI: string) {
    if (!node.ownerDocument.defaultView) {
      return {};
    }
    const styles = node.ownerDocument.defaultView.getComputedStyle(node, pseudoElement);

    if (pseudoElement) {
      //if we are dealing with pseudoelement, check if 'content' property isn't empty
      //if it is, then we can ignore the whole element
      if (!styles.getPropertyValue('content')) {
        return null;
      }
    }

    return this.styleDeclarationToSimpleObject(styles, baseURI);
  }
}

