const Router = require('koa-router');
const logger = require('logger');
const CoverageSerializer = require('serializers/coverageSerializer');
const CoverageServiceV2 = require('services/coverageServiceV2');
const GeoStoreServiceV2 = require('services/geoStoreServiceV2');

const router = new Router({
    prefix: '/coverage'
});

class CoverageRouterV2 {

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
                useTable = ctx.params.name;

        }
        const result = await CoverageServiceV2.getUse(useTable, ctx.params.id);
        ctx.body = CoverageSerializer.serialize({
            layers: result
        });
    }

    static async intersectIsoRegion(ctx) {
        logger.info(`Calculating intersect with iso ${ctx.params.iso} and region ${ctx.params.id1}`);
        let result = null;
        if (!ctx.params.id1) {
            result = await CoverageServiceV2.getNational(ctx.params.iso);
        } else {
            result = await CoverageServiceV2.getSubnational(ctx.params.iso, ctx.params.id1);
        }
        ctx.body = CoverageSerializer.serialize({
            layers: result
        });
    }

    static async intersectWdpa(ctx) {
        logger.info(`Calculating intersect with wdpa ${ctx.params.id}`);
        const result = await CoverageServiceV2.getWdpa(ctx.params.id);

        ctx.body = CoverageSerializer.serialize({
            layers: result
        });

    }

    static async intersectGeo(ctx) {
        logger.info(`Calculating intersect with geostore ${ctx.query.geostore}`);
        ctx.assert(ctx.query.geostore, 400, 'GeoJSON param required');
        const geoStore = await GeoStoreServiceV2.getGeostoreById(ctx.query.geostore);

        if (!geoStore || !geoStore.geojson) {
            ctx.throw(404, 'Use not found');
        }
        const options = {
            slugs: ctx.query.slugs && ctx.query.slugs.split(',')
        };
        const result = await CoverageServiceV2.getWorld(geoStore.geojson.features[0].geometry, options);
        ctx.body = CoverageSerializer.serialize({
            layers: result
        });
    }

}

router.get('/intersect', CoverageRouterV2.intersectGeo);
router.get('/intersect/admin/:iso', CoverageRouterV2.intersectIsoRegion);
router.get('/intersect/admin/:iso/:id1', CoverageRouterV2.intersectIsoRegion);
router.get('/intersect/use/:name/:id', CoverageRouterV2.intersectUse);
router.get('/intersect/wdpa/:id', CoverageRouterV2.intersectWdpa);

module.exports = router;
