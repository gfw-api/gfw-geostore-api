/* eslint-disable valid-typeof */
const Router = require('koa-router');
const logger = require('logger');
const GeoStoreValidator = require('validators/geoStoreValidator');
const GeoJSONSerializer = require('serializers/geoJSONSerializer');
const GeoStoreListSerializer = require('serializers/geoStoreListSerializer');
const AreaSerializer = require('serializers/areaSerializer');
const CountryListSerializer = require('serializers/countryListSerializer');
const CartoServiceV2 = require('services/cartoDBServiceV2');
const GeoStoreServiceV2 = require('services/geoStoreServiceV2');
const GeoJsonIOService = require('services/geoJsonIOService');
const ProviderNotFound = require('errors/providerNotFound');
const GeoJSONNotFound = require('errors/geoJSONNotFound');
const GeometryTooLarge = require('errors/geometryTooLarge');
const { geojsonToArcGIS } = require('arcgis-to-geojson-utils');
const { arcgisToGeoJSON } = require('arcgis-to-geojson-utils');
const config = require('config');

const router = new Router({
    prefix: '/geostore'
});

class GeoStoreRouterV2 {

    static async getGeoStoreById(ctx) {
        ctx.assert(ctx.params.hash, 400, 'Hash param not found');
        logger.info('[GeoStoreRouterV2 - getGeoStoreById] Getting geostore by hash %s', ctx.params.hash);

        let geoStore = await GeoStoreServiceV2.getGeostoreById(ctx.params.hash);
        if (!geoStore) {
            ctx.throw(404, 'GeoStore not found');
            return;
        }
        logger.debug('GeoStore found. Returning...');
        if (!geoStore.bbox) {
            geoStore = await GeoStoreServiceV2.calculateBBox(geoStore);
        }
        if (ctx.query.format && ctx.query.format === 'esri') {
            logger.debug('esri', geojsonToArcGIS(geoStore.geojson)[0]);
            geoStore.esrijson = geojsonToArcGIS(geoStore.geojson)[0].geometry;
        }

        ctx.body = GeoJSONSerializer.serialize(geoStore);
    }

    static async getMultipleGeoStores(ctx) {
        ctx.assert(ctx.request.body.geostores, 400, 'Geostores not found');
        logger.info('[V2 geoStoreRouter - getMultipleGeoStores] Getting geostore by ids %s', ctx.request.body.geostores);
        const { geostores } = ctx.request.body;
        // filter duplicates
        if (!geostores || geostores.length === 0) {
            ctx.throw(404, 'No GeoStores in payload');
            return;
        }
        const ids = [...new Set(geostores.map((el) => el.trim()))];

        logger.info('[V2 geoStoreRouter - getMultipleGeoStores] Getting geostore by consolidated ids %s', ids);

        const geoStores = await GeoStoreServiceV2.getMultipleGeostores(ids);
        if (!geoStores || geoStores.length === 0) {
            ctx.throw(404, 'No GeoStores found');
            return;
        }
        const foundGeoStores = geoStores.length;
        const geostoresFoundById = config.get('constants.maxGeostoresFoundById') > foundGeoStores ? foundGeoStores : config.get('constants.maxGeostoresFoundById');
        logger.info(`Found ${foundGeoStores} matching geostores. Returning ${geostoresFoundById}.`);
        const slicedGeoStores = geoStores.slice(0, config.get('constants.maxGeostoresFoundById'));
        const parsedData = {
            geostores: slicedGeoStores,
            geostoresFound: geoStores.map((el) => el.hash),
            found: foundGeoStores,
            returned: slicedGeoStores.length

        };
        ctx.body = GeoStoreListSerializer.serialize(parsedData);
    }

    static async createGeoStore(ctx) {
        logger.info('Saving GeoStore');
        try {
            const data = {
                provider: ctx.request.body.provider,
                info: {},
                lock: ctx.request.body.lock ? ctx.request.body.lock : false
            };
            if (!ctx.request.body.geojson && !ctx.request.body.esrijson && !ctx.request.body.provider) {
                ctx.throw(400, 'geojson, esrijson or provider required');
                return;
            }
            if (ctx.request.body.esrijson) {
                ctx.request.body.geojson = arcgisToGeoJSON(ctx.request.body.esrijson);
            }

            const geostore = await GeoStoreServiceV2.saveGeostore(ctx.request.body.geojson, data);
            if (process.env.NODE_ENV !== 'test' || geostore.geojson.length < 2000) {
                logger.debug(JSON.stringify(geostore.geojson));
            }
            ctx.body = GeoJSONSerializer.serialize(geostore);
        } catch (err) {
            if (err instanceof ProviderNotFound || err instanceof GeoJSONNotFound) {
                ctx.throw(400, err.message);
                return;
            }
            throw err;
        }
    }

    static async getArea(ctx) {
        logger.info('Retrieving Polygon Area');
        try {
            const data = {
                provider: ctx.request.body.provider,
                info: {},
                lock: ctx.request.body.lock ? ctx.request.body.lock : false
            };
            if (!ctx.request.body.geojson && !ctx.request.body.esrijson && !ctx.request.body.provider) {
                ctx.throw(400, 'geojson, esrijson or provider required');
                return;
            }
            if (ctx.request.body.esrijson) {
                ctx.request.body.geojson = arcgisToGeoJSON(ctx.request.body.esrijson);
            }
            const geostore = await GeoStoreServiceV2.calculateArea(ctx.request.body.geojson, data);
            if (process.env.NODE_ENV !== 'test' || geostore.geojson.length < 2000) {
                logger.debug(JSON.stringify(geostore.geojson));
            }
            ctx.body = AreaSerializer.serialize(geostore);
        } catch (err) {
            if (err instanceof ProviderNotFound || err instanceof GeoJSONNotFound) {
                ctx.throw(400, err.message);
                return;
            }
            throw err;
        }
    }

