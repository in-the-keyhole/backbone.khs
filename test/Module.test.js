
var _ = require('underscore');
var $ = require('jquery');

var Backbone = require('../src/backbone.khs.js');

describe('Module' , function() {

    var Module;
    beforeEach(function() {
        Module = Backbone.Module.extend({
            path: 'test',
            routes: {
                '': 'show',
                ':value': 'search'
            },

            show: function() { },

            search: function(value) { }
        });
    });

    afterEach(function() {
        // clean up the routes on for each test
        Backbone.history.handlers = [];
    });

    it('Initial state', function () {
        spyOn(Module.prototype, "_buildRoutes");
        var path = "myModule";
        var module = new Module({path:path});

        expect(module.path).toEqual(path)
        expect(Module.prototype._buildRoutes).toHaveBeenCalled();
    })

    it('validate route built', function() {
        var module = new Module();
        var showRoute = module.routes[''];
        var searchRoute = module.routes[':value'];

        expect(showRoute.key).toEqual('');
        expect(searchRoute.key).toEqual(':value');

        expect(showRoute.route).toEqual(jasmine.any(RegExp));
        expect(searchRoute.route).toEqual(jasmine.any(RegExp));

        expect(_.isFunction(showRoute.callback)).toBeTruthy();
        expect(_.isFunction(searchRoute.callback)).toBeTruthy();
    });

    it('start module', function() {
        var module = new Module();
        expect(Backbone.history.handlers.length).toEqual(0);
        module.start();
        expect(Backbone.history.handlers.length).toEqual(2);
    });

    it('call start twice. ', function() {
        var module = new Module();
        expect(Backbone.history.handlers.length).toEqual(0);
        module.start();
        module.start();
        expect(Backbone.history.handlers.length).toEqual(2);
    });

    it('stop module', function() {
        var module = new Module();
        module.start();
        expect(Backbone.history.handlers.length).toEqual(2);
        module.stop();
        expect(Backbone.history.handlers.length).toEqual(0);
    });

    it('check callback all all functions', function() {
        spyOn(Module.prototype, "_handleBeforeRoute").and.callThrough();
        spyOn(Module.prototype, "_handleAfterRoute").and.callThrough();
        spyOn(Module.prototype, "show").and.callThrough();
        var module = new Module(),
            route = module.routes[''];

        route.callback();

        expect(Module.prototype.show).toHaveBeenCalled();

        expect(Module.prototype._handleBeforeRoute).toHaveBeenCalled();
        expect(Module.prototype._handleAfterRoute).toHaveBeenCalled();

    });
});