
var $ = require('jquery');
var Backbone = require('../src/backbone.khs.js');

describe('RegionManger Tests', function() {

    var region;
    var $root;
    beforeEach(function() {
        $root = $('<div>').attr('id', 'root');
        region = new Backbone.RegionManager({$el: $root})
    })

    it('Initial state of object', function() {
        expect(region.$el).not.toBeUndefined();
        expect(region.$el).toEqual($root);
    })

    it('show function - send view not rendered', function() {
        var View = Backbone.View.extend({
            className: "view",
            render: function() {
                return this.$el.append($('<h1>').append("test"));
            }
        });

        var view = new View();

        expect(view.isRendered()).toBeFalsy();
        expect($root.children().length).toEqual(0);
        region.show(view);

        expect(view.isRendered()).toBeTruthy();
        expect($root.children().length).toEqual(1);
        expect(region.$el.find('h1').length).toEqual(1);
    });

    it('show function - send view rendered', function() {
        spyOn(Backbone.RegionManager.prototype, 'remove');

        var View = Backbone.View.extend({
            className: "view",
            render: function() {
                return this.$el.append($('<h1>').append("test"));
            }
        });

        var view = new View();
        view.render();

        expect(view.isRendered()).toBeTruthy();
        expect($root.children().length).toEqual(0);

        region.show(view);

        expect($root.children().length).toEqual(1);
        expect(region.$el.find('h1').length).toEqual(1);
    })

    it('show function - make sure remove is called', function() {
        spyOn(region, 'remove');

        var View = Backbone.View.extend({
            className: "view",
            render: function() {
                return this.$el.append($('<h1>').append("test"));
            }
        });

        region.show(new View());

        expect(region.remove).toHaveBeenCalled();
    });

    it('remove function - detach view from root', function() {
        var View = Backbone.View.extend({
            className: "view",
            render: function() {
                return this.$el.append($('<h1>').append("test"));
            }
        });

        var view = new View();
        region.show(view);

        region.remove();

        expect(view.isRendered()).toBeTruthy();
        expect($root.children().length).toEqual(0);
        expect(region.$el.find('h1').length).toEqual(0);
    });
});