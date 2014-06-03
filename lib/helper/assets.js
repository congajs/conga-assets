/*
 * This file is part of the conga-framework module.
 *
 * (c) Marc Roulias <marc@lampjunkie.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

// built-in modules
var path = require('path');

/**
 * The AssetHelper is a template helper which provides functions
 * to deal with assetic compilations in templates
 *
 * @param  {Container} container
 */
function AssetsHelper(container) {
	this.container = container;
	this.cache = {};
}

AssetsHelper.prototype = {
	
	/**
	 * Cache of rendered tags keyed by route
	 * 
	 * @type {Object}
	 */
	cache: {},

	/**
	 * Mapping of helper method names to object method names
	 * 
	 * @type {Object}
	 */
	methods: {
		'assets': 'assets'
	},
	
	/**
	 * Build the tags for assets
	 *
	 * This will either return one tag for the compiled file
	 * or multiple tags for the original files (if asset compilation is disabled)
	 * 
	 * @param  {String}  route
	 * @param  {String}  type  js/javascript/css
	 * @param  {Array}   files
	 * @param  {Boolean} returnHtmlOnly true or undefined to return the HTML only, false to return the entire cached object
	 * @return {String}
	 */
	assets: function(route, type, files, returnHtmlOnly) {

		// check if route is already in cache
		if (typeof this.cache[route] === 'undefined') {

			var config = this.container.get('config').get('assets');
			var publicPath = this.container.getParameter('kernel.app_public_path');

			var returnFiles = [];
			var html = '';
			var fullHtml = '';

			// expand all the files (consider wild-cards)
			// NOTE: this may be done already from the express assetic helper but we need the expanded file list in different modules so do it once here
			files.forEach(function(file) {
				if (file[file.length-1] === '*'){

					// this is a wildcard route
					var currentPath = file.replace('/*', '');
					var paths = this.container.get('wrench').readdirSyncRecursive(path.join(publicPath, currentPath));

					paths.forEach(function(p){

						var validExt;

						returnFiles.push(path.join(currentPath, p));

						if (type == 'js' || type == 'javascript'){
							validExt = '.js';
						} else {
							validExt = '.css';
						}

						var regex = new RegExp(validExt + '$');

						// check that file is expected type
						if (regex.exec(p)){
							fullHtml += buildTag(currentPath + '/' + p, type);
						}
					});

				} else {

					// this is a direct file path
					fullHtml += buildTag(file, type);

					returnFiles.push(file);

				}
			}, this);

			// check if asset compilation is enabled
			if (config.enabled == true){

				if (config.appendVersion){
					// build route with configured version string
					route += '?' + config.versionParameter + '=' + config.version;
				}

				// if asset compilation is enabled, then the HTML only has the combined file
				html = buildTag(route, type);

			} else {

				// if asset compilation is not enabled, then the HTML has all the files
				html = fullHtml;

			}

			// add this data to cache under the route as the unique key
			this.cache[route] = {

				// the version parameter appended to each route
				versionParameter: config.versionParameter ,

				// the version value appended to each route
				version: config.version ,

				// all of the files
				files: returnFiles ,

				// the combined file
				combinedFile: route ,

				// all of the files
				fullHtml: fullHtml ,

				// the combined file (when applicable)
				html: html

			};
		}

		if (returnHtmlOnly === undefined || returnHtmlOnly) {

			// only return the HTML
			return this.cache[route].html;

		}

		// return the cached object hash
		return this.cache[route];
	}
};

AssetsHelper.prototype.constructor = AssetsHelper;

/**
 * Build a javascript or css tag for a file route
 * 
 * @param  {String} route
 * @param  {String} type
 * @return {String}
 */
function buildTag(route, type){

	var html = '';

	switch (type){

		case 'javascript':
		case 'js':

			html = '<script type="text/javascript" src="' + route + '"></script>';

		break;

		case 'css':

			html = '<link href="' + route + '" rel="stylesheet" media="screen">';

		break;
	}

	return html;
}

module.exports = AssetsHelper;