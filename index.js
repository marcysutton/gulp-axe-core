'use strict';
var gutil = require('gulp-util');
var through = require('through2');
var fileUrl = require('file-url');
var fs = require('fs-extra');
var AxeBuilder = require('axe-webdriverjs');
var WebDriver = require('selenium-webdriver');
var Promise = require('promise');
var reporter = require('./lib/reporter');
var PLUGIN_NAME = 'gulp-axe-core';

var promise;
var promises = [];
var url = '';
var result;

module.exports = function (customOptions) {

	var createResults = function(cb) {
		Promise.all(promises).then(function(results) {
			if(options.saveOutputIn !== '') {
				fs.writeFileSync(options.saveOutputIn, JSON.stringify(results, null, '  '), { encoding: 'utf8' });
			}
			result = reporter(results, options.threshold);
			driver.quit().then(function() {
				cb(result);
			});
		});
	};

	var defaultOptions = {
		browser: 'firefox',
		server: null,
		saveOutputIn: '',
		threshold: 0
	};

	var options = customOptions ? Object.assign(defaultOptions, customOptions) : defaultOptions;
	var driver = new WebDriver.Builder().forBrowser(options.browser).build();

	var bufferContents = function (file, enc, cb) {
		
		if (file.isNull()) {
			cb(null, file);
			return;
		}
		if (file.isStream()) {
			cb(new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'));
			return;
		}

		try {

			url = fileUrl(file.path);

			promise = new Promise(function(resolve, reject) {
					driver.get(url).then(function() {
						var startTimestamp = new Date().getTime();
						new AxeBuilder(driver)
							.analyze(function(results) {
								results.url = file.path;
								results.timestamp = new Date().getTime();
								results.time = results.timestamp - startTimestamp;
								resolve(results);
							});
					});
			});

			promises.push(promise);

		} catch (err) {
			this.emit('error', new gutil.PluginError(PLUGIN_NAME, err));
		}

		cb();

	};
	return through.obj(bufferContents, createResults);
};
