const config = require('config');
const logger = require('logger');
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const koaLogger = require('koa-logger');
const loader = require('loader');
const koaValidate = require('koa-validate');
const mongoose = require('mongoose');
const ErrorSerializer = require('serializers/errorSerializer');
const koaSimpleHealthCheck = require('koa-simple-healthcheck');
const { RWAPIMicroservice } = require('rw-api-microservice-node');
const sleep = require('sleep');

const mongooseOptions = require('../../config/mongoose');

const mongoUri = process.env.MONGO_URI || `mongodb://${config.get('mongodb.host')}:${config.get('mongodb.port')}/${config.get('mongodb.database')}`;

let retries = 10;

if (config.get('logger.level') === 'debug') {
    logger.debug('Setting mongoose debug logging on');

    mongoose.set('debug', true);
    mongoose.connection.on('error', (err) => {
        logger.error('Mongoose error');
        logger.error(err);
    });
    mongoose.connection.on('connecting', () => {
        logger.debug('Mongoose attempting to connect');
    });
    mongoose.connection.on('connected', () => {
        logger.debug('Mongoose connected to server');
    });
}

async function init() {
    return new Promise((resolve, reject) => {
        async function onDbReady(mongoConnectionError) {
            if (mongoConnectionError) {
                if (retries >= 0) {
                    retries--;
                    logger.error(`Failed to connect to MongoDB uri ${mongoUri}, retrying...`);
                    logger.debug(mongoConnectionError);
                    sleep.sleep(5);
                    mongoose.connect(mongoUri, mongooseOptions, onDbReady);
                } else {
                    logger.error('MongoURI', mongoUri);
                    logger.error(mongoConnectionError);
                    reject(new Error(mongoConnectionError));
                }

                return;
            }

            // instance of koa
            const app = new Koa();

            app.use(koaLogger());

            app.use(koaSimpleHealthCheck());

            app.use(bodyParser({
                jsonLimit: '50mb'
            }));

            // catch errors and send in jsonapi standard. Always return vnd.api+json
            app.use(async (ctx, next) => {
                try {
                    await next();
                } catch (inErr) {
                    let error = inErr;
                    try {
                        error = JSON.parse(inErr);
                    } catch (e) {
                        logger.debug('Could not parse error message - is it JSON?: ', inErr);
                        error = inErr;
                    }
                    ctx.status = error.status || ctx.status || 500;
                    if (ctx.status >= 500) {
                        logger.error(error);
                    } else {
                        logger.info(error);
                    }

                    ctx.body = ErrorSerializer.serializeError(ctx.status, error.message);
                    if (process.env.NODE_ENV === 'prod' && ctx.status === 500) {
                        ctx.body = 'Unexpected error';
                    }
                    ctx.response.type = 'application/vnd.api+json';
                }
            });

            // load custom validator
            require('validators/geoJSONValidator');
            koaValidate(app);

            app.use(RWAPIMicroservice.bootstrap({
                logger,
                gatewayURL: process.env.GATEWAY_URL,
                microserviceToken: process.env.MICROSERVICE_TOKEN,
                fastlyEnabled: process.env.FASTLY_ENABLED,
                fastlyServiceId: process.env.FASTLY_SERVICEID,
                fastlyAPIKey: process.env.FASTLY_APIKEY
            }));

            // load routes
            loader.loadRoutes(app);

            // Instance of http module
            // const app = require('http').Server(app.callback());

            // get port of environment, if not exist obtain of the config.
            // In production environment, the port must be declared in environment variable
            const port = process.env.PORT || config.get('service.port');

            const server = app.listen(port, () => {
            });
            logger.info(`Server started in port:${port}`);
            resolve({ app, server });
        }

        logger.info(`Connecting to MongoDB URL ${mongoUri}`);

        mongoose.connect(mongoUri, mongooseOptions, onDbReady);
    });
}

module.exports = init;
