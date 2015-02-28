
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
});