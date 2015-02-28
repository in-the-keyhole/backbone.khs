
var Backbone = require('../src/backbone.khs.js');
var Session = Backbone.Session.extend({ });

describe('Session Test', function () {

    var session;
    beforeEach(function() {
        session = new Session();
    });

    it('Check initial state', function () {
        expect(session.authenticate).toBeTruthy();
        expect(session.principal).toBeUndefined();
        expect(session.roles).toBeUndefined();
    });

    it('isAuthenticated function', function() {
        expect(session.isAuthenticated()).toBeFalsy();
    });

    it("authenticate", function() {
        session.authenticate("user", "pass");
        expect(session.isAuthenticated()).toBeTruthy();
    })

    it('invalidate function', function() {
        session.authenticate("user", "pass");
        session.roles = ['test'];
        session.invalidate()
        expect(session.isAuthenticated()).toBeFalsy();
        expect(session.roles).toBeUndefined();
        expect(session.principal).not.toBeUndefined();
    });

    it("isInRole function - no roles defined", function() {
        expect(session.isInRole('employee')).toBeFalsy();
    });

    it("addRole function", function() {
        session.addRoles('employee', 'manager');
        expect(session.roles.length).toEqual(2);
    });

    it("isInRole function - roles defined", function() {
        session.authenticate("user", "pass");
        session.addRoles('employee', 'manager');
        expect(session.isInRole('employee')).toBeTruthy();
        expect(session.isInRole('manager')).toBeTruthy();
        expect(session.isInRole('other')).toBeFalsy();
    });

});