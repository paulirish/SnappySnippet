interface ProcessedNode {
  tagName: string;
  attributes: Record<string, string>;
  styles: Record<string, string>;
  pseudo: Record<string, Record<string, string>>;
  children: ProcessedNode[];
}

import {DefaultValueFilter} from './filters/DefaultValueFilter.js';

import {ShorthandPropertyFilter} from './filters/ShorthandPropertyFilter.js';

('use strict');

function generateCSSPropertiesData() {
  'use strict';

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

export function getNonDefaultComputedStyles(element: Element) {
  const cssData = generateCSSPropertiesData();

  const defaultValueFilter = new DefaultValueFilter(element);

  const shorthandPropertyFilter = new ShorthandPropertyFilter(cssData.cssShorthands);

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
        elementPseudo[':before'] = defaultValueFilter.removeDefaultValues(
          beforeStyles as unknown as CSSStyleDeclaration,
          element.tagName,
          ':before'
        );
        elementPseudo[':before'] = shorthandPropertyFilter.apply(elementPseudo[':before']);
      }
  
      const afterStyles = snapshooter.dumpCSS(element, ':after', baseURI);
      if (afterStyles) {
        elementPseudo[':after'] = defaultValueFilter.removeDefaultValues(
          afterStyles as unknown as CSSStyleDeclaration,
          element.tagName,
          ':after'
        );
        elementPseudo[':after'] = shorthandPropertyFilter.apply(elementPseudo[':after']);
      }
  
      elementStyles = defaultValueFilter.removeDefaultValues(
        elementStyles as unknown as CSSStyleDeclaration,
        element.tagName,
        null
      );
      elementStyles = shorthandPropertyFilter.apply(elementStyles);
  
      stylesById[snappyId] = {
        styles: elementStyles,
        pseudo: elementPseudo,
      };
  
      const children: ProcessedNode[] = [];
      for (let i = 0; i < element.children.length; i++) {
        const child = processNode(element.children[i]);
        if (child) {
          children.push(child);
        }
      }
  
      const attributes: Record<string, string> = {};
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        attributes[attr.name] = attr.value;
      }
  
      return {
        tagName: element.tagName,
        attributes,
        styles: elementStyles,
        pseudo: elementPseudo,
        children,
      };
    }
  
    const processedRoot = processNode(element);
    defaultValueFilter.iframe.remove();
    const combinedCssRules = SameRulesCombiner.combine(stylesById);
    const cssString = CSSStringifier.stringify(combinedCssRules);
  
    return {
      html: element.outerHTML,
      css: cssString,
      styles: processedRoot, // Return the structured style object
    };
  }
