(function () {
	"use strict";

	// Capture CSS metadata in host/devtools panel window context
	const { cssProperties, cssShorthands } = SnappySnippet.getCssMetadata(window);
	const xdata = {
		cssProperties,
		cssShorthands,
		cssShorthandsForLonghand: new Map(),
		cssLonghands: new Set(),
		cssAliases: new Map(),
		initialValues: new Map()
	};

	var lastSnapshot,
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
		/*jshint validthis:true */

		console.assert(this.id);
		chrome.runtime.sendMessage({
			name: 'changeSetting',
			item: this.id,
			value: (this.type === 'checkbox') ? this.checked : this.value
		});
		processSnapshot();
	}

	// Making & processing snippets

	function makeSnapshot() {
		loader.addClass('creating');
		errorBox.removeClass('active');

		const xdataString = JSON.stringify(xdata, (_key, value) =>
			(value instanceof Set || value instanceof Map) ? Array.from(value) : value
		);

		var snapshooterCode = SnappySnippet.Snapshooter.toString();

		inspectedContext.eval(`
			globalThis.xdata = ${xdataString};
			(${snapshooterCode})($0, globalThis.xdata)
		`, function (result) {
			try {
				lastSnapshot = typeof result === 'string' ? JSON.parse(result) : result;
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

		loader.addClass('processing');

		var options = {
			propertiesCleanUp: propertiesCleanUpInput.is(':checked'),
			removeDefaultValues: removeDefaultValuesInput.is(':checked'),
			removeWebkitProperties: removeWebkitPropertiesInput.is(':checked'),
			combineSameRules: combineSameRulesInput.is(':checked'),
			fixHTMLIndentation: fixHTMLIndentationInput.is(':checked'),
			includeAncestors: includeAncestors.is(':checked'),
			embedCSS: embedCSS.is(':checked'),
			idPrefix: idPrefix.val(),
			xdata: xdata
		};

		var result = SnappySnippet.extractSnippet(lastSnapshot, options);

		htmlTextarea.val(result.html);
		cssTextarea.val(result.css);

		loader.removeClass('processing');
	}
})();
