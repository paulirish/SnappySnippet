import { DEFAULT_SHORTHANDS } from '../cssMetadata.js';

/**
 * Filter that removes all non-shorthand properties (where possible) resulting in more concise and readable code.
 *
 * @constructor
 */
export function ShorthandPropertyFilter(xdata) {
	"use strict";

	var shorthands = DEFAULT_SHORTHANDS;

	if (xdata && xdata.cssShorthands) {
		let mapObj = xdata.cssShorthands;
		let entries = Array.isArray(mapObj)
			? mapObj
			: (mapObj instanceof Map ? Array.from(mapObj.entries()) : Object.entries(mapObj));
		shorthands = Object.fromEntries(entries);
	}

	function keepOnlyShorthandProperties(style) {
		if (!style) {
			return null;
		}

		var property,
			output = {},
			shorthand,
			longhands,
			blacklist = {},
			i, l;

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

	this.process = function (styles) {
		var i, l,
			style,
			output = [];

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
