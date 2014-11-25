/**
 * Created by jiehua.yang on 2014/9/23.
 */

define(function(require, exports, module) {

	var Handlebars = require("./_handlebars");

	/**
	 * 渲染结果
	 * @param template
	 * @param data
	 * @returns {string}
	 */
	exports.render = function(template, data) {
		return Handlebars.compile(template)(data);
	};

});