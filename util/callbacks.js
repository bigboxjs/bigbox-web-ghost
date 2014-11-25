/**
 * Created by jiehua.yang on 2014/9/19.
 */

define(function(require, exports, module) {

	/**
	 * 回调类
	 * @param callback
	 * @constructor
	 */
	var Callbacks = function(callback) {
		this._callback = callback;
		this._callbacks = [];
	};

	/**
	 * 添加一个新的回调方法
	 * @param callback
	 * @returns {newCallback}
	 */
	Callbacks.prototype.add = function(callback) {
		var _this = this;
		var newCallback = function() {
			callback.apply(this, arguments);

			// 删除相应方法
			_this._callbacks.splice(_this._callbacks.indexOf(newCallback), 1);

			// 如果已经没有了要执行的回调，那就启动check任务
			if (_this._callbacks.length == 0) _this.check();
		};
		this._callbacks.push(newCallback);

		this.check();

		return newCallback;
	};

	/**
	 * 判断所有回调是否都已经触发
	 */
	Callbacks.prototype.check = function() {
		if (this._checkTimer) return;
		this._checkTimer = setTimeout((function() {
			if (this._callbacks.length == 0) {
				callback = this._callback;
				delete this._callback;
				callback();
			}
			this._checkTimer = null;
		}).bind(this), 0);
	};

	module.exports = function(callback) {
		return new Callbacks(callback);
	};

});