(function () {
	"use strict";

	// https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/web_tests/external/wpt/css/cssom/cssom-getPropertyValue-common-checks.html;drc=49996c02d4a54ec79343ddbcbfd563306c34483c
	const element = document.createElement('div');
	const { style } = element;
	const computedStyle = getComputedStyle(element);
	const cssProperties = new Set();
	const cssShorthands = new Map();
	const cssShorthandsForLonghand = new Map();
	const cssLonghands = new Set();
	const cssAliases = new Map();
	const initialValues = new Map();
	for (let obj = style; obj; obj = Reflect.getPrototypeOf(obj)) {
    for (let name of Object.getOwnPropertyNames(obj)) {
      const property = name.replace(/[A-Z]/g, c => "-" + c.toLowerCase());
      if (CSS.supports(property, "initial")) {
        cssProperties.add(property);
      }
    }
  }
  for (let property of cssProperties) {
    style.cssText = "";
    style.setProperty(property, "initial");
    if (style.length > 1) {
      cssShorthands.set(property, [...style]);
      for (let longhand of style) {
        if (cssShorthandsForLonghand.has(longhand)) {
          cssShorthandsForLonghand.get(longhand).add(property);
        } else {
          cssShorthandsForLonghand.set(longhand, new Set([property]));
        }
      }
    } else if (style.length === 1) {
      if (property === style[0]) {
        cssLonghands.add(property);
      } else {
        cssAliases.set(property, style[0]);
      }
    }
  }
	const data = {
		computedStyle,
		cssProperties,
		cssShorthands,
		cssShorthandsForLonghand,
		cssLonghands,
		cssAliases,
		initialValues
	};
	globalThis.xdata = data;
	console.log('initial', xdata);

	var lastSnapshot,

		cssStringifier = new CSSStringifier(),
		shorthandPropertyFilter = new ShorthandPropertyFilter(),
		webkitPropertiesFilter = new WebkitPropertiesFilter(),
		defaultValueFilter = new DefaultValueFilter(),
		sameRulesCombiner = new SameRulesCombiner(),
		inspectedContext = new InspectedContext(),

		loader = $('#loader'),
		createButton = $('#create'),

		codepenForm = $('#codepen-form'),
		jsfiddleForm = $('#jsfiddle-form'),
		jsbinForm = $('#jsbin-form'),

		propertiesCleanUpInput = $('#properties-clean-up'),
		removeDefaultValuesInput = $('#remove-default-values'),
		removeWebkitPropertiesInput = $('#remove-webkit-properties'),
		combineSameRulesInput = $('#combine-same-rules'),
		fixHTMLIndentationInput = $('#fix-html-indentation'),
		includeAncestors = $('#include-ancestors'),
		embedCSS = $('#embed-css'),
		idPrefix = $('#id-prefix'),

		htmlTextarea = $('#html'),
		cssTextarea = $('#css'),

		errorBox = $('#error-box');

	restoreSettings();

	//SUBMITTING THE CODE TO CodePen/jsFiddle/jsBin

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

	//Event listeners

	propertiesCleanUpInput.on('change', persistSettingAndProcessSnapshot);
	removeDefaultValuesInput.on('change', persistSettingAndProcessSnapshot);
	removeWebkitPropertiesInput.on('change', persistSettingAndProcessSnapshot);
	fixHTMLIndentationInput.on('change', persistSettingAndProcessSnapshot);
	combineSameRulesInput.on('change', persistSettingAndProcessSnapshot);
	includeAncestors.on('change', persistSettingAndProcessSnapshot);

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
		var validator = /^[a-z][a-z0-9.\-_:]*$/i;

		return validator.test(prefix);
	}

	idPrefix.on('change', function () {
		var val = $(this).val(),
			parent = $(this).parent();

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

	//Settings - saving & restoring

	function restoreSettings() {
		// Since we can't access localStorage from here, we need to ask background page to handle the settings.
		// Communication with background page is based on sendMessage/onMessage.
		chrome.runtime.sendMessage({
			name: 'getSettings'
		}, function (settings) {
			for (var prop in settings) {
				var el = $("#" + prop);

				if (!el.length) {
					// Make sure we don't leak any settings when changing/removing id's.
					delete settings[prop];
					continue;
				}

				if (el.is('[type=checkbox]')) {
					//updating flat UI checkbox
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
		/*jshint validthis:true */

		console.assert(this.id);
		chrome.runtime.sendMessage({
			name: 'changeSetting',
			item: this.id,
			value: (this.type === 'checkbox') ? this.checked : this.value
		});
		processSnapshot();
	}

	//Making & processing snippets

	function makeSnapshot() {
		loader.addClass('creating');
		errorBox.removeClass('active');

		// sets to arrays.
		const xdataString = JSON.stringify(xdata,(_key, value) => ((value instanceof Set || value instanceof Map) ? Array.from(value) : value));

		inspectedContext.eval(`
			globalThis.xdata = ${xdataString};
			(${Snapshooter.toString()})($0)
		`, function (result) {
			try {
				lastSnapshot = JSON.parse(result);
			} catch (e) {
				errorBox.find('.error-message').text('DOM snapshot could not be created. Make sure that you have inspected some element.');
				errorBox.addClass('active');
			}

			processSnapshot();

			loader.removeClass('creating');
		});
	}

	function processSnapshot() {
		if (!lastSnapshot) {
			return;
		}

		var styles = lastSnapshot.css,
			html = lastSnapshot.html,
			prefix = "";

		if (includeAncestors.is(':checked')) {
			styles = lastSnapshot.ancestorCss.concat(styles);
			html = lastSnapshot.leadingAncestorHtml + html + lastSnapshot.trailingAncestorHtml;
		}

		loader.addClass('processing');

		if (removeDefaultValuesInput.is(':checked')) {
			styles = defaultValueFilter.process(styles);
		}

		if (propertiesCleanUpInput.is(':checked')) {
			styles = shorthandPropertyFilter.process(styles);
		}
		if (removeWebkitPropertiesInput.is(':checked')) {
			styles = webkitPropertiesFilter.process(styles);
		}
		if (combineSameRulesInput.is(':checked')) {
			styles = sameRulesCombiner.process(styles);
		}

		if (fixHTMLIndentationInput.is(':checked')) {
			html = $.htmlClean(html, {
				removeAttrs: ['class'],
				allowedAttributes: [
					['id'],
					['placeholder', ['input', 'textarea']],
					['disabled', ['input', 'textarea', 'select', 'option', 'button']],
					['value', ['input', 'button']],
					['readonly', ['input', 'textarea', 'option']],
					['label', ['option']],
					['selected', ['option']],
					['checked', ['input']]
				],
				format: true,
				replace: [],
				replaceStyles: [],
				allowComments: true
			});
		}

		styles = cssStringifier.process(styles);

		if (embedCSS.is(':checked')) {
			html = '<style type="text/css">\n' + styles + '</style>\n' + html;
			styles = '';
		}

		if (isValidPrefix(idPrefix.val())) {
			prefix = idPrefix.val();
		}

		//replacing prefix placeholder used in all IDs with actual prefix
		html = html.replace(/:snappysnippet_prefix:/g, prefix);
		styles = styles.replace(/:snappysnippet_prefix:/g, prefix);

		htmlTextarea.val(html);
		cssTextarea.val(styles);

		loader.removeClass('processing');
	}
})();
