
var Backbone = require('../src/backbone.khs.js');

var Cache = Backbone.Cache;

describe('Object Test', function () {

    it('Test initialize function is executed', function () {
        spyOn(Cache.prototype, 'initialize');

        new Cache();
        expect(Cache.prototype.initialize).toHaveBeenCalled();
    });

    it('Add basic item to cache. never expire', function () {

        var cache = new Cache();
        cache.put('test', {test:'test'});

        expect(cache.store['test']).toBeDefined();
    });

    it('Add basic item to cache. expire after a set time', function () {

        spyOn(Cache.prototype, 'remove').andCallFake(function() {
            done();
        });

        var cache = new Cache();
        console.log(cache);
        cache.put('test', {test:'test'}, {expire: 1000});

        expect(cache.store['test']).toBeDefined();
    });

});