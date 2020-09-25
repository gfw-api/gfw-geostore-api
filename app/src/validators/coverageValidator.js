const logger = require('logger');
const ErrorSerializer = require('serializers/errorSerializer');

class CoverageValidator {

    static async create(ctx, next) {
        logger.debug('Validate create coverage');
        ctx.checkBody('geojson').isGEOJSON();
        ctx.checkBody('slug').notEmpty();
        ctx.checkBody('layerSlug').notEmpty();

        if (ctx.errors) {
            logger.debug('errors ', ctx.errors);
            ctx.body = ErrorSerializer.serializeValidationBodyErrors(ctx.errors);
            ctx.status = 400;
            return;
        }
        logger.debug('Validate correct!');
        await next();
    }

    static async update(ctx, next) {
        logger.debug('Validate edit coverage');
        ctx.checkBody('geojson').isGEOJSON();
        ctx.checkBody('layerSlug').optional().notEmpty();

        if (ctx.errors) {
            logger.debug('errors ', ctx.errors);
            ctx.body = ErrorSerializer.serializeValidationBodyErrors(ctx.errors);
            ctx.status = 400;
            return;
        }
        logger.debug('Validate correct!');
        await next();
    }

}

module.exports = CoverageValidator;
