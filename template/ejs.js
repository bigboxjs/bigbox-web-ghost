/**
 * Created by jiehua.yang on 2014/9/23.
 */

define(function(require, exports, module) {

	var EJS = require("./_ejs");

	/**
	 * 渲染结果
	 * @param template
	 * @param data
	 * @returns {string}
	 */
	exports.render = function(template, data) {
		// 浏览器端ejs无法解析<%- %>这样的形式，需要转化为<%= %>
		var text = template.replace(/\<%\-/mg, "<%=");

		return new EJS({
			text: text
		}).render(data);
	};

});