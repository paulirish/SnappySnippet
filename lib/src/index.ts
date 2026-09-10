import {
  Snapshooter,
  SnapshooterExport,
  type Snapshot,
  type SnapshooterOptions,
} from './snapshooter.ts';
import {cleanHtml, type CleanHtmlOptions} from './htmlCleaner.ts';
import {
  DefaultValueFilter,
  type StyleRule,
} from './filters/DefaultValueFilter.ts';
import {ShorthandPropertyFilter} from './filters/ShorthandPropertyFilter.ts';
import {WebkitPropertiesFilter} from './filters/WebkitPropertiesFilter.ts';
import {ModernNoiseFilter} from './filters/ModernNoiseFilter.ts';
import {SameRulesCombiner} from './processing/SameRulesCombiner.ts';
import {CSSStringifier} from './processing/CSSStringifier.ts';
import {URLResolver} from './processing/URLResolver.ts';
import {
  getCssMetadata,
  generateCSSPropertiesData,
  DEFAULT_SHORTHANDS,
  type CssMetadata,
} from './cssMetadata.ts';

export {
  SnapshooterExport as Snapshooter,
  cleanHtml,
  DefaultValueFilter,
  ShorthandPropertyFilter,
  WebkitPropertiesFilter,
  SameRulesCombiner,
  CSSStringifier,
  URLResolver,
  getCssMetadata,
  generateCSSPropertiesData,
  DEFAULT_SHORTHANDS,
  ModernNoiseFilter,
};

export type {
  Snapshot,
  SnapshooterOptions,
  CleanHtmlOptions,
  StyleRule,
  CssMetadata,
};

export interface ExtractSnippetOptions {
  removeDefaultValues?: boolean;
  propertiesCleanUp?: boolean;
  removeWebkitProperties?: boolean;
  combineSameRules?: boolean;
  fixHTMLIndentation?: boolean;
  includeAncestors?: boolean;
  embedCSS?: boolean;
  selectorStrategy?: 'id' | 'data-attribute';
  removeClasses?: boolean;
  idPrefix?: string;
  preserveDimensions?: boolean;
  xdata?: CssMetadata | null;
}

export interface SnippetResult {
  html: string;
  css: string;
}

export function processSnapshot(
  snapshot: Snapshot,
  options: ExtractSnippetOptions = {},
  doc: Document | null = null
): SnippetResult {
  const opts: Required<Omit<ExtractSnippetOptions, 'xdata'>> & {xdata: CssMetadata | null} = {
    removeDefaultValues: options.removeDefaultValues ?? true,
    propertiesCleanUp: options.propertiesCleanUp ?? true,
    removeWebkitProperties: options.removeWebkitProperties ?? true,
    combineSameRules: options.combineSameRules ?? true,
    fixHTMLIndentation: options.fixHTMLIndentation ?? true,
    includeAncestors: options.includeAncestors ?? false,
    embedCSS: options.embedCSS ?? false,
    selectorStrategy: options.selectorStrategy ?? 'id',
    removeClasses: options.removeClasses ?? (options.selectorStrategy !== 'data-attribute'),
    idPrefix: options.idPrefix ?? '',
    preserveDimensions: options.preserveDimensions ?? false,
    xdata: options.xdata ?? null,
  };

  let styles: StyleRule[] = JSON.parse(JSON.stringify(snapshot.css || [])) as StyleRule[];
  let html = snapshot.html || '';

  if (opts.includeAncestors) {
    if (snapshot.ancestorCss && snapshot.ancestorCss.length > 0) {
      const ancestorRules = JSON.parse(JSON.stringify(snapshot.ancestorCss)) as StyleRule[];
      styles = [...ancestorRules, ...styles];
    }
    html = (snapshot.leadingAncestorHtml || '') + html + (snapshot.trailingAncestorHtml || '');
  }

  if (opts.removeDefaultValues) {
    const defaultValueFilter = new DefaultValueFilter(doc);
    try {
      styles = defaultValueFilter.process(styles);
    } finally {
      defaultValueFilter.cleanup();
    }
  }

  // Modern browser noise pruning
  styles = ModernNoiseFilter.process(styles, {
    preserveDimensions: opts.preserveDimensions,
  });

  if (opts.propertiesCleanUp) {
    const shorthandPropertyFilter = new ShorthandPropertyFilter(opts.xdata);
    styles = shorthandPropertyFilter.process(styles);
  }

  if (opts.removeWebkitProperties) {
    const webkitPropertiesFilter = new WebkitPropertiesFilter();
    styles = webkitPropertiesFilter.process(styles);
  }

  if (opts.combineSameRules) {
    const sameRulesCombiner = new SameRulesCombiner();
    styles = sameRulesCombiner.process(styles);
  }

  if (opts.fixHTMLIndentation) {
    html = cleanHtml(html, {
      format: true,
      removeAttrs: opts.removeClasses ? ['class'] : [],
      allowedAttributes: null,
    });
  }

  const cssStringifier = new CSSStringifier();
  let css = cssStringifier.process(styles);

  if (opts.embedCSS) {
    html = `<style type="text/css">\n${css}\n</style>\n${html}`;
    css = '';
  }

  if (opts.idPrefix || html.includes(':snappysnippet_prefix:') || css.includes(':snappysnippet_prefix:')) {
    html = html.replaceAll(':snappysnippet_prefix:', opts.idPrefix);
    css = css.replaceAll(':snappysnippet_prefix:', opts.idPrefix);
  }

  return {
    html,
    css,
  };
}

