'use strict';

/**
 * @file Backbone extension
 * @version 1.0.0
 * @author Mark Determan <mdeterman@keyholesoftware.com>
 * @module in-the-keyhole/backbone.khs
 * @licence MIT
 * @copyright Keyhole Software, LLC.
 */

var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var Radio = require('backbone.radio');

// https://github.com/webpack/webpack/issues/34#issuecomment-50829464
Backbone.$ = $;

// Make sure we have a copy of Backbone to access
exports.Backbone = Backbone;

// Set up the DOM manipulator
exports.$ = exports.Backbone.$;

// Short cut for the history object
exports.history = exports.Backbone.history;

// Borrow this Backbone `extend` method so we cn use it as needed
exports.extend = Backbone.Model.extend;

/**
 * A Base Class that other Classes should descend from.
 * Object borrows many conventions and utilities from Backbone.
 * @param {object} options
 * @mixes Backbone.Model.extend
 * @constructor
 */
exports.Object = function (options) {
    // make sure we have a valid object to pass to the initialize function
    this.options = _.extend({}, _.result(this, 'options'), options);
    this.initialize.apply(this, this.options);
};

// Add the backbone extend function to the Object
exports.Object.extend = exports.extend;

// Add the initialize function.
_.extend(exports.Object.prototype, {
    /**
     * Abstract function for objects. This will be called on the creation of the class.
     * @param {object} options - object passed into the construction of the object
     * @abstract 
     */
    initialize: function(options) { }
});

/**
 * An abstract class to give some basic structure around the session.
 * @param {object} options - configurable options for the class.
 * @extends Object
 * @mixes Bootstrap.Radio.Command
 * @abstract
 */
exports.Session = exports.Object.extend({
    
    /**
     * Track the state of the session
     * @property {boolean} authenticated
     * @private 
     */
    authenticated: false,

    /**
     * A place to keep the username
     * @property {string} principal
     * @private 
     */
    principal: undefined,

    /**
     * Array of roles name
     * @property {string[]} roles
     * @private
     */
    roles: undefined,

    /**
     * Function to fetch the state of the session 
     * @returns {boolean}
     */
    isAuthenticated: function () {
        return this.authenticated;
    },

    /**
     * Invalidates the current session
     * @fires authentication:invalidated
     * @abstract
     * 
     * @example
     *  invalidate: function() {
     *      var _this = this;  
     *      $.ajax({
     *          url: '/login',
     *          type: 'post'
     *      }).done(function(data) {
     *          Session.prototype.invalidate.apply(_this)
     *      });
     *  }
     */
    invalidate: function() {
        this.authenticated = false;
        this.roles = undefined;
        this.command('authentication:invalidated');
    },

    /**
     * Check to see if the the user has a role
     * @param {string} role - The role to validate
     * @returns {boolean}
     * @abstract 
     */
    isInRole: function (role) {
		var roles = this.roles || [];
		return _.indexOf(roles, role) !== -1;
    },

    /**
     * Add roles to the session.
     * @param {string} role - role for the user
     * @return {string[]} roles added
     */
    addRoles: function(role) {
        this.roles = _.union(this.roles || [], Array.prototype.slice.call(arguments));
    },

    /**
     * Abstract function to handel the authenticating the session.
     * @param {string} username
     * @param {string} password
     * @fire  authentication:success
     * @fires authentication:failed
     * @abstract 
     * 
     * @example
     *  authenticate: function(username, password) {
     *      var _this = this;  
     *      $.ajax({
     *          url: '/login',
     *          type: 'post'
     *      }).done(function(data) {
     *          _this.principal = username
     *          Session.prototype.authenticate.apply(_this)
     *      }).fail(function(){
     *          this.command('authentication:failed', username);
     *      });
     *  }
     */
    authenticate: function (username, password) {
        this.principal = username;
        this.authenticated = true;
        this.command('authentication:success', username);
    }

});
// include Backbone Radio Commands
_.extend(exports.Session.prototype, Radio.Commands);

/**
 * Internal helper class to help manage regions.
 * @param {object} options - configurable options for the class.
 * @param {object} options.$el - jquery selected dom element
 * @extends Object
 * @constructor
 */
