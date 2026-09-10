import {DEFAULT_SHORTHANDS, type CssMetadata} from './cssMetadata.ts';
import {URLResolver} from './processing/URLResolver.ts';
import type {StyleRule} from './filters/DefaultValueFilter.ts';

export interface SnapshooterOptions {
  selectorStrategy?: 'id' | 'data-attribute';
  removeClasses?: boolean;
  includeAncestors?: boolean;
  idPrefix?: string;
  xdata?: CssMetadata | null;
}

export interface Snapshot {
  html: string;
  leadingAncestorHtml: string;
  trailingAncestorHtml: string;
  css: StyleRule[];
  ancestorCss: StyleRule[];
}

export class Snapshooter {
  private shorthandsToCamelCase: Record<string, string> = {};

  constructor(metadataOrRoot?: Element | CssMetadata | null, options?: SnapshooterOptions) {
    let shorthandsMap: Map<string, string[]> | Record<string, string[]> | null = null;

    if (metadataOrRoot && 'cssShorthands' in metadataOrRoot) {
      shorthandsMap = metadataOrRoot.cssShorthands;
    } else if (options?.xdata?.cssShorthands) {
      shorthandsMap = options.xdata.cssShorthands;
    }

    const toCamelCase = (prop: string): string =>
      prop.replace(/^-./, match => match.slice(1)).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

    if (shorthandsMap instanceof Map) {
      for (const [key] of shorthandsMap.entries()) {
        this.shorthandsToCamelCase[key] = toCamelCase(key);
      }
    } else if (shorthandsMap && typeof shorthandsMap === 'object') {
      for (const key of Object.keys(shorthandsMap)) {
        this.shorthandsToCamelCase[key] = toCamelCase(key);
      }
    } else {
      for (const key of Object.keys(DEFAULT_SHORTHANDS)) {
        this.shorthandsToCamelCase[key] = toCamelCase(key);
      }
    }
  }