export function extractSnippet(
  elementOrSnapshot: Element | Snapshot | null | undefined,
  options: ExtractSnippetOptions = {}
): SnippetResult {
  if (!elementOrSnapshot || typeof elementOrSnapshot !== 'object') {
    throw new Error('extractSnippet requires a valid DOM element or snapshot object.');
  }

  const opts: ExtractSnippetOptions = {
    removeDefaultValues: true,
    propertiesCleanUp: true,
    removeWebkitProperties: true,
    combineSameRules: true,
    fixHTMLIndentation: true,
    includeAncestors: false,
    embedCSS: false,
    selectorStrategy: 'id',
    idPrefix: '',
    xdata: null,
    ...options,
  };

  let snapshot: Snapshot;
  let doc: Document | null = null;

  if ('nodeType' in elementOrSnapshot && elementOrSnapshot.nodeType === 1) {
    const el = elementOrSnapshot as Element;
    doc = el.ownerDocument;
    snapshot = SnapshooterExport(el, opts);
  } else if ('html' in elementOrSnapshot && 'css' in elementOrSnapshot) {
    snapshot = elementOrSnapshot as Snapshot;
    doc = typeof document !== 'undefined' ? document : null;
  } else {
    throw new Error('extractSnippet requires a valid DOM element or snapshot object.');
  }

  return processSnapshot(snapshot, opts, doc);
}

export interface ProcessedNode {
  tagName: string;
  attributes: Record<string, string>;
  styles: Record<string, string>;
  pseudo: Record<string, Record<string, string>>;
  children: ProcessedNode[];
}

export interface GetNonDefaultComputedStylesResult {
  html: string;
  css: string;
  styles: ProcessedNode | null;
}

export interface GetNonDefaultComputedStylesOptions {
  selectorStrategy?: 'id' | 'data-attribute';
  idPrefix?: string;
  xdata?: CssMetadata | null;
}

