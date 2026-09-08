import { Snapshooter } from './snapshooter.js';
import { CSSStringifier } from './cssStringifier.js';
import { DefaultValueFilter } from './filters/defaultValueFilter.js';
import { ShorthandPropertyFilter } from './filters/shorthandPropertyFilter.js';
import { WebkitPropertiesFilter } from './filters/webkitPropertiesFilter.js';
import { SameRulesCombiner } from './filters/sameRulesCombiner.js';
import { cleanHtml } from './htmlCleaner.js';
import { getCssMetadata } from './cssMetadata.js';

export {
	Snapshooter,
	CSSStringifier,
	DefaultValueFilter,
	ShorthandPropertyFilter,
	WebkitPropertiesFilter,
	SameRulesCombiner,
	cleanHtml,
	getCssMetadata
};

/**
 * Extracts clean HTML and CSS snippet from a DOM element or pre-captured snapshot.
 *
 * @param {HTMLElement|Object} elementOrSnapshot DOM Element to inspect OR existing snapshot object.
 * @param {Object} [options] Options configuration
 * @param {boolean} [options.removeDefaultValues=true]
 * @param {boolean} [options.propertiesCleanUp=true]
 * @param {boolean} [options.removeWebkitProperties=true]
 * @param {boolean} [options.combineSameRules=true]
 * @param {boolean} [options.fixHTMLIndentation=true]
 * @param {boolean} [options.includeAncestors=false]
 * @param {boolean} [options.embedCSS=false]
 * @param {string} [options.idPrefix='']
 * @param {Object} [options.xdata] Optional metadata for css properties/shorthands
 * @returns {{html: string, css: string}}
 */
export function extractSnippet(elementOrSnapshot, options = {}) {
	const defaultOptions = {
		removeDefaultValues: true,
		propertiesCleanUp: true,
		removeWebkitProperties: true,
		combineSameRules: true,
		fixHTMLIndentation: true,
		includeAncestors: false,
		embedCSS: false,
		idPrefix: '',
		xdata: null
	};

	const opts = { ...defaultOptions, ...options };

	var snapshot;
	if (elementOrSnapshot && typeof elementOrSnapshot === 'object' && elementOrSnapshot.nodeType === 1) {
		snapshot = Snapshooter(elementOrSnapshot, opts.xdata);
	} else if (elementOrSnapshot && typeof elementOrSnapshot === 'object' && elementOrSnapshot.html) {
		snapshot = elementOrSnapshot;
	} else {
		throw new Error("extractSnippet requires a valid DOM element or snapshot object.");
	}

	return processSnapshot(snapshot, opts, elementOrSnapshot.ownerDocument || globalThis.document);
}

/**
 * Processes a snapshot object using given options and filters.
 */
export function processSnapshot(snapshot, opts = {}, doc = null) {
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
		html = '<style type="text/css">\n' + styles + '</style>\n' + html;
		styles = '';
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
		html: html,
		css: styles
	};
}

export default extractSnippet;
