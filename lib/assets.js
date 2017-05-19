/*
 * This file is part of the conga-framework module.
 *
 * (c) Marc Roulias <marc@lampjunkie.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

// built-in modules
const fs = require('fs');
const path = require('path');

/**
 * Configure connect-assetmanager and register it within express
 * 
 * @author  Marc Roulias <marc@lampjunkie.com>
 */
class Assets {

	constructor() {

		/**
		 * The service container
		 * @type {Container|null|*}
		 */
		this.container = null;

	}

	/**
	 * Configure connect-assetmanager and add it to the express middleware
	 * 
	 * @param  {Object}   container
	 * @param  {Object}   app
	 * @param  {Function} next
	 * @return {void}
	 */
	onAddMiddleware(container, app, next) {

		this.container = container;

		const config = container.get('config').get('assets');

		if (!config.enabled) {
			next();
			return;
		}

		// requiring here so that it doesn't get loaded if not needed (lines above)
		const assetManager = require('connect-assetmanager');
		const assetManagerGroups = {};
		let i = 0;

		const appPath = container.getParameter('kernel.app_public_path');

		if (config.tags instanceof Array) {
			config.tags.forEach(tag => {
				const { type, path, route, files } = tag;
				assetManagerGroups[i++] = {
					route: new RegExp(route.replace(/\./g, '\\.').replace(/\//g, '\\/')),
					path: path || appPath,
					dataType: type,
					files
				};
			});
		}

		// NOTE: using config.paths for backwards compatibility for now
		let templatePaths = config.templates || config.paths;
		if (templatePaths instanceof Array) {
			templatePaths.forEach(template => {
				const tags = this.parseAssetTagsFromTemplate(
					container.get('namespace.resolver').resolveWithSubpath(template, 'lib/resources/views')
				);
				tags.forEach(tag => {
					const { type, path, route, files } = tag;
					assetManagerGroups[i++] = {
						route: new RegExp(route.replace(/\./g, '\\.').replace(/\//g, '\\/')),
						path: path || appPath,
						dataType: type,
						files
					};
				});
			});
		}

		if (i !== 0) {
			let assetsManagerMiddleware = assetManager(assetManagerGroups);
			app.use(assetsManagerMiddleware);
		}

		next();
	}

	/**
	 * Find the "assets()" tags in a template path and return the parsed
	 * parameters
	 * 
	 * @param  {String} templatePath
	 * @return {Array}
	 */
	parseAssetTagsFromTemplate(templatePath) {

		let data ,
			match ,
			tags = [] ,
			matchStr = '' ,
			src = fs.readFileSync(templatePath).toString() ,
			tagPattern = 'assets\\((.*)\\)', //this.container.get('config').get('assets').tagPattern || 'assets\\((.*)\\)' ,
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

	}

	/**
	 * Find any wildcards ('/*') in the given path array and recursively
	 * add js files that are found in the sub paths
	 * 
	 * @param  {Array} files
	 * @param  {String} type
	 * @return {Array}
	 */
	fixFilePaths(files, type) {

		const wrench = this.container.get('wrench');
		const publicPath = this.container.getParameter('kernel.app_public_path');

		let fixed = [];

		files.forEach(file => {
			if (file[file.length-1] === '*') {

				let currentPath = file.replace('/*', '');
				let paths = wrench.readdirSyncRecursive(path.join(publicPath, currentPath));

				paths.forEach(p => {

					const pExt = p.substr(-3);

					// only include files of the correct type
					if (!type ||
						((type === 'js' || type === 'javascript') && pExt === '.js') ||
						((type === 'css' || type === 'stylesheet') && pExt === '.css')
					) {
						let strPath = path.join(currentPath, p);
						let stat = fs.statSync(path.join(publicPath, strPath));

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
}

module.exports = Assets;