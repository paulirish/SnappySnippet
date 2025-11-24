'use strict';

import {DefaultValueFilter} from './filters/DefaultValueFilter.js';
import {ShorthandPropertyFilter} from './filters/ShorthandPropertyFilter.js';

interface ProcessedNode {
  tagName: string;
  attributes: Record<string, string>;
  styles: Record<string, string>;
  pseudo: Record<string, Record<string, string>>;
  children: ProcessedNode[];
}


function generateCSSPropertiesData() {
  const element = document.createElement('div');
  const {style} = element;
    const computedStyle = getComputedStyle(element);
    const cssProperties = new Set<string>();
    const cssShorthands = new Map<string, string[]>();
    const cssShorthandsForLonghand = new Map<string, Set<string>>();
    const cssLonghands = new Set<string>();
    const cssAliases = new Map<string, string>();
    const initialValues = new Map<string, string>();
    for (let obj: CSSStyleDeclaration | null = style; obj; obj = Reflect.getPrototypeOf(obj) as any) {
    for (let name of Object.getOwnPropertyNames(obj)) {
      const property = name.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
      if (CSS.supports(property, 'initial')) {
        cssProperties.add(property);
      }
    }
  }

  for (const property of Array.from(cssProperties)) {
    style.cssText = '';
    style.setProperty(property, 'initial');

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
    initialValues,
  };

  return data;
}

import {CSSStringifier} from './processing/CSSStringifier.js';
import {Snapshooter} from './utils/Snapshooter.js';
import {SameRulesCombiner} from './processing/SameRulesCombiner.js';

// Main library file

export function getNonDefaultComputedStyles(originalElement: Element) {
  const element = originalElement.cloneNode(true) as Element;
  const cssData = generateCSSPropertiesData();
  const defaultValueFilter = new DefaultValueFilter(element);
  const shorthandPropertyFilter = new ShorthandPropertyFilter(cssData.cssShorthands, cssData.cssShorthandsForLonghand);
  const snapshooter = new Snapshooter(cssData);
  const stylesById = {} as Record<string, any>;

  let idCounter = 0;
  function processNode(node: Node): ProcessedNode | null {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const element = node as Element;
    const snappyId = `snappy-${++idCounter}`;
    element.setAttribute('data-snappy-id', snappyId);

    const baseURI = element.ownerDocument.baseURI;

    let elementStyles = snapshooter.dumpCSS(element, null, baseURI);
    let elementPseudo: Record<string, Record<string, string>> = {};

    const beforeStyles = snapshooter.dumpCSS(element, ':before', baseURI);
    if (beforeStyles) {
      elementPseudo[':before'] = defaultValueFilter.removeDefaultValues(beforeStyles as unknown as CSSStyleDeclaration, element.tagName, ':before');
      elementPseudo[':before'] = shorthandPropertyFilter.apply(elementPseudo[':before']);
    }

    const afterStyles = snapshooter.dumpCSS(element, ':after', baseURI);
    if (afterStyles) {
      elementPseudo[':after'] = defaultValueFilter.removeDefaultValues(afterStyles as unknown as CSSStyleDeclaration, element.tagName, ':after');
      elementPseudo[':after'] = shorthandPropertyFilter.apply(elementPseudo[':after']);
    }

    elementStyles = defaultValueFilter.removeDefaultValues(elementStyles as unknown as CSSStyleDeclaration, element.tagName, null);
    elementStyles = shorthandPropertyFilter.apply(elementStyles);

    // Pragmatic cleanup: remove common noisy default properties that getComputedStyle often returns
    // even when no custom styling is applied. This ensures truly empty elements produce empty CSS.
    const COMMON_NOISY_DEFAULT_PROPERTIES = [
      'inline-size',
      'block-size',
      'width',
      'height',
      'perspective-origin',
      'transform-origin',
      'caret-color',
      '-webkit-text-fill-color',
      '-webkit-text-stroke-color',
      // Add other properties that are consistently noisy and not intended to be captured
      'margin-block',
      'margin-inline',
      'border-block-color',
      'border-block-style',
      'border-block-width',
      'border-inline-color',
      'border-inline-style',
      'border-inline-width',
      'column-rule',
      'outline',
      'text-emphasis',
      'text-decoration-color',
    ];

    for (const prop of COMMON_NOISY_DEFAULT_PROPERTIES) {
      delete elementStyles[prop];
      // Also check if they exist in pseudo styles and remove
      for (const pseudoKey in elementPseudo) {
        delete elementPseudo[pseudoKey][prop];
      }
    }

    // Prune empty styles (original logic, now more effective)
    if (Object.keys(elementStyles).length === 0) {
      elementStyles = {};
    }

    if (Object.keys(elementPseudo[':before'] || {}).length === 0) {
      delete elementPseudo[':before'];
    }
    if (Object.keys(elementPseudo[':after'] || {}).length === 0) {
      delete elementPseudo[':after'];
    }

    // Only add to stylesById if there are actual non-default styles
    const hasNonDefaultStyles = Object.keys(elementStyles).length > 0 || Object.keys(elementPseudo).length > 0;
    if (hasNonDefaultStyles) {
      stylesById[snappyId] = {
        styles: elementStyles,
        pseudo: elementPseudo,
      };
    }

    const children: ProcessedNode[] = [];
    for (let i = 0; i < element.children.length; i++) {
      const child = processNode(element.children[i]);
      if (child) {
        children.push(child);
      }
    }

    if (!hasNonDefaultStyles && children.length === 0) {
      return null; // This element and its children have no non-default styles
    }

    const attributes: Record<string, string> = {};
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      // Only include attributes if they are meaningful (e.g., not just the snappy-id)
      if (attr.name !== 'data-snappy-id') {
        attributes[attr.name] = attr.value;
      }
    }

    return {
      tagName: element.tagName,
      attributes,
      styles: elementStyles,
      pseudo: elementPseudo,
      children,
    };
  }

  document.body.appendChild(element);

  const processedRoot = processNode(element);
  defaultValueFilter.iframe.remove();
  document.body.removeChild(element);
  const combinedCssRules = SameRulesCombiner.combine(stylesById);
  const cssString = CSSStringifier.stringify(combinedCssRules);
  return {
    html: element.outerHTML,
    css: cssString,
    styles: processedRoot, // Return the structured style object
  };
}
