/**
 * Created by jiehua.yang on 2014/8/28.
 */

define(function(require, exports, module) {

	var PathUtil = require("./node/path");
	var UrlUtil = require("./node/url");
	var $require = require("./util/asyncrequire");
	var Callbacks = require("./util/callbacks");
	
	// TODO 这里获取模板引擎的代码应该做成按需加载，以及可配置的
	var template = {
		html: require("./html"),
		ejs: require("./ejs"),
		handlebars: require("./handlebars")
	};

	/**
	 * 路由控制类
	 * @param config
	 * @constructor
	 */
	var Router = function(config) {
		this._config = config;
	};

	/**
	 * 路由接口方法
	 * @param req
	 * @param res
	 * @param next
	 */
	Router.prototype.router = function(req, res, next) {
		var reqUri = req.originalUrl;
		if (reqUri.indexOf(this._config.api) == 0) {
			// 这是直接请求接口，到新的页面处理
			this.api(req, res, next);
			return;
		}
	};

	/**
	 * 这是直接请求接口
	 * @param req
	 * @param res
	 * @param next
	 */
	Router.prototype.api = function(req, res, next) {
		// 解析请求数据
		var uri = req.query.uri;
		var referBoxesID = JSON.parse(req.query.referBoxesID);
		var referBoxesLength = referBoxesID.length;

		// 根据uri获取boxes信息
		var params = UrlUtil.parse(uri, true).query;
		this.boxes(uri, params, (function(boxes) {
			var nowBoxesID = [];
			var diffBoxes = [];
			var sameIndex = 0;
			boxes.forEach(function(box, index) {
				nowBoxesID.push(box.boxID);

				// 如果相同则不做处理
				if (index < referBoxesLength && box.boxID == referBoxesID[index]) {
					sameIndex = index;
					return;
				}

				// 记录不相同的box
				diffBoxes.push(box);
			});

			// 找到两者之间的差别
			var data = this.join(diffBoxes, ++sameIndex);

			// 添加boxID信息
			data.boxesID = nowBoxesID;

			// 返回json格式的变量
			res.json(data);
		}).bind(this), {
			req: req,
			referBoxesID: referBoxesID
		});
	};

	/**
	 * 获得boxes请求信息
	 * @param uri
	 * @param params
	 */
	Router.prototype.boxes = function(uri, params, callback, options) {
		var req = options.req;
		var referBoxesID = options.referBoxesID || [];

		// 通过url获得box列表
		var paths = this.paths(uri);
		var pathname = UrlUtil.parse(uri).pathname;

		// 通过box列表获得controller列表
		this.controllers(paths, (function(controllers) {

			// FIXME 没找到对应的box信息的话，需要显示错误信息

			// 从上到下循环每一个box，根据传入
			var boxes = [];
			var callbacks = Callbacks(function() {
				callback(boxes);
			});
			controllers.forEach((function(controller, index) {
				var pathNow = paths[index];
				var callback = callbacks.add(function(box) {
					box.boxID = pathNow.pathname;
					if (typeof box.query == "string" && box.query.length > 0) {
						box.boxID += "?" + box.query;
						delete box.query;
					}
					boxes[index] = box;
				});

				var boxReq = {
					uri: uri,
					pathname: pathname,
					params: mergeObject(params, pathNow.query),
					cookies: req.cookies
				};

				// 如果存在之前的query信息，那就解析之
				// 这里还是有bug的，比如一个referBoxesID列表中，两头的有变化，但是中间的没有变化，这是中间的会出现问题
				if (index in referBoxesID) {
					boxReq.referQuery = parseBoxID(referBoxesID[index]).query;
				}

				var box = controller.deal(boxReq, this, callback);
				if (typeof box == 'object' && !!box) {
					callback(box);
				}
			}).bind(this));

			// FIXME box异常的情况需要考虑
		}).bind(this));
	};

	/**
	 * 解析boxid
	 * @param id
	 * @returns {{pathname: T, query: string}}
	 */
	function parseBoxID(id) {
		var ids = id.split("?");
		return {
			pathname: ids.shift(),
			query: ids.length == 0 ? "" : ids.join("?")
		};
	}

	/**
	 * 通过一个url获得其对应的path列表
	 * @param url
	 * @returns {Array}
	 */
	Router.prototype.paths = function(url) {
		var results = [];
		var config = this._config;

		/*// 如果没有把path预先转化为正则，那就转化之
		 var uriRegs = config.uriRegs;
		 if (!uriRegs) {
		 uriRegs = config.uriRegs = {};
		 var uris = config.uris;
		 for (var name in uris) {
		 uriRegs[name] = new RegExp(name);
		 }
		 }*/

		var uriCaches = config._uriCaches;
		if (!uriCaches) {
			uriCaches = config._uriCaches = {};
			var uris = config.uris;
			for (var name in uris) {
				if (name.charAt(0) == "^" || name.charAt(name.length - 1) == "$") {
					// 这是正则
					// FIXME 这个验证有些粗糙
					uriCaches[name] = match.bind(this, new RegExp(name));
				} else if (name.indexOf("}}") > name.indexOf("{{")) {
					// 这是变量形式

					// 获取变量信息
					// FIXME 这块可以优化，通过正则表达式解析
					var startStr = "{{";
					var startLen = startStr.length;
					var startIndex = -1;
					var endStr = "}}";
					var endLen = endStr.length;
					var endIndex = -1;
					var i = 0;
					var regStr = [];
					var names = [];
					while((startIndex = name.indexOf(startStr, i)) != -1) {
						if (startIndex > i) {
							regStr.push(name.substring(i, startIndex));
						}

						endIndex = name.indexOf(endStr, startIndex);
						i = endIndex + endLen;

						names.push(name.substring(startIndex + startLen, endIndex));
						regStr.push("([^/]+)");
					}
					if (i < name.length - 1) {
						regStr.push(name.substring(i));
					}

					regStr = regStr.join("");

					// 生成验证字符串
					uriCaches[name] = pathnameMatch.bind(this, new RegExp(regStr), names);
				} else {
					uriCaches[name] = isEqual2Me(name);
				}
			}
		}

		// 循环所有路径信息，找到匹配的规则
		var paths = config.paths;
		var ids;
		for (var name in uriCaches) {
			var isMatched = uriCaches[name](url);
			if (isMatched) {
				ids = config.uris[name];

				var isParams = typeof isMatched == 'object';
				ids.forEach(function(id, index) {
					// 把信息转化为路径信息
					if (typeof id != "object") {
						var obj = UrlUtil.parse(id, true);
						id = ids[index] = {
							pathname: obj.pathname,
							query: obj.query
						};
					}

					var result = cloneObject(id);

					// 如果存在参数信息，那就替换之
					if (isParams) {
						result.pathname = id.pathname.replace(/\{\{([^\}]+)\}\}/img, function(item) {
							return isMatched[item.substring(2, item.length - 2)];
						});

						// FIXME 如果原来的参数中就存在，那也需要替换之
					}

					result.pathname = paths[result.pathname];
					isParams && (result.query = isMatched);
					results.push(result);
				});
				break;
			}
		}

		return results;
	};

	/**
	 * 验证指定的字符串是否匹配
	 * @param reg
	 * @param string
	 * @returns {boolean}
	 */
	function match(reg, string) {
		return reg.test(string);
	}

	/**
	 * 针对pathname的验证器
	 * @param reg
	 * @param names
	 * @param string
	 * @returns {*}
	 */
	function pathnameMatch(reg, names, string) {
		var pathname = UrlUtil.parse(string).pathname;
		var results = reg.exec(pathname);
		if (!results) return false;

		var data = {};
		for (var i = 0, il = names.length; i < il; i++) {
			data[names[i]] = results[i + 1];
		}
		return data;
	}

	/**
	 * 通过path列表获得其对应的controller列表
	 * @param path
	 * @returns {Array}
	 */
	Router.prototype.controllers = function(paths, callback) {
		var controllers = [];

		var callbacks = Callbacks(function() {
			callback(controllers);
		});

		// 循环所有的box id，拿到
		var root = this._config.root;
		paths.forEach(function(path, index) {
			$require(root + path.pathname, callbacks.add(function(module) {
				controllers[index] = module;
			}));
		});

		return controllers;
	};

	/**
	 * 把结构化数据转化为html
	 * @param data
	 * @returns {String}
	 */
	Router.prototype.toHTML = function(data) {
		var title = data.content.head.title;
		return [
			'<!DOCTYPE html>',
			'<html>',
			'<head>',
			'<meta charset="UTF-8">',
			title ? ('<title>' + title + '</title>') : '',
			this.res2HTML(data.content.head.resources),
			'</head>',
			'<body>',
			data.content.body.content,
			this.res2HTML(data.content.body.resources),
			'</body>',
			'</html>'
		].join("");
	};

	/**
	 * 获得box得到一个返回内容的描述信息
	 * @param boxes
	 * @param [start] 从哪层开始
	 * @returns {{}}
	 */
	Router.prototype.join = function(boxes, start) {
		if (boxes.length == 0) return {};
		if (typeof start != "number") start = 0;
		var isWholePage = start == 0;
		var results = {
			headers: [],
			content: {
				head: {
					title: "",
					resources: []
				},
				body: {
					content: "",
					resources: []
				}
			}
		};
		var boxesID = [];

		// 循环每个box
		var head = results.content.head;
		var body = results.content.body;
		var headRes = head.resources;
		var bodyRes = body.resources;
		var prefix = [];
		var postfix = [];
		var content = [];
		boxes.forEach(function(box, index) {
			var boxID = box.boxID;
			boxesID.push(boxID);

			// 如果没有content，那就不进行对应的处理
			var boxContent = box.content;
			if (typeof boxContent != 'object' || !boxContent) return;

			// 收集head部分的信息
			var res = boxContent.head;
			if (res) {
				// 如果存在title的话，那就添加之
				if (typeof res.title == "string" && res.title.length > 0) {
					head.title = res.title;
				}

				// 把资源放到相应的位置
				if ((res = res.resources) instanceof Array && res.length > 0) {
					res.forEach(function(item) {
						// 如果是整个页面而且是最顶层的内容，则不需要给资源设置boxID，其他情况下都需要设置
						if (!(isWholePage && index == 0)) {
							item.boxID = boxID;
						}

						(item.type == "js" ? bodyRes : headRes).push(item);
					});
				}
			}

			// 收集body内容区域
			var boxBody = boxContent.body;
			if ("content" in boxBody) {
				// 这里只有内容
				content.push(boxBody.content);
			} else {
				// 这里存在容器
				prefix.push(boxBody.prefix, '<div id="BigboxCtr' + (start + index + 1) + '">');
				postfix.push(boxBody.postfix, '</div>');
			}
		});
		body.content = prefix.join("") + content.join("") + postfix.join("");

		// 如果是从头开始，那就需要写boxid信息
		if (start == 0) {
			bodyRes.unshift({
				type: "js",
				text: 'var boxesID = ' + JSON.stringify(boxesID) + ';'
			});
		}

		// 合并资源信息
		head.resources = this.joinResources(headRes, "head");
		body.resources = this.joinResources(bodyRes, "body");

		return results;
	};

	/**
	 * 混合资源
	 * @param resources {Array<Object|String>}
	 * @param position
	 * @param isWholePage 是否包含了整个页面的信息
	 * @returns {[]}
	 */
	Router.prototype.joinResources = function(resources, position, isWholePage) {
		// FIXME 暂时只把css都放到head中，js都放到body中，其他情况未考虑

		var newRes = [];
		var texts = [];

		if (position == "head") {
			// 这里只处理css
			var onlyType = "css";

			resources.forEach(function(res) {
				if (res.type != onlyType) return;
				if (res.href) {
					// 这是外链代码

					// 添加外链代码
					newRes.push(res);
				} else {
					// 这是代码片段

					texts.push(res);
				}
			});

			// 把style节点混合放到href之后
			newRes = newRes.concat(texts);

		} else if (position == "body") {
			// 这里只处理js
			var onlyType = "js";

			resources.forEach(function(res, index) {
				if (res.type != onlyType) return;
				if (res.src) {
					// 这是外链代码

					// 之前存在scripts，那就结束之
					if (texts.length > 0) {
						newRes.push({
							type: "js",
							text: texts.join("")
						});
						texts = [];
					}

					// 添加外链代码
					newRes.push(res);
				} else {
					// 这是代码片段
					var text = res.text;
					if (res.boxID) {
						// FIXME 这里的包装壳应该做成配置型的
						text = [
							'seajs.use(["bigbox"], function(bigbox) {',
							'(function() {',
							text,
							'}).call(bigbox.Context("', res.boxID, '"));',
							'});'
						].join('');
					}
					texts.push(text);
				}
			});

			// 如果存在未结束的代码片段，那就加入结束标志
			if (texts.length > 0) {
				newRes.push({
					type: "js",
					text: texts.join("")
				});
			}
		}

		return newRes;
	};

	/**
	 * 把资源数据转化为html
	 * @param resources {Array<Object>}
	 * @returns {String}
	 */
	Router.prototype.res2HTML = function(resources) {
		var html = [];

		resources.forEach(function(res) {
			if (res.type == "js") {
				// 这是js

				if (res.src) {
					// 这是外链
					html.push('<script src="', res.src, '"',
						res.boxID ? (' bigbox-for="' + res.boxID + '"') : '',
						'></script>');
				} else {
					// 这是内联
					html.push('<script>', res.text, '</script>');
				}
			} else {
				// 这是css

				if (res.href) {
					// 这是外链
					html.push('<link href="', res.href, '" rel="stylesheet"',
						res.boxID ? (' bigbox-for="' + res.boxID + '"') : '',
						' />');
				} else {
					// 这是内联
					html.push('<style>', res.text, '</style>');
				}
			}
		});

		return html.join("");
	};

	/**
	 * 把数据和模板拼合，构造结果
	 * @param path
	 * @param data
	 * @returns {{}}
	 */
	Router.prototype.render = function(path, data, callback) {
		// 获取指定路径对应的html结构化数据
		var extName = PathUtil.extname(path);
		var realPath = path + ".js";
		
		// TODO 这里获取模板引擎的代码应该做成按需加载，以及可配置的
		var viewEngine = template[extName.substr(1)];
		
		var results;
		var callbacks = Callbacks(function() {
			results = cloneObject(results);

			// 拼合body模板和数据
			var body = results.body;
			["prefix", "content", "postfix"].forEach(function(item) {
				var value = body[item];
				if (typeof value != "string" || value.length == 0) return;

				body[item] = viewEngine.render(value, data);
			});

			// 针对head资源拼合模板和数据
			var resources = results.head.resources;
			resources.forEach(function(res) {
				if (res.text) {
					res.text = viewEngine.render(res.text, data);
				} else if (res.src) {
					res.src = viewEngine.render(res.src, data);
				} else if (res.href) {
					res.href = viewEngine.render(res.href, data);
				}
			});

			callback(results);
		});

		// 请求模板对象
		$require(realPath, callbacks.add(function(result) {
			results = result;
		}));
	};

	/**
	 * 复制一个对象
	 * @param object
	 * @returns {*}
	 */
	function cloneObject(object) {
		switch (typeof object) {
			case "object":
				if (object) {
					var newObject = object instanceof Array ? [] : {};
					for (var name in object) {
						newObject[name] = cloneObject(object[name]);
					}
					return newObject;
				}
			default:
				return object;
		}
	}

	/**
	 *merge多个object的属性到一个新的对象中
	 */
	function mergeObject() {
		var newObject = cloneObject(arguments[arguments.length - 1]);
		for (var i = arguments.length - 2; i > -1; i--) {
			var object = arguments[i];
			for (var name in object) {
				// FIXME 这里先简单进行了处理
				newObject[name] = object[name];
			}
		}
		return newObject;
	}

	/**
	 * 生成一个新的方法，这个方法仅用于判断传入值是否与原值相等
	 * @param value
	 * @returns {Function}
	 */
	function isEqual2Me(value) {
		return function(arg1) {
			return arg1 == value;
		};
	}
	
	module.exports = Router;

});