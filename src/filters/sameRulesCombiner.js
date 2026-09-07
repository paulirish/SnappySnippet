/**
 * Utility that combines together rules with exact same properties and values.
 *
 * @constructor
 */
export function SameRulesCombiner() {
	"use strict";

	function compareRules(rulesA, rulesB) {
		return JSON.stringify(rulesA || {}) === JSON.stringify(rulesB || {});
	}

	this.process = function (styles) {
		var i, j,
			stylesA, stylesB,
			ids,
			stylesCopy = JSON.parse(JSON.stringify(styles)),
			output = [];

		for (i = 0; i < stylesCopy.length; i++) {
			stylesA = stylesCopy[i];
			ids = [stylesA.id];

			for (j = i + 1; j < stylesCopy.length; j++) {
				stylesB = stylesCopy[j];

				if (compareRules(stylesA.node, stylesB.node) &&
					compareRules(stylesA.after, stylesB.after) &&
					compareRules(stylesA.before, stylesB.before)) {

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
