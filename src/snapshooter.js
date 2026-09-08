import { DEFAULT_SHORTHANDS } from './cssMetadata.js';

/**
 * Snapshooter is responsible for returning HTML and computed CSS of all nodes from selected DOM subtree.
 *
 * @param {HTMLElement} root Root node for the subtree that will be processed
 * @param {Object} [xdata] Optional CSS metadata object with cssShorthands Map/Array
 * @returns {Object} snapshot object with html, leadingAncestorHtml, trailingAncestorHtml, css, ancestorCss
 */
export function Snapshooter(root, xdata) {
	"use strict";

	if (!root) {
		throw new Error("Snapshooter requires a valid DOM element or snapshot object.");
	}

	var win = (root.ownerDocument && root.ownerDocument.defaultView) || globalThis;
	var cssShorthandsMap = xdata && xdata.cssShorthands ? xdata.cssShorthands : null;

	var shorthandsToCamelCase = {};

	const cssPropToCamelCase = (cssProperty) =>
		cssProperty.replace(/^-./, (match) => match.slice(1))
					.replace(/-([a-z])/g, (_, char) => char.toUpperCase());

	if (cssShorthandsMap) {
		let entries = Array.isArray(cssShorthandsMap)
			? cssShorthandsMap
			: (cssShorthandsMap instanceof Map ? Array.from(cssShorthandsMap.entries()) : Object.entries(cssShorthandsMap));

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
		var i, l, cssName, camelCaseName,
			output = {};

		for (i = 0, l = style.length; i < l; i++) {
			output[style[i]] = style[style[i]];
		}

		output.content = fixContentProperty(style.content);

		for (cssName in shorthandsToCamelCase) {
			if (shorthandsToCamelCase.hasOwnProperty(cssName)) {
				camelCaseName = shorthandsToCamelCase[cssName];
				if (style[camelCaseName] !== undefined && style[camelCaseName] !== '') {
					output[cssName] = style[camelCaseName];
				}
			}
		}

		return output;
	}

	function fixContentProperty(content) {
		var values, output, value, i, l;

		output = [];

		if (content) {
			values = content.match(/(?:[^\s']+|'[^']*')+/g);

			if (values) {
				for (i = 0, l = values.length; i < l; i++) {
					value = values[i];

					if (value.match(/^(url\()|(attr\()|normal|none|open-quote|close-quote|no-open-quote|close-quote|chapter_counter|'/g)) {
						output.push(value);
					} else {
						output.push("'" + value + "'");
					}
				}
			}
		}

		return output.join(' ');
	}

	function createID(node) {
		return ':snappysnippet_prefix:' + node.tagName + '_' + idCounter++;
	}

	function dumpCSS(node, pseudoElement) {
		var styles = win.getComputedStyle(node, pseudoElement);

		if (pseudoElement) {
			if (!styles.getPropertyValue('content') || styles.getPropertyValue('content') === 'none') {
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
			before: omitPseudoElements ? null : dumpCSS(element, ':before'),
			after: omitPseudoElements ? null : dumpCSS(element, ':after')
		};
	}

	function ancestorTagHTML(element, closingTag) {
		var i, attr, value, idSeen,
			result, attributes;

		if (closingTag) {
			return '</' + element.tagName.toLowerCase() + '>';
		}

		result = '<' + element.tagName.toLowerCase();
		attributes = element.attributes;

		for (i = 0; i < attributes.length; ++i) {
			attr = attributes[i];

			if (attr.name.toLowerCase() === 'id') {
				value = createID(element);
				idSeen = true;
			} else {
				value = attr.value;
			}

			result += ' ' + attributes[i].name + '="' + value + '"';
		}

		if (!idSeen) {
			result += ' id="' + createID(element) + '"';
		}

		result += '>';

		return result;
	}

	function relativeURLsToAbsoluteURLs(element, origElement) {
		var target = origElement || element;
		switch (element.nodeName) {
			case 'A':
			case 'AREA':
			case 'LINK':
			case 'BASE':
				if (element.hasAttribute('href') && target.href) {
					element.setAttribute('href', target.href);
				}
				break;
			case 'IMG':
			case 'IFRAME':
			case 'INPUT':
			case 'FRAME':
			case 'SCRIPT':
				if (element.hasAttribute('src') && target.src) {
					element.setAttribute('src', target.src);
				}
				break;
			case 'FORM':
				if (element.hasAttribute('action') && target.action) {
					element.setAttribute('action', target.action);
				}
				break;
		}
	}

	var css = [],
		ancestorCss = [],
		descendants,
		origDescendants,
		descendant,
		htmlSegments,
		leadingAncestorHtml,
		trailingAncestorHtml,
		reverseAncestors = [],
		i, l,
		parent,
		clone;

	descendants = root.getElementsByTagName('*');

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

	origDescendants = root.getElementsByTagName('*');
	clone = root.cloneNode(true);
	descendants = clone.getElementsByTagName('*');
	idCounter = 1;

	clone.setAttribute('id', createID(clone));
	relativeURLsToAbsoluteURLs(clone, root);

	for (i = 0, l = descendants.length; i < l; i++) {
		descendant = descendants[i];
		descendant.setAttribute('id', createID(descendant));
		relativeURLsToAbsoluteURLs(descendant, origDescendants[i]);
	}

	htmlSegments = [];
	for (i = reverseAncestors.length - 1; i >= 0; i--) {
		htmlSegments.push(ancestorTagHTML(reverseAncestors[i]));
	}
	leadingAncestorHtml = htmlSegments.join('');

	htmlSegments = [];
	for (i = 0, l = reverseAncestors.length; i < l; i++) {
		htmlSegments.push(ancestorTagHTML(reverseAncestors[i], true));
	}
	trailingAncestorHtml = htmlSegments.join('');

	return {
		html: clone.outerHTML,
		leadingAncestorHtml: leadingAncestorHtml,
		trailingAncestorHtml: trailingAncestorHtml,
		css: css,
		ancestorCss: ancestorCss
	};
}
