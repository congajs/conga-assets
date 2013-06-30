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
var Assets = function(){};

Assets.prototype = {

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

		if (config.enabled != true){
			next();
			return;
		}

		// requiring here so that it doesn't get loaded if not needed (lines above)
		var assetManager = require('connect-assetmanager');
		var assetManagerGroups = {};
		var i=0;

		config.paths.forEach(function(template){

			var tags = self.parseAssetTagsFromTemplate(container.get('namespace.resolver')
						.resolveWithSubpath(template, 'lib/resources/views'));

			tags.forEach(function(tag){
				assetManagerGroups[i] = {
					route: new RegExp(tag.route),
					path: container.getParameter('kernel.app_public_path'),
					dataType: tag.type,
					files: tag.files
				};
				i++;
			});
		});

		var assetsManagerMiddleware = assetManager(assetManagerGroups);
		app.use(assetsManagerMiddleware);

		next();
	},

	/**
	 * Find the "asset()" tags in a template path and return the parsed
	 * parameters
	 * 
	 * @param  {String} templatePath
	 * @return {Array}
	 */
	parseAssetTagsFromTemplate: function(templatePath){

		var tags = [];
		var src = fs.readFileSync(templatePath).toString();
		var pattern = /assets\((.*)\)/g;

		while(match = pattern.exec(src)){

			eval('var data = [' + match[1] + '];');

			tags.push({
				route: data[0],
				type: data[1],
				files: this.fixFilePaths(data[2])
			});
		};

		return tags;
	},

	/**
	 * Find any wildcards ('/*') in the given path array and recursively
	 * add js files that are found in the sub paths
	 * 
	 * @param  {Array} files
	 * @return {Array}
	 */
	fixFilePaths: function(files){

		var publicPath = this.container.getParameter('kernel.app_public_path');
		var fixed = [];

		files.forEach(function(file){
			if (file[file.length-1] === '*'){

				var currentPath = file.replace('/*', '');
				var paths = this.container.get('wrench').readdirSyncRecursive(path.join(publicPath, currentPath));

				paths.forEach(function(p){
					if(p.substr(-3) === '.js'){
						fixed.push(path.join(currentPath, p));
					}
				});

			} else {
				fixed.push(file);
			}
		}, this);

		return fixed;
	}
};

module.exports = Assets;