
var _ = require('underscore');
var $ = require('jquery');

var Backbone = require('../src/backbone.khs.js');
var Application = Backbone.Application.extend({ });

describe('Application Tests', function() {

    var application;

    beforeEach(function() {
        application = new Application();
    });

    it('check initial state', function() {
        expect(application.channelName).toBeDefined();
        expect(application.regions).toBeUndefined();
    });

    it('addRegions function - undefined value', function() {
        application.addRegions(undefined);

        expect(application.regions).toBeDefined();
        expect(_.isEmpty(application.regions)).toBeTruthy();
    });

    it('addRegions function - ', function() {
        $('body').append($('<div>').attr('id', 'root'));

        application.addRegions({
            root: '#root'
        });

        expect(application.regions.root).toBeDefined();
    });

})