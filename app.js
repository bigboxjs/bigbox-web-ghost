/**
 * Created by jiehua.yang on 2014/11/20.
 */

define(function(require, exports, module) {

	var App = function () {
		this._processors = [];
	};

	/**
	 * 接受到请求后的处理方法。如果能直接返回结果，那就返回true。如果不能直接返回结果，那就返回false
	 * @param info
	 */
	App.prototype.onRequest = function (info) {
		var req = {
			originalUrl: info.url,
			query: info.data
		};
		var res = {
			json: info.callback
		};
		var processors = this._processors;
		for (var i = 0, il = processors.length; i < il; i++) {
			var need2Next = false;
			var processor = processors[i];
			processor(req, res, function () {
				need2Next = true;
			});
			if (!need2Next) return true;
		}
		return false;
	};

	/**
	 * 增加一个处理器
	 * @param processor
	 */
	App.prototype.use = function (processor) {
		this._processors.push(processor);
	};

	module.exports = App;

});