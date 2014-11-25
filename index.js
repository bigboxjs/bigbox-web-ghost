/**
 * Created by jiehua.yang on 2014/8/28.
 */

define(function(require, exports, module) {

	var Router = require("./router");
	var App = require("./app");

	/**
	 * router暂时是单例对象
	 * @type {{}}
	 */
	var routerInstance = null;

	/**
	 * 获取一个router
	 * @param config
	 * @returns {router}
	 * @constructor
	 */
	exports.Router = function(config) {
		if (routerInstance) return routerInstance;

		routerInstance = new Router(config);
		return routerInstance.router.bind(routerInstance);
	};

	/**
	 * router暂时是单例对象
	 * @type {{}}
	 */
	var appInstance = null;

	/**
	 * 获取一个App处理器
	 * @returns {*}
	 * @constructor
	 */
	exports.App = function() {
		if (appInstance) return appInstance;

		return appInstance = new App();
	};

});