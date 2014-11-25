/**
 * Created by jiehua.yang on 2014/9/23.
 */

define(function(require, exports, module) {

	/**
	 * 这是nodejs内置的path的浏览器版本
	 */

	/**
	 * 把一个map对象转化为querystring
	 * @param path
	 */
	exports.stringify = function(object) {
		var str = [];
		for (var name in object) {
			str.push(name + "=" + object[name]);
		}
		return str.join("&");
	};

	/**
	 * 把一个querystring转化为map对象
	 * @param string
	 */
	exports.parse = function(querystring) {
		var object = {};
		querystring.split("&").forEach(function(item) {
			item = item.split("=");
			object[item.shift()] = item.join("=");
		});
		return object;
	};

});