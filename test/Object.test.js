
var Backbone = require('../src/backbone.khs.js');

var Object = Backbone.Object.extend({ });

describe('Object Test', function () {

    it('Test initialize function is executed', function () {

        spyOn(Object.prototype, 'initialize');

        new Object();
        expect(Object.prototype.initialize).toHaveBeenCalled();
    });

    it('Check that options are copied in the constructor', function () {

        spyOn(Object.prototype, 'initialize');

        var options = {
            test:'test'
        };
        var object = new Object(options);

        expect(Object.prototype.initialize).toHaveBeenCalled();
        // check to make sure we have and exact copy
        expect(object.options).toEqual(options);
        // make sure we have a copy
        expect(object.options).not.toBe(options);
    });
    
});