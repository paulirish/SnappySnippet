/**
 * Filter that removes all -webkit prefixed properties.
 *
 * @constructor
 */
export function WebkitPropertiesFilter() {
	"use strict";

	function removeWebkitProperties(style) {
		if (!style) {
			return null;
		}

		var property,
			output = {};

		for (property in style) {
			if (style.hasOwnProperty(property) && !/^-webkit-/.test(property)) {
				output[property] = style[property];
			}
		}

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
				node: removeWebkitProperties(style.node),
				before: style.before ? removeWebkitProperties(style.before) : null,
				after: style.after ? removeWebkitProperties(style.after) : null
			});
		}

		return output;
	};
}