  fixContentProperty(content: string | null): string {
    if (!content) return '';
    const values = content.match(/(?:[^\s']+|'[^']*')+/g);
    if (!values) return '';

    const output: string[] = [];
    for (const val of values) {
      if (
        val.match(
          /^(url\(|attr\(|normal|none|open-quote|close-quote|no-open-quote|no-close-quote|chapter_counter|'|")/i
        )
      ) {
        output.push(val);
      } else {
        output.push(`'${val}'`);
      }
    }
    return output.join(' ');
  }

  styleDeclarationToSimpleObject(
    style: CSSStyleDeclaration | null,
    baseURI = ''
  ): Record<string, string> | null {
    if (!style) return null;

    const output: Record<string, string> = {};

    for (let i = 0; i < style.length; i++) {
      const prop = style[i];
      const val = style.getPropertyValue(prop);
      output[prop] = baseURI ? URLResolver.resolve(val, baseURI) : val;
    }

    const content = style.getPropertyValue('content') || style.content;
    if (content) {
      output.content = this.fixContentProperty(content);
    }

    for (const [cssName, camelCaseName] of Object.entries(this.shorthandsToCamelCase)) {
      const shorthandVal =
        style.getPropertyValue(cssName) ||
        (Reflect.get(style, camelCaseName) as string ?? '');
      if (shorthandVal && shorthandVal !== '') {
        output[cssName] = baseURI ? URLResolver.resolve(shorthandVal, baseURI) : shorthandVal;
      }
    }

    return output;
  }

  dumpCSS(
    node: Element,
    pseudoElement: string | null = null,
    baseURI = ''
  ): Record<string, string> | null {
    const win = node.ownerDocument?.defaultView ?? (typeof window !== 'undefined' ? window : null);
    if (!win) return null;

    const styles = pseudoElement
      ? win.getComputedStyle(node, pseudoElement)
      : win.getComputedStyle(node);

    if (pseudoElement) {
      const content = styles.getPropertyValue('content') || styles.content;
      if (!content || content === 'none' || content === 'normal' || content === '""' || content === "''") {
        return null;
      }
    }

    const resolvedBase = baseURI || node.ownerDocument?.baseURI || '';
    return this.styleDeclarationToSimpleObject(styles, resolvedBase);
  }

  createSnapshot(root: Element, options: SnapshooterOptions = {}): Snapshot {
    const strategy = options.selectorStrategy ?? 'id';
    const removeClasses = options.removeClasses ?? (strategy === 'id');
    const includeAncestors = options.includeAncestors ?? false;
    const prefix = options.idPrefix ?? '';
    const baseURI = root.ownerDocument?.baseURI ?? '';

    let idCounter = 1;

    function makeId(tag: string): string {
      if (strategy === 'id') {
        return `${prefix}${tag.toUpperCase()}_${idCounter++}`;
      }
      return `${prefix}snappy-${idCounter++}`;
    }

    function makeSelector(assignedId: string): string {
      if (strategy === 'id') {
        return `#${assignedId}`;
      }
      return `[data-snappy-id="${assignedId}"]`;
    }

    function applyIdToElement(el: Element, assignedId: string): void {
      if (strategy === 'id') {
        el.setAttribute('id', assignedId);
      } else {
        el.setAttribute('data-snappy-id', assignedId);
      }
      if (removeClasses) {
        el.removeAttribute('class');
      }
    }

    const css: StyleRule[] = [];
    const ancestorCss: StyleRule[] = [];

    // Ancestor discovery
    const ancestors: Element[] = [];
    if (includeAncestors) {
      let curr = root.parentElement;
      const body = root.ownerDocument?.body;
      const docEl = root.ownerDocument?.documentElement;
      while (curr && curr !== body && curr !== docEl) {
        ancestors.push(curr);
        curr = curr.parentElement;
      }
    }

    // Capture styles for ancestors (from outermost to innermost parent)
    const reversedAncestors = [...ancestors].reverse();
    for (const ancestor of reversedAncestors) {
      const assignedId = makeId(ancestor.tagName);
      ancestorCss.push({
        id: strategy === 'id' ? assignedId : makeSelector(assignedId),
        tagName: ancestor.tagName,
        node: this.dumpCSS(ancestor, null, baseURI),
        before: null,
        after: null,
      });
    }

    // Capture root element styles
    const rootAssignedId = makeId(root.tagName);
    css.push({
      id: strategy === 'id' ? rootAssignedId : makeSelector(rootAssignedId),
      tagName: root.tagName,
      node: this.dumpCSS(root, null, baseURI),
      before: this.dumpCSS(root, ':before', baseURI),
      after: this.dumpCSS(root, ':after', baseURI),
    });

    // Capture descendant styles
    const descendants = Array.from(root.getElementsByTagName('*'));
    const descendantIds: string[] = [];
    for (const descendant of descendants) {
      const assignedId = makeId(descendant.tagName);
      descendantIds.push(assignedId);
      css.push({
        id: strategy === 'id' ? assignedId : makeSelector(assignedId),
        tagName: descendant.tagName,
        node: this.dumpCSS(descendant, null, baseURI),
        before: this.dumpCSS(descendant, ':before', baseURI),
        after: this.dumpCSS(descendant, ':after', baseURI),
      });
    }

    // Build cloned HTML tree
    const clone = root.cloneNode(true) as Element;
    applyIdToElement(clone, rootAssignedId);
    URLResolver.resolveElementAttributes(clone, root);

    const clonedDescendants = Array.from(clone.getElementsByTagName('*'));
    for (let i = 0; i < clonedDescendants.length; i++) {
      const clonedEl = clonedDescendants[i];
      const origEl = descendants[i];
      applyIdToElement(clonedEl, descendantIds[i]);
      URLResolver.resolveElementAttributes(clonedEl, origEl);
    }

    let leadingAncestorHtml = '';
    let trailingAncestorHtml = '';

    if (includeAncestors && reversedAncestors.length > 0) {
      let ancestorIdx = 0;
      for (const ancestor of reversedAncestors) {
        const ancestorRule = ancestorCss[ancestorIdx++];
        const assignedId = typeof ancestorRule.id === 'string'
          ? (ancestorRule.id.startsWith('#')
              ? ancestorRule.id.slice(1)
              : ancestorRule.id.replace(/^\[data-snappy-id="([^"]+)"\]$/, '$1'))
          : ancestorRule.id[0];

        const tag = ancestor.tagName.toLowerCase();
        let attrsStr = '';
        if (strategy === 'id') {
          attrsStr = ` id="${assignedId}"`;
        } else {
          attrsStr = ` data-snappy-id="${assignedId}"`;
        }
        leadingAncestorHtml += `<${tag}${attrsStr}>`;
      }

      for (let i = ancestors.length - 1; i >= 0; i--) {
        trailingAncestorHtml += `</${ancestors[i].tagName.toLowerCase()}>`;
      }
    }

    return {
      html: clone.outerHTML,
      leadingAncestorHtml,
      trailingAncestorHtml,
      css,
      ancestorCss,
    };
  }
}

// Function wrapper allowing `Snapshooter(root, options)` or `new Snapshooter(cssData)`
export function createSnapshooter(
  rootOrCssData?: Element | CssMetadata | null,
  optionsOrXdata?: SnapshooterOptions | CssMetadata | null
): Snapshooter | Snapshot {
  if (rootOrCssData && 'nodeType' in rootOrCssData && rootOrCssData.nodeType === 1) {
    const opts: SnapshooterOptions = (optionsOrXdata && 'cssShorthands' in optionsOrXdata)
      ? {xdata: optionsOrXdata as CssMetadata}
      : ((optionsOrXdata as SnapshooterOptions) ?? {});
    const instance = new Snapshooter(opts.xdata);
    return instance.createSnapshot(rootOrCssData as Element, opts);
  }
  return new Snapshooter(rootOrCssData as CssMetadata | null, optionsOrXdata as SnapshooterOptions);
}

export interface SnapshooterFunctionAndConstructor {
  new (metadataOrRoot?: Element | CssMetadata | null, options?: SnapshooterOptions): Snapshooter;
  (root: Element, options?: SnapshooterOptions | CssMetadata | null): Snapshot;
}

export const SnapshooterExport: SnapshooterFunctionAndConstructor =
  new Proxy(Snapshooter, {
    apply(_target, _thisArg, argArray) {
      const [root, options] = argArray;
      return createSnapshooter(root, options) as Snapshot;
    },
  }) as SnapshooterFunctionAndConstructor;