    static async getNational(ctx) {
        logger.info('Obtaining national data geojson (GADM v3.6)');
        const thresh = ctx.query.simplify ? JSON.parse(ctx.query.simplify.toLowerCase()) : null;

        if (thresh && typeof thresh === Number && (thresh > 1 || thresh <= 0)) {
            ctx.throw(404, 'Bad threshold for simplify. Must be in range 0-1.');
        } else if (thresh && typeof thresh === Boolean && thresh !== true) {
            ctx.throw(404, 'Bad syntax for simplify. Must be "true".');
        }
        const data = await CartoServiceV2.getNational(ctx.params.iso, thresh);
        if (!data) {
            ctx.throw(404, 'Country not found');
        }
        ctx.body = GeoJSONSerializer.serialize(data);
    }

    static async getNationalList(ctx) {
        logger.info('Obtaining national list (GADM v3.6)');
        const data = await CartoServiceV2.getNationalList();
        if (!data) {
            ctx.throw(404, 'Empty List');
        }
        ctx.body = CountryListSerializer.serialize(data);
    }

    static async getSubnational(ctx) {
        logger.info('Obtaining subnational data geojson (GADM v3.6)');
        const thresh = ctx.query.simplify ? JSON.parse(ctx.query.simplify.toLowerCase()) : null;

        if (thresh && typeof thresh === Number && (thresh > 1 || thresh <= 0)) {
            ctx.throw(404, 'Bad threshold for simplify. Must be in range 0-1.');
        } else if (thresh && typeof thresh === Boolean && thresh !== true) {
            ctx.throw(404, 'Bad syntax for simplify. Must be "true".');
        }
        const data = await CartoServiceV2.getSubnational(ctx.params.iso, ctx.params.id1, thresh);
        if (!data) {
            ctx.throw(404, 'Location does not exist.');
        }
        ctx.body = GeoJSONSerializer.serialize(data);
    }

    static async getRegional(ctx) {
        logger.info('Obtaining Admin2 data geojson (GADM v3.6)');
        const thresh = ctx.query.simplify ? JSON.parse(ctx.query.simplify.toLowerCase()) : null;

        if (thresh && typeof thresh === Number && (thresh > 1 || thresh <= 0)) {
            ctx.throw(404, 'Bad threshold for simplify. Must be in range 0-1.');
        } else if (thresh && typeof thresh === Boolean && thresh !== true) {
            ctx.throw(404, 'Bad syntax for simplify. Must be "true".');
        }
        const data = await CartoServiceV2.getRegional(ctx.params.iso, ctx.params.id1, ctx.params.id2, thresh);
        if (!data) {
            ctx.throw(404, 'Location does not exist.');
        }
        ctx.body = GeoJSONSerializer.serialize(data);
    }

    static async use(ctx) {
        logger.info('Obtaining use data with name %s and id %s', ctx.params.name, ctx.params.id);
        const thresh = ctx.query.simplify ? JSON.parse(ctx.query.simplify.toLowerCase()) : null;
        if (thresh && typeof thresh === Boolean && thresh !== true) {
            ctx.throw(404, 'Bad syntax for simplify. Must be "true".');
        }

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
            case 'tiger_conservation_landscapes':
                useTable = 'tcl';
                break;
            default:
                useTable = ctx.params.name;

        }
        if (!useTable) {
            ctx.throw(404, 'Name not found');
        }
        const data = await CartoServiceV2.getUse(useTable, ctx.params.id, thresh);
        if (!data) {
            ctx.throw(404, 'Use not found');
        }
        ctx.body = GeoJSONSerializer.serialize(data);
    }

    static async wdpa(ctx) {
        logger.info('Obtaining wpda data with id %s', ctx.params.id);
        const data = await CartoServiceV2.getWdpa(ctx.params.id);
        if (!data) {
            ctx.throw(404, 'Wdpa not found');
        }
        ctx.body = GeoJSONSerializer.serialize(data);
    }

    static async view(ctx) {
        ctx.assert(ctx.params.hash, 400, 'Hash param not found');
        logger.debug('Getting geostore by hash %s', ctx.params.hash);

        const geoStore = await GeoStoreServiceV2.getGeostoreById(ctx.params.hash);

        if (!geoStore) {
            ctx.throw(404, 'GeoStore not found');
            return;
        }
        logger.debug('GeoStore found. Returning...');

        try {
            const geojsonIoPath = await GeoJsonIOService.view(geoStore.geojson);
            ctx.body = { view_link: geojsonIoPath };
        } catch (err) {
            if (err instanceof GeometryTooLarge) {
                ctx.throw(400, err.message);
            }

            ctx.throw(500, err.message);
        }
    }

}

router.get('/:hash', GeoStoreRouterV2.getGeoStoreById);
router.post('/', GeoStoreValidator.create, GeoStoreRouterV2.createGeoStore);
router.post('/find-by-ids', GeoStoreRouterV2.getMultipleGeoStores);
router.post('/area', GeoStoreValidator.create, GeoStoreRouterV2.getArea);
router.get('/admin/list', GeoStoreRouterV2.getNationalList);
router.get('/admin/:iso', GeoStoreRouterV2.getNational);
router.get('/admin/:iso/:id1', GeoStoreRouterV2.getSubnational);
router.get('/admin/:iso/:id1/:id2', GeoStoreRouterV2.getRegional);
router.get('/use/:name/:id', GeoStoreRouterV2.use);
router.get('/wdpa/:id', GeoStoreRouterV2.wdpa);
router.get('/:hash/view', GeoStoreRouterV2.view);

module.exports = router;
