'use strict';
//load modules
if (process.env.NODE_ENV === 'prod') {
  require('newrelic');
}
var config = require('config');
var logger = require('logger');
var path = require('path');
var koa = require('koa');
var co = require('co');
var bodyParser = require('koa-bodyparser');
var koaLogger = require('koa-logger');
var loader = require('loader');
var validate = require('koa-validate');
var mongoose = require('mongoose');
var ErrorSerializer = require('serializers/errorSerializer');
var mongoUri = process.env.MONGO_URI || 'mongodb://' + config.get('mongodb.host') + ':' + config.get('mongodb.port') + '/' + config.get('mongodb.database');
const ctRegisterMicroservice = require('ct-register-microservice-node');

var onDbReady = function (err) {
  if (err) {
    logger.error(err);
    throw new Error(err);
  }

  // instance of koa
  var app = koa();

  //if environment is dev then load koa-logger
  if (process.env.NODE_ENV === 'dev') {
    app.use(koaLogger());
  }

  app.use(bodyParser({
    jsonLimit: '50mb'
  }));

  //catch errors and send in jsonapi standard. Always return vnd.api+json
  app.use(function* (next) {
    try {
      yield next;
    } catch (err) {
      logger.error(err);
      this.status = err.status || 500;
      this.body = ErrorSerializer.serializeError(this.status, err.message || err);
      logger.debug(this.body);
      if (process.env.NODE_ENV === 'prod' && this.status === 500) {
        this.body = 'Unexpected error';
      }
    }
    this.response.type = 'application/vnd.api+json';
  });

  //load custom validator
  require('validators/geoJSONValidator');
  app.use(validate());

  //load routes
  loader.loadRoutes(app);

  //Instance of http module
  var server = require('http').Server(app.callback());



  // get port of environment, if not exist obtain of the config.
  // In production environment, the port must be declared in environment variable
  var port = process.env.PORT || config.get('service.port');

  server.listen(port, function () {
    ctRegisterMicroservice.register({
      info: require('../microservice/register.json'),
      swagger: require('../microservice/public-swagger.json'),
      mode: (process.env.CT_REGISTER_MODE && process.env.CT_REGISTER_MODE === 'auto') ? ctRegisterMicroservice.MODE_AUTOREGISTER : ctRegisterMicroservice.MODE_NORMAL,
      framework: ctRegisterMicroservice.KOA1,
      app,
      logger,
      name: config.get('service.name'),
      ctUrl: process.env.CT_URL,
      url: process.env.LOCAL_URL,
      active: true,
    }).then(() => {}, (err) => {
      logger.error(err);
      process.exit(1);
    });
  });

  logger.info('Server started in port:' + port);

};
let dbOptions = {};
// KUBE CLUSTER
if (mongoUri.indexOf('replicaSet') > - 1) {
    dbOptions = {
        db: { native_parser: true },
        replset: {
            auto_reconnect: false,
            poolSize: 10,
            socketOptions: {
                keepAlive: 1000,
                connectTimeoutMS: 30000
            }
        },
        server: {
            poolSize: 5,
            socketOptions: {
                keepAlive: 1000,
                connectTimeoutMS: 30000
            }
        }
    };
}
mongoose.connect(mongoUri, dbOptions, onDbReady);
