/**
 * Created by jiehua.yang on 2014/11/20.
 */
define(function(require, exports, module) {

	/**
	 * 解析当前页面的所有cookie
	 * @returns {{}}
	 */
	function parseCookies() {
		var cookies = {};
		document.cookie.split("; ").forEach(function(item) {
			item = item.split('=');
			cookies[item[0]] = item.length > 1 ? item[1] : "";
		});
		return cookies;
	}

	module.exports = function() {
		return function(req, res, next) {
			req.cookies = parseCookies();
			next();
		};
	};

});