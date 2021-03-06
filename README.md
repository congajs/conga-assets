conga-assets
============

Overview
--------

This is a bundle for the [Conga.js](https://github.com/congajs/conga) framework which 
handles the merging and minification of javascript and css assets using the 
[connect-assetmanager](https://github.com/mape/connect-assetmanager) module.

Configuration
-------------

Example:

    // config.yml
    assets:

        # enable asset compilation
        enabled: true
        
        # should a version be appended
        appendVersion: true
        
        # version parameter name (/js/src.js?v=1234)
        versionParameter: v
        
        # version number to append to querystrings
        version: v1.0
        
        # custom defined tags and asset paths
        tags:
            js-plugins:
                type: javascript
                path: %kernel.app_public_path%
                route: /js/conga.plugin.js
                files:
                    - /bundles/conga-socketio/js/conga-socketio.js
            
            css-all:
                type: css
                path: %kernel.app_public_path%
                route: /css/all.css
                files:
                    - /js/lib/bootstrap/dist/css/bootstrap.css
                    - /bundles/demo-bundle/css/styles.css
        
        # templates to parse asset paths from
        templates:
            - demo-bundle:layout.jade
            - demo-bundle:chat/index.jade

Usage
-----

To combine assets in your templates, use the provided assets() template helper.

    asset(destination, assetType, sourceFiles)

Jade example:

    # layout.jade
    != assets('/js/src.js', 'javascript', ['/js/user.js', '/js/jst.js', '/bundles/demo-bundle/js/*'])