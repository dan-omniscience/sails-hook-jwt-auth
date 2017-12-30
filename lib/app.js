var _ = require('lodash'),
		async = require('async'),
		path = require('path'),
		cwd = process.cwd(),
		includeAll = require('include-all');



var self = module.exports = {
	init: function (sails){
		self.loadAndRegisterFiles(sails);
	},

	adaptSails: function (sails){
		includeAll.optional({
			dirname: path.resolve(__dirname, '../api/controllers'),
			filter: /(.+)Controller\.(js|coffee|litcoffee)$/,
	    flatten: true,
	    keepDirectoryPath: true,
	    replaceExpr: /Controller/
		}, function (err){
			if ( err ) 
			console.error('Failed to load controllers.  Details:',err);
	  	return;
		});

		includeAll.optional({
			dirname: path.resolve(__dirname, '../api/policies'),
			filter: /(.+)\.(js|coffee|litcoffee)$/,
      replaceExpr: null,
      flatten: true,
      keepDirectoryPath: true
		}, function (err){
			if ( err ) 
			console.error('Failed to load policies.  Details:',err);
	  	return;
	  });

	},

	loadAndRegisterFiles: function (sails){
		async.parallel([
			function loadAndRegisterModels(done){
	      // Get the main model files
	      includeAll.optional({
	        dirname   : path.resolve(__dirname, '../api/models'),
	        filter    : /^([^.]+)\.(js|coffee|litcoffee)$/,
	        replaceExpr : /^.*\//,
	        flatten: true
	      }, function (err, models) {
	        if (err) { return cb(err); }
	        // Get any supplemental files
	        includeAll.optional({
	          dirname   : path.resolve(__dirname, '../api/models'),
	          filter    : /(.+)\.attributes.json$/,
	          replaceExpr : /^.*\//,
	          flatten: true
	        }, function (err, supplements) {
	          if (err) { return cb(err); }

	          var finalModels = _.merge(models, supplements);
			      sails.models = _.merge(sails.models || {}, finalModels);

			      done();
	        });
	      });
	  	},

			function loadAndRegisterServices(done){
			  includeAll.optional({
			    dirname: path.resolve(__dirname, '../api/services'),
			    filter: /(.+)\.(js|coffee|litcoffee)$/,
	        depth     : 1,
	        caseSensitive : true
			  }, function (err, services){
			    if ( err ) return done(err);

		      sails.services = _.extend(sails.services || {}, services);

		      // Expose globals (if enabled)
		      if (sails.config.globals.services) {
		        _.each(services, function (service) {
		          var globalName = service.globalId || service.identity;
		          global[globalName] = service;
		        });
		      }

			    done();
			  });
			},

			function loadAndRegisterConfigs(done){
			  includeAll.aggregate({
			    dirname: path.resolve(__dirname, '../config'),
			    exclude: [ 'locales', 'local.js', 'local.json', 'local.coffee', 'local.litcoffee' ],
			    excludeDirs: /(locales|env)$/,
			    filter: /(.+)\.(js|json|coffee|litcoffee)$/,
			    identity: false
			  }, function (err, configs){
			    if ( err ) return done(err);

					sails.config = _.merge(configs, sails.config);

			    done();
			  });
			}
  	], function afterAll(err){
  		if ( err ) sails.log.warn('sails-hook-jwt:: Error encountered trying to register files: ', err);
  	});
	}
}