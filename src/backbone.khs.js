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
var Stickit = require("backbone.stickit");
var EmptyFn = _.noop;


// https://github.com/webpack/webpack/issues/34#issuecomment-50829464
Backbone.$ = $;

// Make sure we have a copy of Backbone to access
exports.Backbone = Backbone;

// make sure we pick the best match for the url not the first match
Backbone.History.prototype.loadUrl = function (fragment) {
    var bestHandler = undefined;

    fragment = this.fragment = this.getFragment(fragment);
    // TODO: MD change to standard for loop
    _.each(this.handlers, function (handler) {
        if (handler.route.test(fragment)) {
            if (!bestHandler || (bestHandler.score > handler.score)) {
                bestHandler = handler;
            }
        }
    });

    if (bestHandler) {
        bestHandler.callback(fragment);
        return true;
    }
    return false;
};

// Set up the DOM manipulator
exports.$ = exports.Backbone.$;

// Short cut for the history object
var history = exports.Backbone.history;
exports.history = history;

// Borrow this Backbone `extend` method so we cn use it as needed
exports.extend = Backbone.Model.extend;

/**
 * A Base Class that other Classes should descend from.
 * Object borrows many conventions and utilities from Backbone.
 * @param {object} options
 * @mixes Backbone.Model.extend
 * @constructor
 */
var Object = function (options) {
    // make sure we have a valid object to pass to the initialize function
    this.options = _.extend({}, _.result(this, 'options'), options);
    this.initialize.apply(this, [this.options]);
};

// Add the backbone extend function to the Object
Object.extend = exports.extend;

// Add the initialize function.
_.extend(Object.prototype, {
    /**
     * Abstract function for objects. This will be called on the creation of the class.
     * @param {object} options - object passed into the construction of the object
     * @abstract
     */
    initialize: EmptyFn
});

exports.Object = Object;

/**
 * A cache object to hold and notify of changes
 * @extends Object
 * @mixes Bootstrap.Radio.Command
 */
var Cache = Object.extend({

    /**
     * @property {object} store the objects
     * @private
     */
    store: undefined,

    constructor: function (options) {
        options || (options = {});
        _.bindAll(this, 'has', 'put', 'get', 'remove');
        this.channelName || (this.channelName = _.uniqueId('channel'));
        this.store = {};
        Object.apply(this, arguments);
    },

    /**
     *
     * Check to see if this key exist
     *
     * @param key
     * @return {boolean}
     */
    has: function (key) {
        return !!this.get(key);
    },

    /**
     * add new object to the cache store
     *
     * @param key {string} - ref key for the store
     * @param object {object} - object to be added to cache
     * @param options {object} - config options for cache
     * @param options.expire {Number} - invokes remove after wait milliseconds
     * @param options.expire {string} - invokes remove after event is called on cache
     */
    put: function (key, object, options) {
        var expire = _.result(options, 'expire', 0)
        // make sure we don't have a matching key
        this.remove(key);
        // add new object to the store
        this.store[key] = {
            object: object,
            expired: false, // not sure if this is needed
            expire: expire,
            destroy: this._buildExpireFunction(key, object, expire)
        };
        this.trigger('cache:' + key + ':put', object);
    },

    /**
     * get the object from the cache store
     *
     * @param key {string}
     * @return {*}
     */
    get: function (key) {
        var cache = _.result(this.store, key);
        if (cache) {
            if (cache.expired) {
                this.remove(key);
            } else {
                return cache.object;
            }
        }
        return undefined;
    },

    /**
     * removes the object from the cache store
     *
     * @param key {string}
     */
    remove: function (key) {
        var cache = _.result(this.store, key);
        if (cache) {
            // make sure we remove any timer
            delete this.store[key];
            this.trigger('cache:' + key + ':remove');
        }
    },

    /**
     *
     * @param key
     * @param object
     * @param expire
     *
     * @returns {Function}
     *
     * @private
     */
    _buildExpireFunction: function (key, object, expire) {
        var func = _.bind(function (key, object, expire) {
            // make sure we have the same instance that we started with.
            // if not do not remove this key. This is to catch case where we
            // expire a key and the delay function is still active
            if (object === this.get(key)) {
                this.remove(key);
            }
        }, this, key, object, expire);

        if (_.isNumber(expire) && expire > 0) {
            var delay = _.delay(func, expire);
            return _.partial(clearTimeout, delay);
        } else if (_.isString(expire) && !_.isEmpty(expire)) {
            this.on(expire, func);
            return _.bind(this.off, this, expire, func);
        }
        return _.noop();
    }
});

