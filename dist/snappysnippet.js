var SnappySnippet = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.js
  var index_exports = {};
  __export(index_exports, {
    CSSStringifier: () => CSSStringifier,
    DefaultValueFilter: () => DefaultValueFilter,
    SameRulesCombiner: () => SameRulesCombiner,
    ShorthandPropertyFilter: () => ShorthandPropertyFilter,
    Snapshooter: () => Snapshooter,
    WebkitPropertiesFilter: () => WebkitPropertiesFilter,
    cleanHtml: () => cleanHtml,
    default: () => index_default,
    extractSnippet: () => extractSnippet,
    getCssMetadata: () => getCssMetadata,
    processSnapshot: () => processSnapshot
  });

  // src/cssMetadata.js
  function getCssMetadata(win = globalThis) {
    if (!win || !win.document) {
      return { cssProperties: /* @__PURE__ */ new Set(), cssShorthands: /* @__PURE__ */ new Map() };
    }
    try {
      const element = win.document.createElement("div");
      const { style } = element;
      const cssProperties = /* @__PURE__ */ new Set();
      const cssShorthands = /* @__PURE__ */ new Map();
      for (let obj = style; obj; obj = Reflect.getPrototypeOf(obj)) {
        for (let name of Object.getOwnPropertyNames(obj)) {
          const property = name.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
          if (win.CSS && win.CSS.supports && win.CSS.supports(property, "initial")) {
            cssProperties.add(property);
          }
        }
      }
      for (let property of cssProperties) {
        style.cssText = "";
        style.setProperty(property, "initial");
        if (style.length > 1) {
          cssShorthands.set(property, [...style]);
        }
      }
      return { cssProperties, cssShorthands };
    } catch (e) {
      return { cssProperties: /* @__PURE__ */ new Set(), cssShorthands: /* @__PURE__ */ new Map() };
    }
  }
  var DEFAULT_SHORTHANDS = {
    "animation": ["animation-name", "animation-duration", "animation-timing-function", "animation-delay", "animation-iteration-count", "animation-direction", "animation-fill-mode", "animation-play-state"],
    "background": ["background-image", "background-position", "background-position-x", "background-position-y", "background-size", "background-repeat", "background-repeat-x", "background-repeat-y", "background-attachment", "background-origin", "background-clip", "background-color"],
    "border": [
      "border-left",
      "border-right",
      "border-bottom",
      "border-top",
      "border-color",
      "border-style",
      "border-width",
      "border-top-color",
      "border-top-style",
      "border-top-width",
      "border-right-color",
      "border-right-style",
      "border-right-width",
      "border-bottom-color",
      "border-bottom-style",
      "border-bottom-width",
      "border-left-color",
      "border-left-style",
      "border-left-width"
    ],
    "border-bottom": ["border-color", "border-style", "border-width", "border-bottom-width", "border-bottom-style", "border-bottom-color"],
    "border-left": ["border-color", "border-style", "border-width", "border-left-width", "border-left-style", "border-left-color"],
    "border-radius": ["border-top-left-radius", "border-top-right-radius", "border-bottom-right-radius", "border-bottom-left-radius"],
    "border-right": ["border-color", "border-style", "border-width", "border-right-width", "border-right-style", "border-right-color"],
    "border-top": ["border-color", "border-style", "border-width", "border-top-width", "border-top-style", "border-top-color"],
    "flex": ["flex-grow", "flex-shrink", "flex-basis"],
    "flex-flow": ["flex-direction", "flex-wrap"],
    "font": ["font-family", "font-size", "font-style", "font-variant", "font-weight", "line-height"],
    "grid-area": ["grid-row-start", "grid-column-start", "grid-row-end", "grid-column-end"],
    "grid-column": ["grid-column-start", "grid-column-end"],
    "grid-row": ["grid-row-start", "grid-row-end"],
    "list-style": ["list-style-type", "list-style-position", "list-style-image"],
    "margin": ["margin-top", "margin-right", "margin-bottom", "margin-left"],
    "marker": ["marker-start", "marker-mid", "marker-end"],
    "outline": ["outline-color", "outline-style", "outline-width"],
    "overflow": ["overflow-x", "overflow-y"],
    "padding": ["padding-top", "padding-right", "padding-bottom", "padding-left"],
    "text-decoration": ["text-decoration-line", "text-decoration-style", "text-decoration-color"],
    "transition": ["transition-property", "transition-duration", "transition-timing-function", "transition-delay"]
  };

  // src/snapshooter.js
  function Snapshooter(root, xdata) {
    "use strict";
    if (!root) {
      throw new Error("Snapshooter requires a valid root element.");
    }
    var win = root.ownerDocument && root.ownerDocument.defaultView || globalThis;
    var cssShorthandsMap = xdata && xdata.cssShorthands ? xdata.cssShorthands : null;
    var shorthandsToCamelCase = {};
    const cssPropToCamelCase = (cssProperty) => cssProperty.replace(/^-./, (match) => match.slice(1)).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    if (cssShorthandsMap) {
      let entries = Array.isArray(cssShorthandsMap) ? cssShorthandsMap : cssShorthandsMap instanceof Map ? Array.from(cssShorthandsMap.entries()) : Object.entries(cssShorthandsMap);
      for (let [key] of entries) {
        shorthandsToCamelCase[key] = cssPropToCamelCase(key);
      }
    } else {
      for (let key of Object.keys(DEFAULT_SHORTHANDS)) {
        shorthandsToCamelCase[key] = cssPropToCamelCase(key);
      }
    }
    var idCounter = 1;
    function styleDeclarationToSimpleObject(style) {
      var i2, l2, cssName, camelCaseName, output = {};
      for (i2 = 0, l2 = style.length; i2 < l2; i2++) {
        output[style[i2]] = style[style[i2]];
      }
      output.content = fixContentProperty(style.content);
      for (cssName in shorthandsToCamelCase) {
        if (shorthandsToCamelCase.hasOwnProperty(cssName)) {
          camelCaseName = shorthandsToCamelCase[cssName];
          if (style[camelCaseName] !== void 0 && style[camelCaseName] !== "") {
            output[cssName] = style[camelCaseName];
          }
        }
      }
      return output;
    }
    function fixContentProperty(content) {
      var values, output, value, i2, l2;
      output = [];
      if (content) {
        values = content.match(/(?:[^\s']+|'[^']*')+/g);
        if (values) {
          for (i2 = 0, l2 = values.length; i2 < l2; i2++) {
            value = values[i2];
            if (value.match(/^(url\()|(attr\()|normal|none|open-quote|close-quote|no-open-quote|no-close-quote|chapter_counter|'/g)) {
              output.push(value);
            } else {
              output.push("'" + value + "'");
            }
          }
        }
      }
      return output.join(" ");
    }
    function createID(node) {
      return ":snappysnippet_prefix:" + node.tagName + "_" + idCounter++;
    }
    function dumpCSS(node, pseudoElement) {
      var styles = win.getComputedStyle(node, pseudoElement);
      if (pseudoElement) {
        if (!styles.getPropertyValue("content") || styles.getPropertyValue("content") === "none") {
          return null;
        }
      }
      return styleDeclarationToSimpleObject(styles);
    }
    function cssObjectForElement(element, omitPseudoElements) {
      return {
        id: createID(element),
        tagName: element.tagName,
        node: dumpCSS(element, null),
        before: omitPseudoElements ? null : dumpCSS(element, ":before"),
        after: omitPseudoElements ? null : dumpCSS(element, ":after")
      };
    }
    function ancestorTagHTML(element, closingTag) {
      var i2, attr, value, idSeen, result, attributes;
      if (closingTag) {
        return "</" + element.tagName.toLowerCase() + ">";
      }
      result = "<" + element.tagName.toLowerCase();
      attributes = element.attributes;
      for (i2 = 0; i2 < attributes.length; ++i2) {
        attr = attributes[i2];
        if (attr.name.toLowerCase() === "id") {
          value = createID(element);
          idSeen = true;
        } else {
          value = attr.value;
        }
        result += " " + attributes[i2].name + '="' + value + '"';
      }
      if (!idSeen) {
        result += ' id="' + createID(element) + '"';
      }
      result += ">";
      return result;
    }
    function relativeURLsToAbsoluteURLs(element) {
      switch (element.nodeName) {
        case "A":
        case "AREA":
        case "LINK":
        case "BASE":
          if (element.hasAttribute("href")) {
            element.setAttribute("href", element.href);
          }
          break;
        case "IMG":
        case "IFRAME":
        case "INPUT":
        case "FRAME":
        case "SCRIPT":
          if (element.hasAttribute("src")) {
            element.setAttribute("src", element.src);
          }
          break;
        case "FORM":
          if (element.hasAttribute("action")) {
            element.setAttribute("action", element.action);
          }
          break;
      }
    }
    var css = [], ancestorCss = [], descendants, descendant, htmlSegments, leadingAncestorHtml, trailingAncestorHtml, reverseAncestors = [], i, l, parent, clone;
    descendants = root.getElementsByTagName("*");
    parent = root.parentElement;
    var docBody = root.ownerDocument ? root.ownerDocument.body : null;
    while (parent && parent !== docBody) {
      reverseAncestors.push(parent);
      parent = parent.parentElement;
    }
    css.push(cssObjectForElement(root));
    for (i = 0, l = descendants.length; i < l; i++) {
      css.push(cssObjectForElement(descendants[i]));
    }
    for (i = reverseAncestors.length - 1; i >= 0; i--) {
      ancestorCss.push(cssObjectForElement(reverseAncestors[i], true));
    }
    clone = root.cloneNode(true);
    descendants = clone.getElementsByTagName("*");
    idCounter = 1;
    clone.setAttribute("id", createID(clone));
    for (i = 0, l = descendants.length; i < l; i++) {
      descendant = descendants[i];
      descendant.setAttribute("id", createID(descendant));
      relativeURLsToAbsoluteURLs(descendant);
    }
    htmlSegments = [];
    for (i = reverseAncestors.length - 1; i >= 0; i--) {
      htmlSegments.push(ancestorTagHTML(reverseAncestors[i]));
    }
    leadingAncestorHtml = htmlSegments.join("");
    htmlSegments = [];
    for (i = 0, l = reverseAncestors.length; i < l; i++) {
      htmlSegments.push(ancestorTagHTML(reverseAncestors[i], true));
    }
    trailingAncestorHtml = htmlSegments.join("");
    return {
      html: clone.outerHTML,
      leadingAncestorHtml,
      trailingAncestorHtml,
      css,
      ancestorCss
    };
  }

  // src/cssStringifier.js
  function CSSStringifier() {
    "use strict";
    function propertiesToString(properties) {
      var propertyName, output = "";
      if (!properties) {
        return output;
      }
      for (propertyName in properties) {
        if (properties.hasOwnProperty(propertyName)) {
          output += "    " + propertyName + ": " + properties[propertyName] + ";\n";
        }
      }
      return output;
    }
    function printIDs(ids, pseudoElement) {
      var i, l, idString, output = [];
      if (!(ids instanceof Array)) {
        ids = [ids];
      }
      for (i = 0, l = ids.length; i < l; i++) {
        idString = "#" + ids[i];
        if (pseudoElement) {
          idString += pseudoElement;
        }
        output.push(idString);
      }
      return output.join(", ");
    }
    this.process = function(styles) {
      var i, l, style, output = "";
      if (!styles) {
        return output;
      }
      for (i = 0, l = styles.length; i < l; i++) {
        style = styles[i];
        if (style.node && Object.keys(style.node).length > 0) {
          output += printIDs(style.id) + " {\n";
          output += propertiesToString(style.node);
          output += "}/*" + printIDs(style.id) + "*/\n\n";
        }
        if (style.after && Object.keys(style.after).length > 0) {
          output += printIDs(style.id, ":after") + " {\n";
          output += propertiesToString(style.after);
          output += "}/*" + printIDs(style.id, ":after") + "*/\n\n";
        }
        if (style.before && Object.keys(style.before).length > 0) {
          output += printIDs(style.id, ":before") + " {\n";
          output += propertiesToString(style.before);
          output += "}/*" + printIDs(style.id, ":before") + "*/\n\n";
        }
      }
      return output;
    };
  }

  // src/filters/defaultValueFilter.js
  function DefaultValueFilter(doc) {
    "use strict";
    var documentRef = doc || (typeof document !== "undefined" ? document : null);
    var iframe = null;
    function getIframe() {
      if (iframe) {
        return iframe;
      }
      if (documentRef && documentRef.createElement) {
        iframe = documentRef.createElement("iframe");
        iframe.style.display = "none";
        if (documentRef.body) {
          documentRef.body.appendChild(iframe);
        } else if (documentRef.documentElement) {
          documentRef.documentElement.appendChild(iframe);
        }
      }
      return iframe;
    }
    function removeDefaultValues(style, tagName, pseudoElement) {
      if (!style) {
        return null;
      }
      var activeIframe = getIframe();
      if (!activeIframe || !activeIframe.contentWindow || !activeIframe.contentWindow.document || !activeIframe.contentWindow.document.body) {
        return style;
      }
      var property, avalue, bvalue, cloneStyle, output = {}, iframeDoc = activeIframe.contentWindow.document, clone = iframeDoc.createElement(tagName);
      if (tagName.toUpperCase() === "A") {
        clone.setAttribute("href", "#");
      }
      iframeDoc.body.appendChild(clone);
      if (pseudoElement) {
        cloneStyle = activeIframe.contentWindow.getComputedStyle(clone, pseudoElement);
      } else {
        cloneStyle = activeIframe.contentWindow.getComputedStyle(clone);
      }
      for (property in style) {
        if (!style.hasOwnProperty(property)) {
          continue;
        }
        avalue = cloneStyle[property];
        bvalue = style[property];
        if (avalue === bvalue) {
          continue;
        }
        output[property] = bvalue;
      }
      iframeDoc.body.removeChild(clone);
      return output;
    }
    this.process = function(styles) {
      var i, l, style, output = [];
      for (i = 0, l = styles.length; i < l; i++) {
        style = styles[i];
        output.push({
          id: style.id,
          tagName: style.tagName,
          node: removeDefaultValues(style.node, style.tagName),
          before: style.before ? removeDefaultValues(style.before, style.tagName, ":before") : null,
          after: style.after ? removeDefaultValues(style.after, style.tagName, ":after") : null
        });
      }
      return output;
    };
    this.cleanup = function() {
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
        iframe = null;
      }
    };
  }

  // src/filters/shorthandPropertyFilter.js
  function ShorthandPropertyFilter(xdata) {
    "use strict";
    var shorthands = DEFAULT_SHORTHANDS;
    if (xdata && xdata.cssShorthands) {
      let mapObj = xdata.cssShorthands;
      let entries = Array.isArray(mapObj) ? mapObj : mapObj instanceof Map ? Array.from(mapObj.entries()) : Object.entries(mapObj);
      shorthands = Object.fromEntries(entries);
    }
    function keepOnlyShorthandProperties(style) {
      if (!style) {
        return null;
      }
      var property, output = {}, shorthand, longhands, blacklist = {}, i, l;
      for (shorthand in shorthands) {
        if (style.hasOwnProperty(shorthand) && style[shorthand]) {
          longhands = shorthands[shorthand];
          if (Array.isArray(longhands)) {
            for (i = 0, l = longhands.length; i < l; i++) {
              blacklist[longhands[i]] = true;
            }
          }
        } else if (!style[shorthand]) {
          blacklist[shorthand] = true;
        }
      }
      for (property in style) {
        if (style.hasOwnProperty(property) && !blacklist.hasOwnProperty(property)) {
          output[property] = style[property];
        }
      }
      return output;
    }
    this.process = function(styles) {
      var i, l, style, output = [];
      for (i = 0, l = styles.length; i < l; i++) {
        style = styles[i];
        output.push({
          id: style.id,
          tagName: style.tagName,
          node: keepOnlyShorthandProperties(style.node),
          before: style.before ? keepOnlyShorthandProperties(style.before) : null,
          after: style.after ? keepOnlyShorthandProperties(style.after) : null
        });
      }
      return output;
    };
  }

  // src/filters/webkitPropertiesFilter.js
  function WebkitPropertiesFilter() {
    "use strict";
    function removeWebkitProperties(style) {
      if (!style) {
        return null;
      }
      var property, output = {};
      for (property in style) {
        if (style.hasOwnProperty(property) && !/^-webkit-/.test(property)) {
          output[property] = style[property];
        }
      }
      return output;
    }
    this.process = function(styles) {
      var i, l, style, output = [];
      for (i = 0, l = styles.length; i < l; i++) {
        style = styles[i];
        output.push({
          id: style.id,
          tagName: style.tagName,
          node: removeWebkitProperties(style.node),
          before: style.before ? removeWebkitProperties(style.before) : null,
          after: style.after ? removeWebkitProperties(style.after) : null
        });
      }
      return output;
    };
  }

  // src/filters/sameRulesCombiner.js
  function SameRulesCombiner() {
    "use strict";
    function compareRules(rulesA, rulesB) {
      return JSON.stringify(rulesA || {}) === JSON.stringify(rulesB || {});
    }
    this.process = function(styles) {
      var i, j, stylesA, stylesB, ids, stylesCopy = JSON.parse(JSON.stringify(styles)), output = [];
      for (i = 0; i < stylesCopy.length; i++) {
        stylesA = stylesCopy[i];
        ids = [stylesA.id];
        for (j = i + 1; j < stylesCopy.length; j++) {
          stylesB = stylesCopy[j];
          if (compareRules(stylesA.node, stylesB.node) && compareRules(stylesA.after, stylesB.after) && compareRules(stylesA.before, stylesB.before)) {
            ids.push(stylesB.id);
            stylesCopy.splice(j, 1);
            j--;
          }
        }
        output.push({
          id: ids.length === 1 ? ids[0] : ids,
          node: stylesA.node,
          before: stylesA.before,
          after: stylesA.after
        });
      }
      return output;
    };
  }

  // src/htmlCleaner.js
  var DEFAULT_ALLOWED_ATTRIBUTES = {
    "id": true,
    "placeholder": ["input", "textarea"],
    "disabled": ["input", "textarea", "select", "option", "button"],
    "value": ["input", "button"],
    "readonly": ["input", "textarea", "option"],
    "label": ["option"],
    "selected": ["option"],
    "checked": ["input"],
    "src": ["img", "iframe", "script", "input"],
    "href": ["a", "area", "link"],
    "action": ["form"],
    "alt": ["img"],
    "type": ["input", "button", "script", "style", "link"]
  };
  function cleanHtml(htmlString, options = {}) {
    if (!htmlString) {
      return "";
    }
    const removeAttrs = options.removeAttrs || ["class"];
    const allowedAttrs = options.allowedAttributes || DEFAULT_ALLOWED_ATTRIBUTES;
    const format = options.format !== false;
    var doc;
    if (typeof DOMParser !== "undefined") {
      const parser = new DOMParser();
      doc = parser.parseFromString(`<body>${htmlString}</body>`, "text/html");
    } else if (typeof document !== "undefined") {
      doc = document.implementation.createHTMLDocument("");
      doc.body.innerHTML = htmlString;
    } else {
      return htmlString;
    }
    const body = doc.body;
    function cleanNode(node) {
      if (node.nodeType === 1) {
        const tagName = node.tagName.toLowerCase();
        const attrsToRemove = [];
        for (let i = 0; i < node.attributes.length; i++) {
          const attr = node.attributes[i];
          const attrName = attr.name.toLowerCase();
          let keep = true;
          if (removeAttrs.includes(attrName)) {
            keep = false;
          } else if (allowedAttrs) {
            if (Array.isArray(allowedAttrs)) {
              keep = allowedAttrs.includes(attrName);
            } else if (typeof allowedAttrs === "object") {
              const rule = allowedAttrs[attrName];
              if (rule === true) {
                keep = true;
              } else if (Array.isArray(rule)) {
                keep = rule.includes(tagName);
              } else if (rule === void 0) {
                keep = false;
              }
            }
          }
          if (!keep) {
            attrsToRemove.push(attr.name);
          }
        }
        attrsToRemove.forEach((attrName) => node.removeAttribute(attrName));
        for (let child of Array.from(node.childNodes)) {
          cleanNode(child);
        }
      }
    }
    for (let child of Array.from(body.childNodes)) {
      cleanNode(child);
    }
    if (!format) {
      return body.innerHTML;
    }
    return formatNode(body, 0).trim();
  }
  var VOID_ELEMENTS = /* @__PURE__ */ new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr"
  ]);
  function formatNode(node, level = 0) {
    let indent = "  ".repeat(level);
    let result = "";
    for (let child of Array.from(node.childNodes)) {
      if (child.nodeType === 3) {
        let text = child.nodeValue.trim();
        if (text.length > 0) {
          result += indent + text + "\n";
        }
      } else if (child.nodeType === 1) {
        const tagName = child.tagName.toLowerCase();
        let attrsStr = "";
        for (let i = 0; i < child.attributes.length; i++) {
          const attr = child.attributes[i];
          attrsStr += ` ${attr.name}="${attr.value}"`;
        }
        const isVoid = VOID_ELEMENTS.has(tagName);
        const hasChildren = child.childNodes.length > 0;
        if (isVoid) {
          result += `${indent}<${tagName}${attrsStr}>
`;
        } else if (!hasChildren) {
          result += `${indent}<${tagName}${attrsStr}></${tagName}>
`;
        } else if (child.childNodes.length === 1 && child.childNodes[0].nodeType === 3) {
          let text = child.childNodes[0].nodeValue.trim();
          result += `${indent}<${tagName}${attrsStr}>${text}</${tagName}>
`;
        } else {
          result += `${indent}<${tagName}${attrsStr}>
`;
          result += formatNode(child, level + 1);
          result += `${indent}</${tagName}>
`;
        }
      } else if (child.nodeType === 8) {
        result += `${indent}<!--${child.nodeValue}-->
`;
      }
    }
    return result;
  }

  // src/index.js
  function extractSnippet(elementOrSnapshot, options = {}) {
    const defaultOptions = {
      removeDefaultValues: true,
      propertiesCleanUp: true,
      removeWebkitProperties: true,
      combineSameRules: true,
      fixHTMLIndentation: true,
      includeAncestors: false,
      embedCSS: false,
      idPrefix: "",
      xdata: null
    };
    const opts = { ...defaultOptions, ...options };
    var snapshot;
    if (elementOrSnapshot && typeof elementOrSnapshot === "object" && elementOrSnapshot.nodeType === 1) {
      snapshot = Snapshooter(elementOrSnapshot, opts.xdata);
    } else if (elementOrSnapshot && typeof elementOrSnapshot === "object" && elementOrSnapshot.html) {
      snapshot = elementOrSnapshot;
    } else {
      throw new Error("extractSnippet requires a valid DOM element or snapshot object.");
    }
    return processSnapshot(snapshot, opts, elementOrSnapshot.ownerDocument || globalThis.document);
  }
  function processSnapshot(snapshot, opts = {}, doc = null) {
    var styles = JSON.parse(JSON.stringify(snapshot.css || []));
    var html = snapshot.html || "";
    var prefix = "";
    if (opts.includeAncestors) {
      if (snapshot.ancestorCss) {
        styles = JSON.parse(JSON.stringify(snapshot.ancestorCss)).concat(styles);
      }
      html = (snapshot.leadingAncestorHtml || "") + html + (snapshot.trailingAncestorHtml || "");
    }
    if (opts.removeDefaultValues) {
      var defaultValueFilter = new DefaultValueFilter(doc);
      styles = defaultValueFilter.process(styles);
      defaultValueFilter.cleanup();
    }
    if (opts.propertiesCleanUp) {
      var shorthandPropertyFilter = new ShorthandPropertyFilter(opts.xdata);
      styles = shorthandPropertyFilter.process(styles);
    }
    if (opts.removeWebkitProperties) {
      var webkitPropertiesFilter = new WebkitPropertiesFilter();
      styles = webkitPropertiesFilter.process(styles);
    }
    if (opts.combineSameRules) {
      var sameRulesCombiner = new SameRulesCombiner();
      styles = sameRulesCombiner.process(styles);
    }
    if (opts.fixHTMLIndentation) {
      html = cleanHtml(html, {
        format: true
      });
    }
    var cssStringifier = new CSSStringifier();
    styles = cssStringifier.process(styles);
    if (opts.embedCSS) {
      html = '<style type="text/css">\n' + styles + "</style>\n" + html;
      styles = "";
    }
    function isValidPrefix(p) {
      return /^[a-z][a-z0-9.\-_:]*$/i.test(p);
    }
    if (opts.idPrefix && isValidPrefix(opts.idPrefix)) {
      prefix = opts.idPrefix;
    }
    html = html.replace(/:snappysnippet_prefix:/g, prefix);
    styles = styles.replace(/:snappysnippet_prefix:/g, prefix);
    return {
      html,
      css: styles
    };
  }
  var index_default = extractSnippet;
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=snappysnippet.js.map
