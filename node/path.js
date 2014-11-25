/**
 * Created by jiehua.yang on 2014/9/23.
 */

define(function(require, exports, module) {

	/**
	 * 这是nodejs内置的path的浏览器版本
	 */

	/**
	 * 获取路径的扩展名
	 * @param path
	 */
	exports.extname = function(path) {
		var index = path.lastIndexOf(".");
		if (index > -1) {
			return path.substr(index);
		}
		return "";
	};

	/**
	 * 将 to 参数解析为一个绝对路径。
	 */
	exports.resolve = function(to) {
		// 逐步解析每个路径
		var paths = [];
		for (var i = 0, il = arguments.length; i < il; i++) {
			var items = arguments[i].split("/");
			if (paths.length == 0) {
				paths = items;
			} else {
				items.forEach(function(item, index) {

					switch (item) {
						case "..":
							paths.pop();
							break;
						case "":
							break;
						default:
							paths.push(item);
					}
				});
			}
		}
		return paths.join("/");
	};

});