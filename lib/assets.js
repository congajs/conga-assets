/*
 * This file is part of the conga-framework module.
 *
 * (c) Marc Roulias <marc@lampjunkie.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

// built-in modules
var fs = require('fs');
var path = require('path');

/**
 * Configure connect-assetmanager and register it within express
 * 
 * @author  Marc Roulias <marc@lampjunkie.com>
 */
function Assets() { }

Assets.prototype = {

	/**
	 * The service container
	 * @type {Container|null|*}
	 */
	container: null ,

	/**
	 * Configure connect-assetmanager and add it to the express middleware
	 * 
	 * @param  {Object}   container
	 * @param  {Object}   app
	 * @param  {Function} next
	 * @return {void}
	 */
	onAddMiddleware: function(container, app, next){

		this.container = container;
		var self = this;
		var config = container.get('config').get('assets');

		if (!config.enabled) {
			next();
			return;
		}

		// requiring here so that it doesn't get loaded if not needed (lines above)
		var assetManager = require('connect-assetmanager');
		var assetManagerGroups = {};
		var i=0;

		if (config.paths){
			
			config.paths.forEach(function(template) {
				var tags = self.parseAssetTagsFromTemplate(
					container.get('namespace.resolver').resolveWithSubpath(template, 'lib/resources/views')
				);
				tags.forEach(function(tag){
					assetManagerGroups[i] = {
						route: new RegExp(tag.route.replace(/\./g, '\\.').replace(/\//g, '\\/')),
						path: container.getParameter('kernel.app_public_path'),
						dataType: tag.type,
						files: tag.files
					};
					i++;
				});
			});

			var assetsManagerMiddleware = assetManager(assetManagerGroups);
			app.use(assetsManagerMiddleware);
		}

		next();
	},

	/**
	 * Find the "assets()" tags in a template path and return the parsed
	 * parameters
	 * 
	 * @param  {String} templatePath
	 * @return {Array}
	 */
	parseAssetTagsFromTemplate: function(templatePath){

		var data ,
			match ,
			tags = [] ,
			matchStr = '' ,
			src = fs.readFileSync(templatePath).toString() ,
			tagPattern = this.container.get('config').get('assets').tagPattern || 'assets\\((.*)\\)' ,
			pattern = new RegExp(tagPattern, 'gmi');

		while (match = pattern.exec(src)) {

			matchStr = match[1].replace(/^\s+|\s+$/g, '');

			try {

				data = JSON.parse('[' + matchStr + ']');

			} catch (e) {
				if (matchStr.indexOf('"') === -1) {
					try {

						// try replacing single quotes with double quotes
						data = JSON.parse('[' + matchStr.replace(/'/g, '"') + ']');

					} catch(e) {
						console.log(e.stack || e);
					}
				} else {
					console.log(e.stack || e);
				}
			}
			if (data && data.length >= 3) {
				tags.push({
					route: data[0],
					type: data[1],
					files: this.fixFilePaths(data[2], data[1])
				});
			}
		}

		return tags;

	},

	/**
	 * Find any wildcards ('/*') in the given path array and recursively
	 * add js files that are found in the sub paths
	 * 
	 * @param  {Array} files
	 * @param  {String} type
	 * @return {Array}
	 */
	fixFilePaths: function(files, type) {

		var publicPath = this.container.getParameter('kernel.app_public_path');
		var fixed = [];

		files.forEach(function(file){
			if (file[file.length-1] === '*') {

				var currentPath = file.replace('/*', '');
				var paths = this.container.get('wrench').readdirSyncRecursive(path.join(publicPath, currentPath));

				paths.forEach(function(p){

					var pExt = p.substr(-3);

					// only include files of the correct type
					if (!type ||
						((type === 'js' || type === 'javascript') && pExt === '.js') ||
						((type === 'css' || type === 'stylesheet') && pExt === '.css')) {

						var strPath = path.join(currentPath, p);
						var stat = fs.statSync(path.join(publicPath, strPath));

						// do not include directories
						if (!stat.isDirectory()) {
							fixed.push(strPath);
						}

					}

				});

			} else {
				fixed.push(file);
			}
		}, this);

		return fixed;
	}
};

Assets.prototype.constructor = Assets;

module.exports = Assets;