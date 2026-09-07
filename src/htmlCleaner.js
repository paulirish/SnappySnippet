/**
 * Native HTML cleaner and formatter without external dependencies like jQuery.
 */

const DEFAULT_ALLOWED_ATTRIBUTES = {
	'id': true,
	'placeholder': ['input', 'textarea'],
	'disabled': ['input', 'textarea', 'select', 'option', 'button'],
	'value': ['input', 'button'],
	'readonly': ['input', 'textarea', 'option'],
	'label': ['option'],
	'selected': ['option'],
	'checked': ['input'],
	'src': ['img', 'iframe', 'script', 'input'],
	'href': ['a', 'area', 'link'],
	'action': ['form'],
	'alt': ['img'],
	'type': ['input', 'button', 'script', 'style', 'link']
};

/**
 * Clean and format HTML string
 * @param {string} htmlString
 * @param {Object} [options]
 * @returns {string}
 */
export function cleanHtml(htmlString, options = {}) {
	if (!htmlString) {
		return '';
	}

	const removeAttrs = options.removeAttrs || ['class'];
	const allowedAttrs = options.allowedAttributes || DEFAULT_ALLOWED_ATTRIBUTES;
	const format = options.format !== false;

	var doc;
	if (typeof DOMParser !== 'undefined') {
		const parser = new DOMParser();
		doc = parser.parseFromString(`<body>${htmlString}</body>`, 'text/html');
	} else if (typeof document !== 'undefined') {
		doc = document.implementation.createHTMLDocument('');
		doc.body.innerHTML = htmlString;
	} else {
		return htmlString;
	}

	const body = doc.body;

	function cleanNode(node) {
		if (node.nodeType === 1) { // Element node
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
					} else if (typeof allowedAttrs === 'object') {
						const rule = allowedAttrs[attrName];
						if (rule === true) {
							keep = true;
						} else if (Array.isArray(rule)) {
							keep = rule.includes(tagName);
						} else if (rule === undefined) {
							keep = false;
						}
					}
				}

				if (!keep) {
					attrsToRemove.push(attr.name);
				}
			}

			attrsToRemove.forEach(attrName => node.removeAttribute(attrName));

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

const VOID_ELEMENTS = new Set([
	'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
	'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

function formatNode(node, level = 0) {
	let indent = '  '.repeat(level);
	let result = '';

	for (let child of Array.from(node.childNodes)) {
		if (child.nodeType === 3) { // Text node
			let text = child.nodeValue.trim();
			if (text.length > 0) {
				result += indent + text + '\n';
			}
		} else if (child.nodeType === 1) { // Element node
			const tagName = child.tagName.toLowerCase();
			let attrsStr = '';
			for (let i = 0; i < child.attributes.length; i++) {
				const attr = child.attributes[i];
				attrsStr += ` ${attr.name}="${attr.value}"`;
			}

			const isVoid = VOID_ELEMENTS.has(tagName);
			const hasChildren = child.childNodes.length > 0;

			if (isVoid) {
				result += `${indent}<${tagName}${attrsStr}>\n`;
			} else if (!hasChildren) {
				result += `${indent}<${tagName}${attrsStr}></${tagName}>\n`;
			} else if (child.childNodes.length === 1 && child.childNodes[0].nodeType === 3) {
				let text = child.childNodes[0].nodeValue.trim();
				result += `${indent}<${tagName}${attrsStr}>${text}</${tagName}>\n`;
			} else {
				result += `${indent}<${tagName}${attrsStr}>\n`;
				result += formatNode(child, level + 1);
				result += `${indent}</${tagName}>\n`;
			}
		} else if (child.nodeType === 8) { // Comment node
			result += `${indent}<!--${child.nodeValue}-->\n`;
		}
	}

	return result;
}
