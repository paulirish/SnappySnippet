module.exports = function (grunt) {
	"use strict";

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		jshint: {
			files: ['Gruntfile.js', 'js/**/*.js', 'src/**/*.js'],
			options: {
				evil: true,
				camelcase: true,
				curly: true,
				eqeqeq: true,
				noempty: true,
				strict: true,
				loopfunc: true,
				esversion: 11,
				globals: {
					jQuery: true,
					console: true,
					document: true
				}
			}
		},
		csslint: {
			src: ['css/*.css'],
			options: {
				ids: false,
				'compatible-vendor-prefixes': false,
				'fallback-colors': false
			}
		},
		htmllint: {
			options: {
			},
			src: '*.html'
		},
		zip: {
			'snappysnippet-<%= pkg.version %>.zip': ['css/**/*', 'gfx/*.png', 'js/**/*', 'dist/**/*', '*.html', 'manifest.json']
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-csslint');
	grunt.loadNpmTasks('grunt-html');
	grunt.loadNpmTasks('grunt-zip');

	grunt.registerTask('default', ['jshint', 'csslint', 'htmllint']);
	grunt.registerTask('prod', ['zip']);
};
