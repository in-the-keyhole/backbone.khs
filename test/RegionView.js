
var _ = require('underscore');
var $ = require('jquery');

var Backbone = require('../src/backbone.khs.js');

describe('RegionView test', function() {

    var Region;
    var html = '<div><div id="root"></div></div>';
    var template = _.template(html);
    beforeEach(function() {

        Region = Backbone.RegionView.extend({
            template: template,
            regions: {
                root: '#root'
            }
        });
    });

    it('Initial ', function() {
        spyOn(Region.prototype, '_loadRegions').and.callThrough();
        var region = new Region();

        expect(region.regions.root).toBeDefined();
        expect(Region.prototype._loadRegions).toHaveBeenCalled();
    });

});