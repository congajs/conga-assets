/*
 * This file is part of the conga-framework module.
 *
 * (c) Marc Roulias <marc@lampjunkie.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

// built-in modules
const path = require('path');
const fs = require('fs');

/**
 * Build a javascript or css tag for a file route
 *
 * @param  {String} route
 * @param  {String} type
 * @return {String}
 */
const buildTag = (route, type) => {

	let html = '';

	switch (type){

		case 'javascript':
		case 'js':

			html = '<script type="text/javascript" src="' + route + '"></script>';

			break;

		case 'stylesheet':
		case 'css':

			html = '<link href="' + route + '" rel="stylesheet" media="screen">';

			break;
	}

	return html;
};

/**
 * The AssetHelper is a template helper which provides functions
 * to deal with assetic compilations in templates
 *
 * @param  {Container} container
 */
class AssetsHelper {

	constructor (container) {
		/**
		 * The service container
		 * @type {Object}
		 */
		this.container = container;

		/**
		 * Cache of rendered tags keyed by route
		 *
		 * @type {Object}
		 */
		this.cache = {};

		/**
		 * Mapping of helper method names to object method names
		 *
		 * @type {Object}
		 */
		this.methods =  {
			'assets': 'assets'
		};
	}

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
	assets(route, type, files, returnHtmlOnly) {

		const wrench = this.container.get('wrench');

		// check if route is already in cache
		if (typeof this.cache[route] === 'undefined') {

			let config = this.container.get('config').get('assets');
			let publicPath = this.container.getParameter('kernel.app_public_path');

			let returnFiles = [],
				html = '',
				fullHtml = '';

			// expand all the files (consider wild-cards)
			// NOTE: this may be done already from the express assetic helper but we need the expanded file list in different modules so do it once here
			files.forEach(file => {
				if (file[file.length-1] === '*'){

					// this is a wildcard route
					let currentPath = file.replace('/*', '');
					let paths = wrench.readdirSyncRecursive(path.join(publicPath, currentPath));

					paths.forEach(p => {

						let pExt = p.substr(-3);

						// only include files of the correct type
						if (!type ||
							((type === 'js' || type === 'javascript') && pExt === '.js') ||
							((type === 'css' || type === 'stylesheet') && pExt === '.css')
						) {
							let validExt;
							let strPath = path.join(currentPath, p);
							let stat = fs.statSync(path.join(publicPath, strPath));

							// do not include directories
							if (!stat.isDirectory()) {

								returnFiles.push(strPath);

								if (type === 'js' || type === 'javascript'){
									validExt = '.js';
								} else {
									validExt = '.css';
								}

								let regex = new RegExp(validExt + '$');

								// check that file is expected type
								if (regex.exec(p)){
									fullHtml += buildTag(currentPath + '/' + p, type);
								}
							}
						}
					});

				} else {

					// this is a direct file path
					fullHtml += buildTag(file, type);

					returnFiles.push(file);

				}
			});

			// check if asset compilation is enabled
			if (config.enabled) {

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
}

module.exports = AssetsHelper;