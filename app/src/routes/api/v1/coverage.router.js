const Router = require('koa-router');
const logger = require('logger');
const CoverageSerializer = require('serializers/coverageSerializer');
const CoverageService = require('services/coverageService');
const GeoStoreService = require('services/geoStoreService');

const router = new Router({
    prefix: '/coverage'
});

class CoverageRouter {

    static async intersectUse(ctx) {
        logger.info(`Calculating intersect with use ${ctx.params.name} and id ${ctx.params.id}`);
        let useTable = null;
        switch (ctx.params.name) {

            case 'mining':
                useTable = 'gfw_mining';
                break;
            case 'oilpalm':
                useTable = 'gfw_oil_palm';
                break;
            case 'fiber':
                useTable = 'gfw_wood_fiber';
                break;
            case 'logging':
                useTable = 'gfw_logging';
                break;
            default:
                ctx.throw(400, 'Name param invalid');

        }
        const result = await CoverageService.getUse(useTable, ctx.params.id);
        ctx.body = CoverageSerializer.serialize({
            layers: result
        });
    }

    static async intersectIsoRegion(ctx) {
        logger.info(`Calculating intersect with iso ${ctx.params.iso} and region ${ctx.params.id1}`);
        let result = null;
        if (!ctx.params.id1) {
            result = await CoverageService.getNational(ctx.params.iso);
        } else {
            result = await CoverageService.getSubnational(ctx.params.iso, ctx.params.id1);
        }
        ctx.body = CoverageSerializer.serialize({
            layers: result
        });
    }

    static async intersectWdpa(ctx) {
        logger.info(`Calculating intersect with wdpa ${ctx.params.id}`);
        const result = await CoverageService.getWdpa(ctx.params.id);

        ctx.body = CoverageSerializer.serialize({
            layers: result
        });

    }

    static async intersectGeo(ctx) {
        logger.info(`Calculating intersect with geostore ${ctx.query.geostore}`);
        ctx.assert(ctx.query.geostore, 400, 'GeoJSON param required');
        const geoStore = await GeoStoreService.getGeostoreById(ctx.query.geostore);

        if (!geoStore || !geoStore.geojson) {
            ctx.throw(404, 'Use not found');
        }
        const options = {
            slugs: ctx.query.slugs && ctx.query.slugs.split(',')
        };
        const result = await CoverageService.getWorld(geoStore.geojson.features[0].geometry, options);
        ctx.body = CoverageSerializer.serialize({
            layers: result
        });
    }

}

router.get('/intersect', CoverageRouter.intersectGeo);
router.get('/intersect/admin/:iso', CoverageRouter.intersectIsoRegion);
router.get('/intersect/admin/:iso/:id1', CoverageRouter.intersectIsoRegion);
router.get('/intersect/use/:name/:id', CoverageRouter.intersectUse);
router.get('/intersect/wdpa/:id', CoverageRouter.intersectWdpa);

module.exports = router;
