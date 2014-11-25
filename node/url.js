/**
 * Created by jiehua.yang on 2014/9/23.
 */

define(function(require, exports, module) {

	/**
	 * 这是nodejs内置url模块的浏览器版本
	 */

	/**
	 * 解析url，获取其中的构成信息
	 * @param url
	 * @param isParseQuery
	 * @returns {{pathname: (*|pathname|string), query: {}}}
	 */
	exports.parse = function(url, isParseQuery) {
		var pathname = url;
		var query = "";
		var searchIndex = url.indexOf("?");
		if (searchIndex != -1) {
			pathname = url.substr(0, searchIndex);
			query = url.substr(searchIndex + 1);
		}

		// 获得query
		if (isParseQuery) {
			// 需要把query解析为对象
			var search = query;
			query = {};

			if (search.length > 0) {
				search.split("&").forEach(function(item) {
					item = item.split("=");
					if (typeof item[0] == "string" && item[0].length > 0) {
						// FIXME 这里需要考虑key重名的情况
						query[item[0]] = item[1];
					}
				});
			}
		}

		return {
			pathname: pathname,
			query: query
		};
	};

});