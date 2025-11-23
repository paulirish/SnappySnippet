"use strict";

function generateCSSPropertiesData() {
  "use strict";

  const element = document.createElement('div');
  const { style } = element;
  const computedStyle = getComputedStyle(element);
  const cssProperties = new Set();
  const cssShorthands = new Map();
  const cssShorthandsForLonghand = new Map();
  const cssLonghands = new Set();
  const cssAliases = new Map();
  const initialValues = new Map();
  for (let obj = style; obj; obj = Reflect.getPrototypeOf(obj)) {
    for (let name of Object.getOwnPropertyNames(obj)) {
      const property = name.replace(/[A-Z]/g, c => "-" + c.toLowerCase());
      if (CSS.supports(property, "initial")) {
        cssProperties.add(property);
      }
    }
  }
  for (let property of cssProperties) {
    style.cssText = "";
    style.setProperty(property, "initial");
    if (style.length > 1) {
      cssShorthands.set(property, [...style]);
      for (let longhand of style) {
        if (cssShorthandsForLonghand.has(longhand)) {
          cssShorthandsForLonghand.get(longhand).add(property);
        } else {
          cssShorthandsForLonghand.set(longhand, new Set([property]));
        }
      }
    } else if (style.length === 1) {
      if (property === style[0]) {
        cssLonghands.add(property);
      } else {
        cssAliases.set(property, style[0]);
      }
    }
  }
  const data = {
    cssProperties,
    cssShorthands,
    cssShorthandsForLonghand,
    cssLonghands,
    cssAliases,
    initialValues
  };
  
  return data;
}

"use strict";

class DefaultValueFilter {
  constructor(element) {
    this.iframe = document.createElement('iframe');
    // visually-hidden styles.
    this.iframe.style.cssText = `
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;`
    this.element = element;
    // Does it need to be attached?
    document.body.appendChild(this.iframe);
  }

  removeDefaultValues(style, tagName, pseudoElement) {
    let property, avalue, bvalue, cloneStyle;
    const output = {};
    const clone = this.element.ownerDocument.createElement(tagName);

    if (tagName === 'A') {
      //when <a> doesn't have href attribute, default browser styles for this element are different
      clone.setAttribute('href', '#');
    }

    this.iframe.contentWindow.document.body.appendChild(clone);

    if (pseudoElement) {
      cloneStyle = clone.ownerDocument.defaultView.getComputedStyle(clone, pseudoElement);
    } else {
      cloneStyle = clone.ownerDocument.defaultView.getComputedStyle(clone);
    }

    for (property in style) {
      avalue = cloneStyle[property];
      bvalue = style[property];

      if (!style.hasOwnProperty(property) || avalue === bvalue) {
        continue;
      }

      output[property] = bvalue;
    }

    this.iframe.contentWindow.document.body.removeChild(clone);

    return output;
  }
}

class Snapshooter {
  constructor(cssData) {
    this.cssData = cssData;
    this.shorthandsToCamelCase = Array.from(this.cssData.cssShorthands).reduce((acc, [shorthand, _]) => {
      acc[shorthand] = shorthand.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      return acc;
    }, {});
  }

  styleDeclarationToSimpleObject(style) {
    let i, l, cssName, camelCaseName;
    const output = {};

    for (i = 0, l = style.length; i < l; i++) {
      output[style[i]] = style[style[i]];
    }

    // Work around http://crbug.com/313670 (the "content" property is not present as a computed style indexed property value).
    output.content = this.fixContentProperty(style.content);

    // Since shorthand properties are not available in the indexed array, copy them from named properties
    for (cssName in this.shorthandsToCamelCase) {
      if (this.shorthandsToCamelCase.hasOwnProperty(cssName)) {
        camelCaseName = this.shorthandsToCamelCase[cssName];
        output[cssName] = style[camelCaseName];
      }
    }

    return output;
  }

  // Partial workaround for http://crbug.com/315028 (single words in the "content" property are not wrapped with quotes)
  fixContentProperty(content) {
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
            output.push("'" + value + "'");
          }
        }
      }
    }

    return output.join(' ');
  }

  dumpCSS(node, pseudoElement) {
    const styles = node.ownerDocument.defaultView.getComputedStyle(node, pseudoElement);

    if (pseudoElement) {
      //if we are dealing with pseudoelement, check if 'content' property isn't empty
      //if it is, then we can ignore the whole element
      if (!styles.getPropertyValue('content')) {
        return null;
      }
    }

    return this.styleDeclarationToSimpleObject(styles);
  }
}

// Main library file
function getNonDefaultComputedStyles(element) {
  const cssData = generateCSSPropertiesData();
  const filter = new DefaultValueFilter(element);
  const snapshooter = new Snapshooter(cssData);

  function processNode(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const result = {
      tagName: node.tagName,
      attributes: {},
      styles: {},
      pseudo: {},
      children: []
    };

    for (let i = 0; i < node.attributes.length; i++) {
      const attr = node.attributes[i];
      result.attributes[attr.name] = attr.value;
    }

    const styles = snapshooter.dumpCSS(node, null);
    result.styles = filter.removeDefaultValues(styles, node.tagName);

    const beforeStyles = snapshooter.dumpCSS(node, ':before');
    if (beforeStyles) {
      result.pseudo[':before'] = filter.removeDefaultValues(beforeStyles, node.tagName, ':before');
    }

    const afterStyles = snapshooter.dumpCSS(node, ':after');
    if (afterStyles) {
      result.pseudo[':after'] = filter.removeDefaultValues(afterStyles, node.tagName, ':after');
    }

    for (let i = 0; i < node.childNodes.length; i++) {
      const childResult = processNode(node.childNodes[i]);
      if (childResult) {
        result.children.push(childResult);
      }
    }

    return result;
  }

  const result = processNode(element);
  filter.iframe.remove();
  return result;
}
