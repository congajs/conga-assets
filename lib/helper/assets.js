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
var AssetsHelper = function(container){
	this.container = container;
	this.cache = {};
};

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
	 * @param  {String} route 
	 * @param  {String} type  js/javascript/css
	 * @param  {Array}  files
	 * @return {String}
	 */
	assets: function(route, type, files){

		// check if route is already in cache
		if (typeof this.cache[route] === 'undefined'){

			var config = this.container.get('config').get('assets');
			var publicPath = this.container.getParameter('kernel.app_public_path');

			// check if asset compilation is enabled
			if (config.enabled == true){

				// append version to querystring
				
				if (config.appendVersion){
					// build route with configured version string
					route += '?' + config.versionParameter + '=' + config.version;	
				}

				return buildTag(route, type);

			} else {

				var html = '';

				files.forEach(function(file){

					// check if this is a wildcard route
					if (file[file.length-1] === '*'){

						var currentPath = file.replace('/*', '');
						var paths = this.container.get('wrench').readdirSyncRecursive(path.join(publicPath, currentPath));

						paths.forEach(function(p){

							var validExt;

							if (type == 'js' || type == 'javascript'){
								validExt = '.js';
							} else {
								validExt = '.css';
							}

							var regex = new RegExp(validExt + '$');

							// check that file is expected type
							if (regex.exec(p)){
								html += buildTag(currentPath + '/' + p, type);
							}
						});

					} else {
						html += buildTag(file, type);
					}
				}, this);

				this.cache[route] = html;
			}			
		}

		return this.cache[route];
	}
};

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
};

module.exports = AssetsHelper;