exports.RegionManager = exports.Object.extend({
    /**
     * @property {object} jquery selected dom element 
     * @private 
     */
    $el: undefined,
    /**
     * @property {object} active view
     * @private 
     */
    view: undefined,

    constructor: function (options) {
        options || (options = {});
        _.bindAll(this, 'show', 'remove');
        _.extend(this, _.pick(options, ['$el']));
    },

    /**
     * show the view with the $el that was pasted during the creation
     * on the class. This will call a remove function to clean up the
	 * current $el. The view is added to the $el with jQuery.append.
     * @param {object} view - this expected to be a View object
     */
    show: function (view) {
        if (view && !view.isRendered()) {
            view.render();
        }
        this.remove();
        return this.$el.append(view && view.$el);
    },
    /**
     * clean up the view
	 * this remove the children by doing a jQuery.detach. 
	 * this is to prevet jQuery from removing the events
	 * form the object
     */
    remove: function () {
        return this.$el.children().detach();
    }
});

/**
 * Internal helper class to help manage regions.
 * @param {object} options - configurable options for the class.
 * @param {object} options.channelName - auto generated if unset
 * @extends Object
 * @constructor
 */
exports.Application = exports.Object.extend({
    /**
     * @property {string} channelName - name of the channel of Backbone.Radio
     * @private
     */
    channelName: undefined,
    /**
     * @property {object} regions - regions for the application.
     */
    regions: undefined,

    constructor: function (options) {
        _.bindAll(this, 'addRegions');
		_.extend(this, _.pick(options, ['channelName']));
        this.channelName || (this.channelName = _.uniqueId('channel'));
        exports.Object.apply(this, arguments);
    },

    /**
     * Function for adding regions to the application
	 * This will use jQuery(document) for the base selector
     * 
     * @param {object} object - definition of the regions  
     * 
     * @example
     * this.addRegion({
     *     body: '#body'
     * });
     * 
     * this.regions.body.show(view)
     */
    addRegions: function (object) {
        this.regions || (this.regions= {});
        object || (object = {});
        _.each(object, function (value, key) {
            this.regions[key] = new exports.RegionManager({
                $el: $(document).find(value)
            })
        }, this);
    }
});

// include Backbone Radio Commands
_.extend(exports.Application.prototype, Radio.Commands);

exports.Module = exports.Object.extend({
    path: undefined,
    view: undefined,

    constructor: function (options) {
        options || (options = {});
        _.extend(this, _.pick(options, ['path']));
        this._registerRoutes();
        exports.Object.apply(this, arguments);
    },
    //start: EmptyFn,
    
    //
    //stop: EmptyFn,
    //
    //suspend: EmptyFn,
    
    destroy: function() {
        this.view && this.view.remove() && (this.view = undefined);
        this._deregisterRoutes();
    },
    _routeToRegExp: function(fragment) {
        return Backbone.Router.prototype._routeToRegExp(this._buildPath(fragment))
    },
    _buildPath: function(fragment) {
        var path = this.path;
        if(fragment.length > 0) path += "/" + fragment;
        return path
    },

    _deregisterRoutes: function() {
        var handlers = exports.history.handlers.filter(function(n){ return n != undefined });
        _.each(this.routes, function(value, key) {
            var route =  this._routeToRegExp(key)
            var index = _.findIndex(handlers, function(obj) {
                if(obj.route.source === route.source) return true;
            }, this);
            if(index != -1) delete handlers[index];
        }, this);
        // need to clean up undefined in the array.
        exports.history.handlers = handlers.filter(function(n){ return n != undefined });
    },
    _registerRoutes: function() {
        var _this = this;
        _.each(this.routes, function(value, key) {
            // TODO: check if this is valid, if not throw an error
            var callback = this[value];
            if(callback) {
                callback = _.wrap(callback, function(func) {
                    console.log("before")
                    var args =  Array.prototype.slice.call(arguments);
                    args.shift();
                    func.apply(_this, args);
                    console.log("after")
                });
            } else {
                throw "function `" + value + '` is undefined.';
            }

            exports.history.handlers.push({
                route: this._routeToRegExp(key),
                callback: function(fragment) {
                    _this._handelRoute(fragment, this.route, callback)
                }
            });
        }, this);
    },

    _handelRoute: function(fragment, regx, callback) {
        var array = regx.exec(fragment);
        array.shift()
        callback.apply(this, array);
    }
});


