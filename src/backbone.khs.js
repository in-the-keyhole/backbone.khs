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
var EmptyFn = function() {};


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
    this.initialize.apply(this, [this.options]);
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
    initialize: EmptyFn
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
		exports.Object.apply(this, arguments);
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

// Cached regular expressions for matching named param parts and splatted
// parts of route strings.
var optionalParam = /\((.*?)\)/g;
var namedParam    = /(\(\?)?:\w+/g;
var splatParam    = /\*\w+/g;
var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

/**
 * Controller to handel navigation flow for a module
 * @param {object} options - configurable options for the class.
 * @param {object} options.path - base path for routes
 * @extends Object
 * @abstract
 *
 * @example
 * var Module = Backbone.Module.extend({
 *      path: 'test',
 *      routes: {
 *          '': 'show',
 *          ':value': 'search'
 *      },
 *
 *      show: function() { },
 *
 *      search: function(value) { }
 * });
 */
exports.Module = exports.Object.extend({


    /**
     * @property {string} path - base path for routes
     * @private
     */
    path: undefined,

    /**
     * @property {object} routes -
     *
     * @example
     * routes: {
     *      '', 'show',
     *      ':value': 'search'
     * }
     */
    routes: undefined,

    constructor: function (options) {
        _.bindAll(this, 'start', 'stop', '_handleBeforeRoute', '_handleAfterRoute');
        options || (options = {});
        _.extend(this, _.pick(options, ['path']))
        this._buildRoutes.apply(this);
        exports.Object.apply(this, arguments);
    },

    /**
     *
     */
    start: function() {
        this._registerRoutes();
    },

    /**
     *
     */
    stop: function() {
        this._deregisterRoutes();
    },

    /**
     * function to register route with Backbone.history
     * @private
     */
    _registerRoutes: function() {
        exports.history.handlers = _.uniq(_.union(exports.history.handlers, _.values(this.routes)));
    },

    /**
     * function to remove route from Backbone.history
     * @private
     */
    _deregisterRoutes: function() {
        exports.history.handlers = _.difference(exports.history.handlers, _.values(this.routes));
    },

    /**
     * * @throws function not found
     */
    _buildRoutes: function() {
        var _this = this,
            beforeRoute = this._handleBeforeRoute,
            afterRoute = this._handleAfterRoute;

        _.each(this.routes, function(value, key) {
            var callback = this[value],
                route = {};

            if(!_.isFunction(callback)) {
                throw "route function `" + value + "` not found";
            }

            var wrapper = _.wrap(callback, function() {
                beforeRoute(route);
                // make sure we call in the correct scope
                callback.call(_this);
                afterRoute(route);
            });

            route.key = key;
            route.route = this._routeToRegExp(key);
            route.callback = wrapper;

            this.routes[key] = route
        }, this);
    },


    /**
     * @see Backbone.Router._routeToRegExp
     * @param route
     * @return {RegExp}
     * @private
     */
    _routeToRegExp: function(route) {
        (route.length > 0)? route = this.path + "/" + route : route = this.path;
        route = route.replace(escapeRegExp, '\\$&')
            .replace(optionalParam, '(?:$1)?')
            .replace(namedParam, function(match, optional) {
                return optional ? match : '([^/?]+)';
            })
            .replace(splatParam, '([^?]*?)');
        return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
    },

    /**
     * function to handle the
     * @param {string} fragment - the path for the route
     * @param {object} route - router object
     * @param {string} route.key -
     * @param {RegExp} route.route -
     * @param {function} route.callback -
     * @param {object} callback - function for callback with the scope of this
     * @private
     */
    _handleBeforeRoute: EmptyFn,

    /**
     * function to handle the
     * @param {string} fragment - the path for the route
     * @param {object} route - router object
     * @param {string} route.key -
     * @param {RegExp} route.route -
     * @param {function} route.callback -
     * @param {object} callback - function for callback with the scope of this
     * @private
     */
    _handleAfterRoute: EmptyFn

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