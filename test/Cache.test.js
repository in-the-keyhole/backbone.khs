
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
    	jasmine.clock().install();
        spyOn(Cache.prototype, 'remove').and.callThrough();

        var cache = new Cache();
        cache.put('test', {test:'test'}, {expire: 1000});
        
        expect(cache.store['test']).toBeDefined();
        expect(Cache.prototype.remove).toHaveBeenCalled();
        expect(Cache.prototype.remove.calls.count()).toEqual(1);
        
        //After 1 second, remove() should be called twice
        //once in Put(), the other after the expiration of 1 second
        setTimeout(function() {
       	 expect(Cache.prototype.remove.calls.count()).toEqual(2);
       	 expect(cache.store['test']).not.toBeDefined();
       }, 1000);
        jasmine.clock().tick(1001);
      
        jasmine.clock().uninstall();
    });

});