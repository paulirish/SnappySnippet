
import { Snapshooter } from './utils/Snapshooter.js';
import { DefaultValueFilter } from './filters/DefaultValueFilter.js';

"use strict";

function generateCSSPropertiesData() {
  "use strict";

  const element = document.createElement('div');
      const { style } = element;
      const computedStyle = getComputedStyle(element);
      const cssProperties = new Set<string>();
      const cssShorthands = new Map<string, string[]>();
      const cssShorthandsForLonghand = new Map<string, Set<string>>();
      const cssLonghands = new Set<string>();
      const cssAliases = new Map<string, string>();
      const initialValues = new Map<string, string>();
      for (let obj: CSSStyleDeclaration | null = style; obj; obj = Reflect.getPrototypeOf(obj) as any) {    for (let name of Object.getOwnPropertyNames(obj)) {
      const property = name.replace(/[A-Z]/g, c => "-" + c.toLowerCase());
      if (CSS.supports(property, "initial")) {
        cssProperties.add(property);
      }
    }
  }
  for (const property of Array.from(cssProperties)) {
    style.cssText = "";
    style.setProperty(property, "initial");
    if (style.length > 1) {
      cssShorthands.set(property, [...style]);
      for (let longhand of style) {
        if (cssShorthandsForLonghand.has(longhand)) {
          cssShorthandsForLonghand.get(longhand)!.add(property);
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

// Main library file
export function getNonDefaultComputedStyles(element: Element) {
  const cssData = generateCSSPropertiesData();
  const filter = new DefaultValueFilter(element);
  const snapshooter = new Snapshooter(cssData);
  const stylesById = {} as Record<string, any>;
  let idCounter = 0;

  function processNode(node: Node, clonedParent: Element) {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node as Element;
    const clone = element.cloneNode(false) as Element;
    clonedParent.appendChild(clone);

    const snappyId = `snappy-${++idCounter}`;
    clone.setAttribute('data-snappy-id', snappyId);

    const styles = snapshooter.dumpCSS(element, null);
    const pseudo: Record<string, Record<string, string>> = {};

    const beforeStyles = snapshooter.dumpCSS(element, ':before');
    if (beforeStyles) {
      pseudo[':before'] = filter.removeDefaultValues(beforeStyles as unknown as CSSStyleDeclaration, element.tagName, ':before');
    }

    const afterStyles = snapshooter.dumpCSS(element, ':after');
    if (afterStyles) {
      pseudo[':after'] = filter.removeDefaultValues(afterStyles as unknown as CSSStyleDeclaration, element.tagName, ':after');
    }
    
    stylesById[snappyId] = {
        styles: filter.removeDefaultValues(styles as unknown as CSSStyleDeclaration, element.tagName, null),
        pseudo: pseudo
    };

    for (let i = 0; i < element.childNodes.length; i++) {
      processNode(element.childNodes[i], clone);
    }
  }

  const clonedRoot = element.cloneNode(false) as Element;
  processNode(element, clonedRoot);
  
  filter.iframe.remove();
  return {
    html: clonedRoot.outerHTML,
    styles: stylesById,
  };
}