export function getNonDefaultComputedStyles(
  originalElement: Element,
  options: GetNonDefaultComputedStylesOptions = {}
): GetNonDefaultComputedStylesResult {
  const clonedRoot = originalElement.cloneNode(true) as Element;
  const doc = originalElement.ownerDocument ?? (typeof document !== 'undefined' ? document : null);
  const win = originalElement.ownerDocument?.defaultView ?? (typeof window !== 'undefined' ? window : null);

  const cssData = options.xdata ?? generateCSSPropertiesData(win);
  const defaultValueFilter = new DefaultValueFilter(doc);
  const shorthandPropertyFilter = new ShorthandPropertyFilter(
    cssData.cssShorthands,
    cssData.cssShorthandsForLonghand
  );
  const snapshooter = new Snapshooter(cssData);
  const stylesById: Record<string, {styles: Record<string, string>; pseudo: Record<string, Record<string, string>>}> = {};

  const strategy = options.selectorStrategy ?? 'data-attribute';
  const prefix = options.idPrefix ?? '';

  let idCounter = 0;
  function processNode(originalEl: Element, clonedEl: Element): ProcessedNode | null {
    const currentId = strategy === 'id'
      ? `${prefix}${clonedEl.tagName.toUpperCase()}_${++idCounter}`
      : `${prefix}snappy-${++idCounter}`;

    if (strategy === 'id') {
      clonedEl.setAttribute('id', currentId);
    } else {
      clonedEl.setAttribute('data-snappy-id', currentId);
    }

    const baseURI = originalEl.ownerDocument?.baseURI ?? '';

    let elementStyles = snapshooter.dumpCSS(originalEl, null, baseURI) ?? {};
    const elementPseudo: Record<string, Record<string, string>> = {};

    const beforeStyles = snapshooter.dumpCSS(originalEl, ':before', baseURI);
    if (beforeStyles) {
      let filteredBefore = defaultValueFilter.removeDefaultValues(beforeStyles, originalEl.tagName, ':before');
      filteredBefore = ModernNoiseFilter.pruneStyles(filteredBefore);
      filteredBefore = shorthandPropertyFilter.apply(filteredBefore);
      if (Object.keys(filteredBefore).length > 0) {
        elementPseudo[':before'] = filteredBefore;
      }
    }

    const afterStyles = snapshooter.dumpCSS(originalEl, ':after', baseURI);
    if (afterStyles) {
      let filteredAfter = defaultValueFilter.removeDefaultValues(afterStyles, originalEl.tagName, ':after');
      filteredAfter = ModernNoiseFilter.pruneStyles(filteredAfter);
      filteredAfter = shorthandPropertyFilter.apply(filteredAfter);
      if (Object.keys(filteredAfter).length > 0) {
        elementPseudo[':after'] = filteredAfter;
      }
    }

    elementStyles = defaultValueFilter.removeDefaultValues(elementStyles, originalEl.tagName, null);
    elementStyles = ModernNoiseFilter.pruneStyles(elementStyles);
    elementStyles = shorthandPropertyFilter.apply(elementStyles);

    const hasNonDefaultStyles =
      Object.keys(elementStyles).length > 0 || Object.keys(elementPseudo).length > 0;

    if (hasNonDefaultStyles) {
      stylesById[currentId] = {
        styles: elementStyles,
        pseudo: elementPseudo,
      };
    }

    const children: ProcessedNode[] = [];
    const origChildren = Array.from(originalEl.children);
    const clonedChildren = Array.from(clonedEl.children);
    for (let i = 0; i < origChildren.length; i++) {
      const child = processNode(origChildren[i], clonedChildren[i]);
      if (child) {
        children.push(child);
      }
    }

    if (!hasNonDefaultStyles && children.length === 0) {
      return null;
    }

    const attributes: Record<string, string> = {};
    for (let i = 0; i < clonedEl.attributes.length; i++) {
      const attr = clonedEl.attributes[i];
      if (attr.name !== 'data-snappy-id' && (strategy !== 'id' || attr.name !== 'id')) {
        attributes[attr.name] = attr.value;
      }
    }

    return {
      tagName: originalEl.tagName,
      attributes,
      styles: elementStyles,
      pseudo: elementPseudo,
      children,
    };
  }

  let processedRoot: ProcessedNode | null = null;
  try {
    processedRoot = processNode(originalElement, clonedRoot);
  } finally {
    defaultValueFilter.cleanup();
  }

  URLResolver.resolveElementAttributes(clonedRoot, originalElement);

  const combinedCssRules = SameRulesCombiner.combine(stylesById);
  const cssString = CSSStringifier.stringify(combinedCssRules);

  return {
    html: clonedRoot.outerHTML,
    css: cssString,
    styles: processedRoot,
  };
}

export default extractSnippet;
