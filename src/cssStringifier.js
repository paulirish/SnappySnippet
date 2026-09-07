/**
 * Utility that transforms object representing CSS rules to actual CSS code.
 *
 * @constructor
 */
export function CSSStringifier() {
	"use strict";

	function propertiesToString(properties) {
		var propertyName,
			output = "";

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
		var i, l,
			idString,
			output = [];

		if (!(ids instanceof Array)) {
			ids = [ids];
		}

		for (i = 0, l = ids.length; i < l; i++) {
			idString = '#' + ids[i];
			if (pseudoElement) {
				idString += pseudoElement;
			}

			output.push(idString);
		}

		return output.join(', ');
	}

	this.process = function (styles) {
		var i, l,
			style,
			output = "";

		if (!styles) {
			return output;
		}

		for (i = 0, l = styles.length; i < l; i++) {
			style = styles[i];

			if (style.node && Object.keys(style.node).length > 0) {
				output += printIDs(style.id) + ' {\n';
				output += propertiesToString(style.node);
				output += '}/*' + printIDs(style.id) + '*/\n\n';
			}

			if (style.after && Object.keys(style.after).length > 0) {
				output += printIDs(style.id, ':after') + ' {\n';
				output += propertiesToString(style.after);
				output += '}/*' + printIDs(style.id, ':after') + '*/\n\n';
			}

			if (style.before && Object.keys(style.before).length > 0) {
				output += printIDs(style.id, ':before') + ' {\n';
				output += propertiesToString(style.before);
				output += '}/*' + printIDs(style.id, ':before') + '*/\n\n';
			}
		}

		return output;
	};
}
