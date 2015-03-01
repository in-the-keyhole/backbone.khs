'use strict';
// Karma configuration

module.exports = function (config) {
    config.set({

        // base path, that will be used to resolve files and exclude
        basePath: './',

        // include browserify first in used frameworks
        frameworks: [ 'browserify', 'jasmine' ],

        // list of files / patterns to load in the browser
        files: [
            'test/*.test.js'
        ],

        // list of files to exclude
        exclude: [ ],

        // test results reporter to use
        // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
        reporters: ['dots'],

        preprocessors: {
            // source files, that you wanna generate coverage for
            // do not include tests or libraries
            // (these files will be instrumented by Istanbul)
            'src/backbone.khs.js': ['coverage'],
            'test/*.test.js': [ 'browserify' ]
        },

        junitReporter: {
            outputFile: 'output/test-results.xml'
        },

        browserify: {
            debug: true
        },

        // possible values; 'html', 'lcov', 'lcovonly', 'text', 'text-summary', 'cobertura'
        coverageReporter: {
            type : 'cobertura',
            dir: 'output/'
        },

        // web server port
        port: 9876,

        // enable / disable colors in the output (reporters and logs)
        colors: true,

        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_ERROR,

        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,

        // Start these browsers, currently available:
        // - Chrome
        // - ChromeCanary
        // - Firefox
        // - Opera
        // - Safari (only Mac)
        // - PhantomJS
        // - IE (only Windows)
        browsers: ['PhantomJS'],

        // If browser does not capture in given timeout [ms], kill it
        captureTimeout: 60000,

        // Continuous Integration mode
        // if true, it capture browsers, run tests and exit
        singleRun: true
    });
};
