/**
 * Created by jiehua.yang on 2014/11/22.
 */

define(function(require, exports, module) {

	/**
	 * 实现继承。代码来源：https://github.com/matchdav/inherits
	 */
	exports.inherits = (typeof Object.create === 'function') ? function inherits(child, parent) {
		//use node's util.inherits method for ECMA5 compliant browsers
		child.super_ = parent;
		child.prototype = Object.create(parent.prototype, {
			constructor: {
				value: child,
				enumerable: false,
				writable: true,
				configurable: true
			}
		});
	} : function inherits(child, parent) {
		//otherwise, shim for older browsers (IE7, IE8 , FF3, etc)
		child.super_ = parent;
		function Temp(){};
		Temp.prototype = parent.prototype;
		child.prototype = new Temp();
		child.prototype.constructor = child;
	};

});