exports.View = Backbone.View.extend({
    channelName: undefined,
    beforeRender: function() { },
    afterRender: function() {},
    template: function() {},
    constructor: function (options) {
        var _this = this;
        _.bindAll(this, 'render', 'beforeRender', 'afterRender');
        options || (options = {});
        _.extend(this, _.pick(options, ['channelName']));
        this.channelName || (this.channelName = _.uniqueId('channel'));
        Backbone.View.apply(this, arguments);

        this.render = _.wrap(this.render, function (render) {
            _this.beforeRender && this.beforeRender.apply(_this);
            render();
            _this.afterRender && this.afterRender.apply(_this);
            return _this;
        });

    },

    /**
     * Method to call to render the template.
     * Recommend to user the beforeRender and afterRender
     *
     * @returns {object} the $el from this object will be returned
     *
     * @example
     * render: function() {
         *    // do you stuff
         *
         *    // call parent
         *    return View.prototype.render.apply(this)
         * }
     */
    render: function () {
        this._renderTemplate();
        return this.$el;
    },

    isRendered: function () {
        return this.$el.html().length > 0;
    },

    /**
     * Method to render the view.
     * This method is use for internal use only
     *
     * @private
     */
    _renderTemplate: function () {
        this.$el.append(this.template && this.template((this.model && this.model.toJSON())));
        this.model && this.stickit();
    }
});

exports.RegionView = exports.View.extend({
    /**
     * @property {object}
     */
    regions: undefined,

    constructor: function (options) {
        _.bindAll(this, 'addRegions');
        exports.View.apply(this, arguments);
    },

    /**
     * Method to render the view.
     * This method is use for internal use only
     *
     * @see View
     * @private
     */
    _renderTemplate: function () {
        // call parent
        exports.View.prototype._renderTemplate.apply(this);

        // auto build the regions
        this.addRegions && this.addRegions.apply(this, [this.regions]);
    },

    addRegions: function (object) {
        // make sure we have an object
        this.regions || (this.regions = {})
        _.each(object, function (value, key) {
            this.regions[key] = new exports.RegionManager({
                $el: this.$(value)
            })
        }, this);
    }
});

exports.CollectionView = exports.View.extend({

    /**
     * @property {Collection}
     */
    collection: undefined,

    /**
     * @property {ItemView}
     */
    childView: undefined,

    children: undefined,

    /**
     * @see View.constructor()
     * @param options
     * @private
     */
    constructor: function (options) {
        this.children = [];
        options || (options = {});
        _.extend(this, _.pick(options, ['collection']));
        this.channelName || (this.channelName = _.uniqueId('channel'));
        this._initialEvents();
        exports.View.apply(this, arguments);
    },

    _initialEvents: function () {
        _(this).bindAll('_onCollectionAdd', '_onCollectionRemove', 'render');
        if (this.collection) {
            this.collection.bind('add', this._onCollectionAdd);
            this.collection.bind('remove', this._onCollectionRemove);
            this.collection.bind('reset', this.render);


            //if (this.sort) {
            //    this.listenTo(this.collection, 'sort', this._sortViews);
            //}
        }
    },

    _onCollectionAdd: function (model) {
        //this.destroyEmptyView();
        var ChildView = this.getChildView(model);
        var index = this.collection.indexOf(model);
        this.addChild(model, ChildView, index);
    },

    _onCollectionRemove: function () {
        debugger;

    },

    /**
     * Method to render the view.
     * This method is use for internal use only
     *
     * @see View
     * @private
     */
    _renderTemplate: function() {
        if(!this.collection) {
            throw "CollectionView requires a collection to be defined."
        }

        this.destroyChildren();

        // call parent
        exports.View.prototype._renderTemplate.apply(this);

        this.collection.each(function(model, index) {
            this.addChild(model, this.getChildView(), index);
        }, this);
    },

    destroyChildren: function() {
        this.children = [];
        this.$el.html('');
    },

    /**
     *  Getter method to get the child view.
     *
     * @returns {ItemView}
     */
    getChildView: function ( ) {
        return this.childView;
    },

    addChild: function(model, View, index) {
        var view = new View({model:model});
        view._parent = this;

        this.children[index] = view;

        view.render();
        this.$el.append(view.$el);
    }
});

exports.ItemView = exports.View.extend({

    /**
     * Method to render the view.
     * This method is use for internal use only
     *
     * @see View
     * @private
     */
    _renderTemplate: function () {
        if (!this.model) {
            throw "ItemView requires model before render."
        }

        // call parent
        exports.View.prototype._renderTemplate.apply(this);
    }
})

exports.CollectionItemView = exports.View.extend({});

_.extend(exports.View.prototype, Radio.Commands)

exports.Model = exports.Backbone.Model.extend({});

exports.Collection = exports.Backbone.Collection.extend({});