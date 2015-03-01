
var _ = require('underscore');
var $ = require('jquery');
var Backbone = require('../src/backbone.khs.js');

describe('View Tests', function() {

    var html = '<h1><%= last %>, <%= last %></h1>';
    var template = _.template(html);

    var Model = Backbone.Model.extend({
        defaults: {
            first: '',
            last: ''
        }
    });

    var View = Backbone.View.extend({
        template: template
    });

    beforeEach(function() {

    });

    it('validate before and after render function', function() {
        spyOn(View.prototype, 'beforeRender');
        spyOn(View.prototype, 'afterRender');

        var model = new Model({first: 'John', last: 'Doe'});
        var view = new View({model: model}).render();

        expect(View.prototype.beforeRender).toHaveBeenCalled();
        expect(View.prototype.afterRender).toHaveBeenCalled()
    });

    it('validate render function', function() {
        var model = new Model({first: 'John', last: 'Doe'});
        var view = new View({model: model});

        expect(view.$el.children().length).toEqual(0);
        expect(view.isRendered()).toBeFalsy();
        view.render();
        expect(view.$el.children().length).toEqual(1);
        expect(view.isRendered()).toBeTruthy();
    });
});