_.extend(Cache.prototype, Backbone.Events);
_.extend(Cache.prototype, Radio.Commands);

exports.Cache = Cache;
exports.cache = new Cache();
/**
 * An abstract class to give some basic structure around the session.
 * @param {object} options - configurable options for the class.
 * @extends Object
 * @mixes Bootstrap.Radio.Command
 * @abstract
 */
var Session = Object.extend({

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
    invalidate: function () {
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
    addRoles: function (role) {
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

_.extend(Session.prototype, Radio.Commands);
exports.Session = Session;

/**
 * Internal helper class to help manage regions.
 * @param {object} options - configurable options for the class.
 * @param {object} options.$el - jquery selected dom element
 * @extends Object
 * @constructor
 */
var RegionManager = Object.extend({
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
        Object.apply(this, arguments);
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
        this.view = view;
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

exports.RegionManager = RegionManager;

/**
 * Internal helper class to help manage regions.
 * @param {object} options - configurable options for the class.
 * @param {object} options.channelName - auto generated if unset
 * @extends Object
 * @constructor
 */
var Application = Object.extend({
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
        Object.apply(this, arguments);
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
        this.regions || (this.regions = {});
        object || (object = {});
        _.each(object, function (value, key) {
            this.regions[key] = new RegionManager({
                $el: $(document).find(value)
            })
        }, this);
    }
});

_.extend(Application.prototype, Radio.Commands);
_.extend(Application.prototype, Backbone.Events);
exports.Application = Application;

// Cached regular expressions for matching named param parts and splatted
// parts of route strings.
var optionalParam = /\((.*?)\)/g;
var namedParam = /(\(\?)?:\w+/g;
var splatParam = /\*\w+/g;
var escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;

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
var Module = Object.extend({


    /**
     * @property {string} path - base path for routes
     * @private
     */
    path: undefined,

    /**
     * @property {object} routes - backbone route paths
     *
     * @example
     * routes: {
     *      '', 'show',
     *      ':value': 'search'
     * }
     */
    routes: undefined,

    /**
     * @property {Module} modules - nested routes
     *
     * @example
     * modules: {
     *      ':account/persons': PersonModule
     * }
     */
    modules: undefined,

    /**
     * @property {RegionView} region - region to create in constructor
     */
    region: undefined,

    regionManager: undefined,

    constructor: function (options) {
        _.bindAll(this, 'start', 'stop', '_handleBeforeRoute', '_handleAfterRoute', '_handleBeforeStart');
        options || (options = {});
        // make sure we have new copy of this property since we overwrite the object
        this.routes = _.extend({}, _.result(this, 'routes'));
        this.modules = _.extend({}, _.result(this, 'modules'));
        _.extend(this, _.pick(options, ['path', 'region', 'regionManager']));
        this.region && _.isObject(this.region) && (this.region = new this.region()) && this.region.render();
        this._buildRoutes.apply(this);
        this._buildModules.apply(this);
        Object.apply(this, arguments);
    },


    _handleBeforeStart: function () {
        if (_.isFunction(this.beforeStart)) {
            return this.beforeStart.apply(this, arguments);
        }
    },

    beforeStart: _.noop,

    _handleAfterStart: function () {
        if (_.isFunction(this.afterStart)) {
            return this.afterStart.apply(this, arguments);
        }
    },

    afterStart: _.noop,

    _handleBeforeEnd: function () {
        if (_.isFunction(this.beforeEnd)) {
            return this.beforeEnd.apply(this, arguments);
        }
    },

    beforeEnd: _.noop,

    _handleAfterEnd: function () {
        if (_.isFunction(this.afterEnd)) {
            return this.afterEnd.apply(this, arguments);
        }
    },

    afterEnd: _.noop,

    /**
     *
     */
    start: function () {
        this._handleBeforeStart.apply(this, arguments);
        this._registerRoutes();
        this._registerModules();
        this._handleAfterStart.apply(this, arguments);
    },

    /**
     *
     */
    stop: function () {
        this._handleBeforeEnd.apply(this, arguments);
        this._deregisterRoutes();
        this._deregisterModules();
        this._handleAfterEnd.apply(this, arguments);
    },

    /**
     * function to start all modules routes
     * @private
     */
    _registerModules: function () {
        _.each(this.modules, function (value) {
            value.start.apply();
        });
    },

    /**
     * function to stop all modules routes
     * @private
     */
    _deregisterModules: function () {
        _.each(this.modules, function (value) {
            value.stop.apply();
        });
    },

    /**
     * function to register route with Backbone.history
     * @private
     */
    _registerRoutes: function () {
        history.handlers = _.uniq(_.union(history.handlers, _.values(this.routes)));
    },

    /**
     * function to remove route from Backbone.history
     * @private
     */
    _deregisterRoutes: function () {
        history.handlers = _.difference(history.handlers, _.values(this.routes));
    },

    /**
     * Function to build routes
     * @throws function not found
     * @private
     */
    _buildRoutes: function () {
        var _this = this;
        _.each(this.routes, function (value, key) {
            var callback = this[value],
                route = {},
                path;

            if (!_.isFunction(callback)) {
                throw "route function `" + value + "` not found";
            }

            var wrapper = _.wrap(callback, function (method) {
                var args = Array.prototype.slice.call(arguments, 1),
                    args2 = args.slice(0),
                    args3 = args2.toString().split('/').splice(1),
                    done = _.bind(function() {
                        method.apply(this, args3);
                        _this._handleAfterRoute.apply(this, args3);
                    }, _this);

                args.unshift(done);

                _this._handleBeforeRoute.apply(_this, args);

            });

            path = (key.length > 0) ? this.path + "/" + key : this.path;
            route.key = key;
            route.route = this._routeToRegExp(path);
            route.callback = wrapper;
            route.score = path.split(':').length - 1;

            this.routes[key] = route
        }, this);
    },

    /**
     * Function to build nested modules
     * @private
     */
    _buildModules: function () {
        _.each(this.modules, function (value, key) {
            var path, module, region,
                _this = this;

            (key.length > 0) ? path = this.path + "/" + key : path = this.path;
            path.substr(0, 1) == '/' ? path = path.substr(1) : path;

            if (typeof value === 'object') {
                region = window.Object.keys(value)[0];
                module = this.modules[key] = new value[region]({
                    path: path,
                    regionManager: this.region.regions[region]
                });
            } else {
                module = this.modules[key] = new value({path: path});
            }

            var command = _.wrap(module.command, function (method) {
                var args = Array.prototype.slice.call(arguments, 1),
                    scope = module;

                method.apply(scope, args);

                _this.command.apply(_this, args);
            });

            module.command = command;

            var before = _.wrap(module._handleBeforeRoute, function (method) {
                var args = Array.prototype.slice.call(arguments, 1),
                    scope = module,
                    args2 = args.slice(1),
                    done = _.bind(function() {
                        method.apply(scope, args);
                    }, _this);

                args2.unshift(done);
                _this._handleBeforeRoute.apply(_this, args2);
            });

            module._handleBeforeRoute = before;

            var after = _.wrap(module._handleAfterRoute, function (method) {
                var args = Array.prototype.slice.call(arguments, 1),
                    scope = module;

                _this._handleAfterRoute.apply(_this, args);
                method.apply(scope, args);

            });

            module._handleAfterRoute = after;

        }, this);
    },

    /**
     * @see Backbone.Router._routeToRegExp
     * @param route
     * @return {RegExp}
     * @private
     */
    _routeToRegExp: function (route) {
        route = route.replace(escapeRegExp, '\\$&')
            .replace(optionalParam, '(?:$1)?')
            .replace(namedParam, function (match, optional) {
                return optional ? match : '([^/?]+)';
            })
            .replace(splatParam, '([^?]*?)');
        return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
    },

    beforeRoute: undefined,

    /**
     * function to handle the the beforeRender. Also add region to RegionsManager
     *
     * @param {string} fragment - the path for the route
     * @param {object} route - router object
     * @param {string} route.key -
     * @param {RegExp} route.route -
     * @param {function} route.callback -
     * @param {object} callback - function for callback with the scope of this
     * @private
     */
    _handleBeforeRoute: function (done) {
        if (window.Object.getPrototypeOf(this).region && this.region && this.regionManager) {
            this.regionManager.show(this.region);
        }
        if (_.isFunction(this.beforeRoute)) {
            this.beforeRoute.apply(this, arguments);
            if(this.beforeRoute.length == 0) {
                done();
            }
        } else {
            done();
        }

    },

    afterRoute: undefined,

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
    _handleAfterRoute: function () {
        if (_.isFunction(this.afterRoute)) {
            return this.afterRoute.apply(this, arguments);
        }
    }

});

exports.Module = Module;
_.extend(Module.prototype, Radio.Commands);

/**
 * View Controller
 * @param {object} options - configurable options for the class.
 * @param {object} options.path - base path for routes
 * @extends Backbone.View
 * @abstract
 */
var View = Backbone.View.extend({

    /**
     * @property {string} channelName - name of the channel of Backbone.Radio
     * @private
     */
    channelName: undefined,

    /**
     * doc: http://nytimes.github.io/backbone.stickit/
     * @property {object} bindings - BackBone Sitckit property
     * @see Stickit
     */
    bindings: undefined,

    constructor: function (options) {
        _.bindAll(this, 'render', 'beforeRender', 'afterRender');
        var _this = this,
            render = this.render,
            before = this.beforeRender,
            after = this.afterRender;

        options || (options = {});
        _.extend(this, _.pick(options, ['channelName']));
        this.channelName || (this.channelName = _.uniqueId('channel'));

        this.render = _.wrap(render, function () {
            before();
            render.call(_this);
            after();
        });
        Backbone.View.apply(this, arguments);
    },

    /**
     * executed before render
     */
    beforeRender: EmptyFn,

    /**
     * executed after render
     */
    afterRender: EmptyFn,

    /**
     * executed during render. this is expected to be a function
     */
    template: EmptyFn,

    /**
     * Render the tempate
     * @return {View} - the current view
     */
    render: function () {
        this._renderTemplate();
        return this;
    },

    /**
     * check if the view is rendered.
     * @return {boolean}
     */
    isRendered: function () {
        return this.$el.children().length > 0;
    },

    /**
     * Method to render the view.
     * This method is use for internal use only
     *
     * @protected
     */
    _renderTemplate: function () {
        this.$el.empty();
        this.$el.append(this.template && this.template(this._getTemplateData()));
        this.model && this.bindings && this.stickit();
    },

    /**
     *
     * @return {object}
     * @protected
     */
    _getTemplateData: function () {
        var data = undefined;
        if (this.model) {
            if (this.model instanceof Model) {
                data = this.model.toJSON();
            } else {
                data = {};
                _.each(this.model, function (value, key) {
                    data[key] = value.toJSON();
                }, this);
            }
        }
        return data;
    }
});

_.extend(View.prototype, Radio.Commands);
exports.View = View;

var RegionView = View.extend({

    /**
     * @property {object}
     *
     * @example
     * this.addRegion({
     *     body: '#body'
     * });
     */
    regions: undefined,

    constructor: function (options) {
        _.bindAll(this, '_loadRegions');
        this.regions = _.extend({}, _.result(this, 'regions'));
        View.apply(this, arguments);
    },

    /**
     * Method to render the view.
     * This method is use for internal use only
     *
     * @see View._renderTemplate
     * @private
     */
    _renderTemplate: function () {
        // call parent
        View.prototype._renderTemplate.call(this);

        // auto build the regions
        this._loadRegions.call(this);
    },

    set: function (region, view) {
        if (this.regions) {
            this.regions[region].show(view);
        }
    },

    /**
     * Function for adding regions to the application
     * This will use this.$el for the base selector
     *
     * @private
     */
    _loadRegions: function () {
        // make sure we have an object
        this.regions || (this.regions = {});
        _.each(this.regions, function (value, key) {
            this.regions[key] = new RegionManager({
                $el: this.$(value)
            });
        }, this);
    },

    remove: function () {
        // clean up each region. make sure we remove each view
        _.each(this.regions, function (val) {
            val.view && val.view.remove();
        });
        View.prototype.remove.apply(this, arguments);
    }
});

exports.RegionView = RegionView;

exports.CollectionView = exports.View.extend({

    /**
     * @property {Collection}
     */
    collection: undefined,

    /**
     * @property {ItemView}
     */
    childView: undefined,

    /**
     * @property {string}
     */
    childSelector: undefined,

    /**
     * @private
     */
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
    _renderTemplate: function () {
        if (!this.collection) {
            throw "CollectionView requires a collection to be defined."
        }

        this.destroyChildren();

        // call parent
        exports.View.prototype._renderTemplate.apply(this);

        // set the child selector to jquery object
        this.childSelector = (window.Object.getPrototypeOf(this).childSelector ? this.$(window.Object.getPrototypeOf(this).childSelector) : this.$el);

        this.collection.each(function (model, index) {
            this.addChild(model, this.getChildView(), index);
        }, this);
    },

    destroyChildren: function () {
        if (this.children.length > 0) {
            this.childSelector.empty();
        }
        this.children = [];
    },

    /**
     *  Getter method to get the child view.
     *
     * @returns {ItemView}
     */
    getChildView: function () {
        return this.childView;
    },

    addChild: function (model, View, index) {
        var view = new View({model: model});
        view._parent = this;

        this.children[index] = view;

        view.render();
        this.childSelector.append(view.$el);
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
});

exports.CollectionItemView = exports.View.extend({});

var Model = exports.Backbone.Model.extend({});
exports.Model = Model;

exports.Collection = exports.Backbone.Collection.extend({});
