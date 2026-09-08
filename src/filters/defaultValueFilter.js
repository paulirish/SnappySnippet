/**
 * Filter that removes all properties that use default browser values.
 *
 * @constructor
 */
export function DefaultValueFilter(doc) {
	"use strict";

	var documentRef = doc || (typeof document !== 'undefined' ? document : null);
	var iframe = null;

	function getIframe() {
		if (iframe) {
			return iframe;
		}
		if (documentRef && documentRef.createElement) {
			iframe = documentRef.createElement('iframe');
			iframe.style.display = 'none';
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

		var property,
			avalue,
			bvalue,
			cloneStyle,
			output = {},
			iframeDoc = activeIframe.contentWindow.document,
			clone = iframeDoc.createElement(tagName);

		if (tagName.toUpperCase() === 'A') {
			clone.setAttribute('href', '#');
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

	this.process = function (styles) {
		var i, l,
			style,
			output = [];

		for (i = 0, l = styles.length; i < l; i++) {
			style = styles[i];

			output.push({
				id: style.id,
				tagName: style.tagName,
				node: removeDefaultValues(style.node, style.tagName),
				before: style.before ? removeDefaultValues(style.before, style.tagName, ':before') : null,
				after: style.after ? removeDefaultValues(style.after, style.tagName, ':after') : null
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
