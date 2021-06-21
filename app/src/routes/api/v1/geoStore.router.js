const Router = require('koa-router');
const logger = require('logger');
const GeoStoreValidator = require('validators/geoStoreValidator');
const GeoJSONSerializer = require('serializers/geoJSONSerializer');
const GeoStoreListSerializer = require('serializers/geoStoreListSerializer');
const AreaSerializer = require('serializers/areaSerializer');
const CountryListSerializer = require('serializers/countryListSerializer');
const CartoService = require('services/cartoDBService');
const GeoStoreService = require('services/geoStoreService');
const GeoJsonIOService = require('services/geoJsonIOService');
const ProviderNotFound = require('errors/providerNotFound');
const GeoJSONNotFound = require('errors/geoJSONNotFound');
const { geojsonToArcGIS } = require('arcgis-to-geojson-utils');
const { arcgisToGeoJSON } = require('arcgis-to-geojson-utils');
const config = require('config');

const router = new Router({
    prefix: '/geostore'
});

class GeoStoreRouter {

    static async getGeoStoreById(ctx) {
        ctx.assert(ctx.params.hash, 400, 'Hash param not found');
        logger.debug('Getting geostore by hash %s', ctx.params.hash);

        let geoStore = await GeoStoreService.getGeostoreById(ctx.params.hash);
        if (!geoStore) {
            ctx.throw(404, 'GeoStore not found');
            return;
        }
        logger.debug('GeoStore found. Returning...');
        if (!geoStore.bbox) {
            geoStore = await GeoStoreService.calculateBBox(geoStore);
        }
        if (ctx.query.format && ctx.query.format === 'esri') {
            logger.debug('esri', geojsonToArcGIS(geoStore.geojson)[0]);
            geoStore.esrijson = geojsonToArcGIS(geoStore.geojson)[0].geometry;
        }

        ctx.body = GeoJSONSerializer.serialize(geoStore);

    }

    static async getMultipleGeoStores(ctx) {
        ctx.assert(ctx.request.body.geostores, 400, 'Geostores not found');
        const { geostores } = ctx.request.body;
        if (!geostores || geostores.length === 0) {
            ctx.throw(404, 'No GeoStores in payload');
            return;
        }
        const ids = [...new Set(geostores.map((el) => el.trim()))];

        logger.debug('Getting geostore by hash %s', ids);

        const geoStores = await GeoStoreService.getMultipleGeostores(ids);
        if (!geoStores || geoStores.length === 0) {
            ctx.throw(404, 'No GeoStores found');
            return;
        }
        const foundGeoStores = geoStores.length;
        const geostoresFoundById = config.get('constants.maxGeostoresFoundById') > foundGeoStores ? foundGeoStores : config.get('constants.maxGeostoresFoundById');
        logger.debug(`Found ${foundGeoStores} matching geostores. Returning ${geostoresFoundById}.`);
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
        logger.info('[GeostoreRouter v1 - createGeoStore] Saving GeoStore');
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

            const geostore = await GeoStoreService.saveGeostore(ctx.request.body.geojson, data);
            logger.info(`[GeostoreRouter v1 - createGeoStore] Geostore saved, serializing and returning`);
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
            const geostore = await GeoStoreService.calculateArea(ctx.request.body.geojson, data);
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
        logger.info('Obtaining national data geojson');
        const data = await CartoService.getNational(ctx.params.iso);
        if (!data) {
            ctx.throw(404, 'Country not found');
        }
        ctx.body = GeoJSONSerializer.serialize(data);
    }

    static async getNationalList(ctx) {
        logger.info('Obtaining national list');
        const data = await CartoService.getNationalList();
        if (!data) {
            ctx.throw(404, 'Empty List');
        }
        ctx.body = CountryListSerializer.serialize(data);
    }

    static async getSubnational(ctx) {
        logger.info('Obtaining subnational data geojson');
        const data = await CartoService.getSubnational(ctx.params.iso, ctx.params.id1);
        if (!data) {
            ctx.throw(404, 'Country/Region not found');
        }
        ctx.body = GeoJSONSerializer.serialize(data);
    }

    static async getAdmin2(ctx) {
        logger.info('Obtaining Admin2 data geojson');
        const data = await CartoService.getAdmin2(ctx.params.iso, ctx.params.id1, ctx.params.id2);
        if (!data) {
            ctx.throw(404, 'Country/Admin1/Admin2 not found');
        }
        ctx.body = GeoJSONSerializer.serialize(data);
    }

    static async use(ctx) {
        logger.info('Obtaining use data with name %s and id %s', ctx.params.name, ctx.params.id);
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
            case 'endemic_bird_areas':
                useTable = 'endemic_bird_areas';
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
        const data = await CartoService.getUse(useTable, ctx.params.id);
        if (!data) {
            ctx.throw(404, 'Use not found');
        }
        ctx.body = GeoJSONSerializer.serialize(data);
    }

    static async wdpa(ctx) {
        logger.info('Obtaining wpda data with id %s', ctx.params.id);

        const data = await CartoService.getWdpa(ctx.params.id);
        if (!data) {
            ctx.throw(404, 'Wdpa not found');
        }
        ctx.body = GeoJSONSerializer.serialize(data);
    }

    static async view(ctx) {
        ctx.assert(ctx.params.hash, 400, 'Hash param not found');
        logger.debug('Getting geostore by hash %s', ctx.params.hash);

        const geoStore = await GeoStoreService.getGeostoreById(ctx.params.hash);

        if (!geoStore) {
            ctx.throw(404, 'GeoStore not found');
            return;
        }
        logger.debug('GeoStore found. Returning...');

        const geojsonIoPath = await GeoJsonIOService.view(geoStore.geojson);
        ctx.body = { view_link: geojsonIoPath };

    }

}

router.get('/:hash', GeoStoreRouter.getGeoStoreById);
router.post('/', GeoStoreValidator.create, GeoStoreRouter.createGeoStore);
router.post('/find-by-ids', GeoStoreRouter.getMultipleGeoStores);
router.post('/area', GeoStoreValidator.create, GeoStoreRouter.getArea);
router.get('/admin/list', GeoStoreRouter.getNationalList);
router.get('/admin/:iso', GeoStoreRouter.getNational);
router.get('/admin/:iso/:id1', GeoStoreRouter.getSubnational);
router.get('/admin/:iso/:id1/:id2', GeoStoreRouter.getAdmin2);
router.get('/use/:name/:id', GeoStoreRouter.use);
router.get('/wdpa/:id', GeoStoreRouter.wdpa);
router.get('/:hash/view', GeoStoreRouter.view);

module.exports = router;
