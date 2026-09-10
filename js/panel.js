(function () {
	"use strict";

	var lastSnapshot;
	var inspectedContext = new InspectedContext();

	var loader = $('#loader');
	var createButton = $('#create');

	var codepenForm = $('#codepen-form');
	var jsfiddleForm = $('#jsfiddle-form');
	var jsbinForm = $('#jsbin-form');

	var propertiesCleanUpInput = $('#properties-clean-up');
	var removeDefaultValuesInput = $('#remove-default-values');
	var removeWebkitPropertiesInput = $('#remove-webkit-properties');
	var combineSameRulesInput = $('#combine-same-rules');
	var fixHTMLIndentationInput = $('#fix-html-indentation');
	var includeAncestors = $('#include-ancestors');
	var embedCSS = $('#embed-css');
	var idPrefix = $('#id-prefix');

	var htmlTextarea = $('#html');
	var cssTextarea = $('#css');
	var previewFrame = $('#preview-frame');

	var errorBox = $('#error-box');

	restoreSettings();

	// SUBMITTING THE CODE TO CodePen/jsFiddle/jsBin

	codepenForm.on('submit', function () {
		var dataInput = codepenForm.find('input[name=data]');

		dataInput.val(JSON.stringify({
			html: htmlTextarea.val(),
			css: cssTextarea.val(),
			editors: '110',
			tags: ['SnappySnippet']
		}));
	});

	jsfiddleForm.on('submit', function () {
		var htmlInput = jsfiddleForm.find('input[name=html]');
		var cssInput = jsfiddleForm.find('input[name=css]');

		htmlInput.val(htmlTextarea.val());
		cssInput.val(cssTextarea.val());
	});

	jsbinForm.on('submit', function () {
		var htmlInput = jsbinForm.find('input[name=html]');
		var cssInput = jsbinForm.find('input[name=css]');

		htmlInput.val(encodeURIComponent(htmlTextarea.val()));
		cssInput.val(encodeURIComponent(cssTextarea.val()));
	});

	// Event listeners

	propertiesCleanUpInput.on('change', persistSettingAndProcessSnapshot);
	removeDefaultValuesInput.on('change', persistSettingAndProcessSnapshot);
	removeWebkitPropertiesInput.on('change', persistSettingAndProcessSnapshot);
	fixHTMLIndentationInput.on('change', persistSettingAndProcessSnapshot);
	combineSameRulesInput.on('change', persistSettingAndProcessSnapshot);
	includeAncestors.on('change', persistSettingAndProcessSnapshot);
	embedCSS.on('change', persistSettingAndProcessSnapshot);

	createButton.on('click', makeSnapshot);

	htmlTextarea.on('click', function () {
		$(this).select();
	});
	cssTextarea.on('click', function () {
		$(this).select();
	});

	$('input[type="checkbox"]').each(function () {
		$(this).checkbox();
	});

	function isValidPrefix(prefix) {
		var validator = /^[a-z][a-z0-9._:-]*$/i;

		return validator.test(prefix);
	}

	idPrefix.on('change', function () {
		var val = $(this).val();
		var parent = $(this).parent();

		parent.removeClass('has-error').removeClass('has-success');

		if (val.length === 0) {
			persistSettingAndProcessSnapshot.apply(this);
		} else if (isValidPrefix(val)) {
			parent.addClass('has-success');
			persistSettingAndProcessSnapshot.apply(this);
		} else {
			parent.addClass('has-error');
		}
	});

	// Settings - saving & restoring

	function restoreSettings() {
		chrome.runtime.sendMessage({
			name: 'getSettings'
		}, function (settings) {
			for (var prop in settings) {
				var el = $("#" + prop);

				if (!el.length) {
					delete settings[prop];
					continue;
				}

				if (el.is('[type=checkbox]')) {
					el.data('checkbox').setCheck(settings[prop] === "true" ? 'check' : 'uncheck');
				} else {
					el.val(settings[prop]);
				}
			}

			chrome.runtime.sendMessage({
				name: 'setSettings',
				data: settings
			});
		});
	}

	function persistSettingAndProcessSnapshot() {
		chrome.runtime.sendMessage({
			name: 'changeSetting',
			item: this.id,
			value: (this.type === 'checkbox') ? this.checked : this.value
		});
		processSnapshot();
	}

	// Snapshot probe to be executed inside inspected page context
	function snapshotProbe(root) {
		if (!root || root.nodeType !== 1) {
			return null;
		}

		var defaultShorthands = [
			'animation', 'background', 'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
			'border-width', 'border-color', 'border-style', 'border-radius', 'border-image', 'border-spacing',
			'flex', 'flex-flow', 'font', 'grid-area', 'grid-column', 'grid-row', 'list-style', 'margin',
			'marker', 'outline', 'overflow', 'padding', 'text-decoration', 'transition',
			'-webkit-border-after', '-webkit-border-before', '-webkit-border-end', '-webkit-border-start',
			'-webkit-columns', '-webkit-column-rule', '-webkit-margin-collapse', '-webkit-mask',
			'-webkit-mask-position', '-webkit-mask-repeat', '-webkit-text-emphasis', '-webkit-transition',
			'-webkit-transform-origin'
		];

		var shorthandsToCamelCase = {};
		var cssPropToCamelCase = function (cssProperty) {
			return cssProperty.replace(/^-./, function (m) { return m.slice(1); })
				.replace(/-([a-z])/g, function (_, char) { return char.toUpperCase(); });
		};
		for (var s = 0; s < defaultShorthands.length; s++) {
			shorthandsToCamelCase[defaultShorthands[s]] = cssPropToCamelCase(defaultShorthands[s]);
		}

		try {
			var dummy = root.ownerDocument.createElement('div');
			var dStyle = dummy.style;
			var proto = Object.getPrototypeOf(dStyle);
			if (proto) {
				var props = Object.getOwnPropertyNames(proto);
				for (var p = 0; p < props.length; p++) {
					var name = props[p];
					if (typeof dStyle[name] === 'string' && name !== 'cssText' && name !== 'length') {
						var cssProp = name.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); });
						if (typeof CSS !== 'undefined' && CSS.supports && CSS.supports(cssProp, 'initial')) {
							dStyle.cssText = '';
							dStyle.setProperty(cssProp, 'initial');
							if (dStyle.length > 1) {
								shorthandsToCamelCase[cssProp] = name;
							}
						}
					}
				}
			}
		} catch {
			// Ignore and use default shorthands
		}

		function fixContentProperty(content) {
			if (!content) {
				return '';
			}
			var values = content.match(/(?:[^\s']+|'[^']*')+/g);
			if (!values) {
				return '';
			}
			var output = [];
			for (var i = 0; i < values.length; i++) {
				var val = values[i];
				if (val.match(/^(url\()|(attr\()|normal|none|open-quote|close-quote|no-open-quote|no-close-quote|chapter_counter|'/)) {
					output.push(val);
				} else {
					output.push("'" + val + "'");
				}
			}
			return output.join(' ');
		}

		function styleDeclarationToSimpleObject(style) {
			var output = {};
			for (var i = 0; i < style.length; i++) {
				var prop = style[i];
				output[prop] = style.getPropertyValue(prop);
			}
			if (style.content) {
				output.content = fixContentProperty(style.content);
			}
			for (var cssName in shorthandsToCamelCase) {
				if (Object.prototype.hasOwnProperty.call(shorthandsToCamelCase, cssName)) {
					var camelName = shorthandsToCamelCase[cssName];
					var val = style[camelName] || style.getPropertyValue(cssName);
					if (val) {
						output[cssName] = val;
					}
				}
			}
			return output;
		}

		function dumpCSS(node, pseudoElement) {
			if (!node.ownerDocument || !node.ownerDocument.defaultView) {
				return {};
			}
			var styles = node.ownerDocument.defaultView.getComputedStyle(node, pseudoElement);
			if (pseudoElement) {
				var content = styles.getPropertyValue('content');
				if (!content || content === 'none' || content === 'normal' || content === '""' || content === "''") {
					return null;
				}
			}
			return styleDeclarationToSimpleObject(styles);
		}

		var idCounter = 1;
		function createID(node) {
			return ':snappysnippet_prefix:' + node.tagName + '_' + (idCounter++);
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
			if (closingTag) {
				return '</' + element.tagName + '>';
			}
			var result = '<' + element.tagName;
			var attributes = element.attributes;
			var idSeen = false;
			for (var i = 0; i < attributes.length; ++i) {
				var attr = attributes[i];
				var value = attr.value;
				if (attr.name.toLowerCase() === 'id') {
					value = createID(element);
					idSeen = true;
				}
				result += ' ' + attr.name + '="' + value + '"';
			}
			if (!idSeen) {
				result += ' id="' + createID(element) + '"';
			}
			result += '>';
			return result;
		}

		function relativeURLsToAbsoluteURLs(element) {
			switch (element.nodeName) {
				case 'A':
				case 'AREA':
				case 'LINK':
				case 'BASE': {
					var href = element.getAttribute('href');
					if (href && !href.startsWith('#') && element.href && typeof element.href === 'string') {
						element.setAttribute('href', element.href);
					}
					break;
				}
				case 'IMG':
				case 'IFRAME':
				case 'INPUT':
				case 'FRAME':
				case 'SCRIPT':
					if (element.hasAttribute('src')) {
						element.setAttribute('src', element.src);
					}
					break;
				case 'FORM':
					if (element.hasAttribute('action')) {
						element.setAttribute('action', element.action);
					}
					break;
			}
		}

		var css = [];
		var ancestorCss = [];
		var descendants = root.getElementsByTagName('*');
		var reverseAncestors = [];
		var parent = root.parentElement;
		while (parent && parent !== root.ownerDocument.body) {
			reverseAncestors.push(parent);
			parent = parent.parentElement;
		}

		css.push(cssObjectForElement(root));

		for (var i = 0, l = descendants.length; i < l; i++) {
			css.push(cssObjectForElement(descendants[i]));
		}

		for (var a = reverseAncestors.length - 1; a >= 0; a--) {
			ancestorCss.push(cssObjectForElement(reverseAncestors[a], true));
		}

		var clone = root.cloneNode(true);
		var cloneDescendants = clone.getElementsByTagName('*');
		idCounter = 1;

		clone.setAttribute('id', createID(clone));
		relativeURLsToAbsoluteURLs(clone);

		for (var c = 0, cl = cloneDescendants.length; c < cl; c++) {
			var desc = cloneDescendants[c];
			desc.setAttribute('id', createID(desc));
			relativeURLsToAbsoluteURLs(desc);
		}

		var htmlSegments = [];
		for (var h1 = reverseAncestors.length - 1; h1 >= 0; h1--) {
			htmlSegments.push(ancestorTagHTML(reverseAncestors[h1]));
		}
		var leadingAncestorHtml = htmlSegments.join('');

		htmlSegments = [];
		for (var h2 = 0; h2 < reverseAncestors.length; h2++) {
			htmlSegments.push(ancestorTagHTML(reverseAncestors[h2], true));
		}
		var trailingAncestorHtml = htmlSegments.join('');

		return JSON.stringify({
			html: clone.outerHTML,
			leadingAncestorHtml: leadingAncestorHtml,
			trailingAncestorHtml: trailingAncestorHtml,
			css: css,
			ancestorCss: ancestorCss
		});
	}

	// Making & processing snippets

	function makeSnapshot() {
		loader.addClass('creating');
		errorBox.removeClass('active');

		inspectedContext.eval('(' + snapshotProbe.toString() + ')($0)', function (result, isException) {
			if (isException || !result) {
				errorBox.find('.error-message').text('DOM snapshot could not be created. Make sure that you have inspected some element.');
				errorBox.addClass('active');
				updatePreview('', '');
				loader.removeClass('creating');
				return;
			}

			try {
				lastSnapshot = JSON.parse(result);
			} catch {
				errorBox.find('.error-message').text('DOM snapshot could not be created. Make sure that you have inspected some element.');
				errorBox.addClass('active');
				updatePreview('', '');
				loader.removeClass('creating');
				return;
			}

			processSnapshot();
			loader.removeClass('creating');
		});
	}

	function updatePreview(html, css) {
		if (!previewFrame || !previewFrame.length) {
			previewFrame = $('#preview-frame');
		}

		if (!previewFrame.length) {
			return;
		}

		if (!html && !css) {
			previewFrame.attr('srcdoc', '<!DOCTYPE html><html><body></body></html>');
			return;
		}

		var styleTag = '';
		if (css && !html.includes('<style')) {
			styleTag = '<style type="text/css">\n' + css + '\n</style>\n';
		}

		var doc = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n' +
			styleTag +
			'</head>\n<body>\n' +
			(html || '') +
			'\n</body>\n</html>';

		previewFrame.attr('srcdoc', doc);
	}

	function processSnapshot() {
		if (!lastSnapshot) {
			return;
		}

		loader.addClass('processing');

		try {
			var prefix = isValidPrefix(idPrefix.val()) ? idPrefix.val() : '';
			var options = {
				propertiesCleanUp: propertiesCleanUpInput.is(':checked'),
				removeDefaultValues: removeDefaultValuesInput.is(':checked'),
				removeWebkitProperties: removeWebkitPropertiesInput.is(':checked'),
				combineSameRules: combineSameRulesInput.is(':checked'),
				fixHTMLIndentation: fixHTMLIndentationInput.is(':checked'),
				includeAncestors: includeAncestors.is(':checked'),
				embedCSS: embedCSS.is(':checked'),
				idPrefix: prefix
			};

			var snappy = window.SnappySnippet || globalThis.SnappySnippet;
			if (!snappy || typeof snappy.extractSnippet !== 'function') {
				throw new Error('SnappySnippet core library is not loaded');
			}

			var snippet = snappy.extractSnippet(lastSnapshot, options);
			var html = snippet.html || '';
			var css = snippet.css || '';

			if (options.embedCSS && !html.includes('<style') && css) {
				html = '<style type="text/css">\n' + css + '</style>\n' + html;
				css = '';
			}

			// Fallback replacement if prefix was not replaced by the core library
			html = html.replace(/:snappysnippet_prefix:/g, prefix);
			css = css.replace(/:snappysnippet_prefix:/g, prefix);

			htmlTextarea.val(html);
			cssTextarea.val(css);
			updatePreview(html, css);
		} catch (err) {
			errorBox.find('.error-message').text('Error processing snippet: ' + (err && err.message ? err.message : err));
			errorBox.addClass('active');
			updatePreview('', '');
		} finally {
			loader.removeClass('processing');
		}
	}
})();
