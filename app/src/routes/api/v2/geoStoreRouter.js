'use strict';

var Router = require('koa-router');
var logger = require('logger');
var GeoStoreValidator = require('validators/geoStoreValidator');
var GeoJSONSerializer = require('serializers/geoJSONSerializer');
var AreaSerializer = require('serializers/areaSerializer');
var CountryListSerializer = require('serializers/countryListSerializer');
var GeoStore = require('models/geoStore');
var IdConnection = require('models/idConnection');
var CartoServiceV2 = require('services/cartoDBServiceV2');
var GeoStoreServiceV2 = require('services/geoStoreServiceV2');
var GeoJsonIOService = require('services/geojsonioService');
var ProviderNotFound = require('errors/providerNotFound');
var GeoJSONNotFound = require('errors/geoJSONNotFound');
var geojsonToArcGIS = require('arcgis-to-geojson-utils').geojsonToArcGIS;
var arcgisToGeoJSON = require('arcgis-to-geojson-utils').arcgisToGeoJSON;

var router = new Router({
    prefix: '/geostore'
});

class GeoStoreRouterV2 {

    static * getGeoStoreById() {
        this.assert(this.params.hash, 400, 'Hash param not found');
        logger.debug('Getting geostore by hash %s', this.params.hash);
        var geoStore = null;

        try {
            geoStore = yield GeoStoreServiceV2.getGeostoreById(this.params.hash);
            if(!geoStore) {
                this.throw(404, 'GeoStore not found');
                return;
            }
            logger.debug('GeoStore found. Returning...');
            if(!geoStore.bbox) {
                geoStore = yield GeoStoreServiceV2.calculateBBox(geoStore);
            }
            if (this.query.format && this.query.format === 'esri') {
              logger.debug('esri', geojsonToArcGIS(geoStore.geojson)[0]);
              geoStore.esrijson = geojsonToArcGIS(geoStore.geojson)[0].geometry;
            }

            this.body = GeoJSONSerializer.serialize(geoStore);

        } catch(e) {
            logger.error(e);
            throw e;
        }
    }

    static * createGeoStore() {
        logger.info('Saving GeoStore');
        try{
          const data = {
            provider: this.request.body.provider,
            info: {},
            lock: this.request.body.lock ? this.request.body.lock : false
          };
          if (!this.request.body.geojson && !this.request.body.esrijson && !this.request.body.provider){
            this.throw(400, 'geojson, esrijson or provider required');
            return;
          }
          if (this.request.body.esrijson){
            this.request.body.geojson = arcgisToGeoJSON(this.request.body.esrijson);
          }

          let geostore = yield GeoStoreServiceV2.saveGeostore(this.request.body.geojson, data);
          logger.debug(JSON.stringify(geostore.geojson));
          this.body = GeoJSONSerializer.serialize(geostore);
        } catch(err){
            if (err instanceof ProviderNotFound || err instanceof GeoJSONNotFound){
                this.throw(400, err.message);
                return ;
            }
            throw err;
        }
    }

    static * getArea() {
        logger.info('Retreiving Polygon Area');
        try{
          const data = {
            provider: this.request.body.provider,
            info: {},
            lock: this.request.body.lock ? this.request.body.lock : false
          };
          if (!this.request.body.geojson && !this.request.body.esrijson && !this.request.body.provider){
            this.throw(400, 'geojson, esrijson or provider required');
            return;
          }
          if (this.request.body.esrijson){
            this.request.body.geojson = arcgisToGeoJSON(this.request.body.esrijson);
          }
          let geostore = yield GeoStoreServiceV2.calculateArea(this.request.body.geojson, data);
          logger.debug(JSON.stringify(geostore.geojson));
          this.body = AreaSerializer.serialize(geostore);
        } catch(err){
            if (err instanceof ProviderNotFound || err instanceof GeoJSONNotFound){
                this.throw(400, err.message);
                return ;
            }
            throw err;
        }
    }

    static * getNational() {
        logger.info('Obtaining national data geojson (GADM v3.6)');
        let thresh = this.query.simplify ? JSON.parse(this.query.simplify) : null;

        if(thresh && typeof thresh === Number && (thresh > 1 || thresh <= 0)){
                this.throw(404, 'Bad threshold for simplify. Must be in range 0-1.');
        }
        else if (thresh && typeof thresh === Boolean && thresh.toLowerCase() !== true) {
            this.throw(404, 'Bad syntax for simplify. Must be "true".');
        }
        const data = yield CartoServiceV2.getNational(this.params.iso, thresh);
        if (!data) {
          this.throw(404, 'Country not found');
        }
        this.body = GeoJSONSerializer.serialize(data);
    }

    static * getNationalList() {
        logger.info('Obtaining national list (GADM v3.6)');
        const data = yield CartoServiceV2.getNationalList();
        if (!data) {
          this.throw(404, 'Empty List');
        }
        this.body = CountryListSerializer.serialize(data);
    }

    static * getSubnational() {
        logger.info('Obtaining subnational data geojson (GADM v3.6)');
        let thresh = this.query.simplify ? JSON.parse(this.query.simplify) : null;

        if(thresh && typeof thresh === Number && (thresh > 1 || thresh <= 0)){
                this.throw(404, 'Bad threshold for simplify. Must be in range 0-1.');
        }
        else if (thresh && typeof thresh === Boolean && thresh.toLowerCase() !== true) {
            this.throw(404, 'Bad syntax for simplify. Must be "true".');
        }
        const data = yield CartoServiceV2.getSubnational(this.params.iso, this.params.id1, thresh);
        if (!data) {
          
        }
        this.body = GeoJSONSerializer.serialize(data);
    }

    static * getRegional() {
        logger.info('Obtaining Admin2 data geojson (GADM v3.6)');
        let thresh = this.query.simplify ? JSON.parse(this.query.simplify) : null;

        if(thresh && typeof thresh === Number && (thresh > 1 || thresh <= 0)){
                this.throw(404, 'Bad threshold for simplify. Must be in range 0-1.');
        }
        else if (thresh && typeof thresh === Boolean && thresh.toLowerCase() !== true) {
            this.throw(404, 'Bad syntax for simplify. Must be "true".');
        }
        const data = yield CartoServiceV2.getRegional(this.params.iso, this.params.id1, this.params.id2, thresh);
        if (!data) {
          this.throw(404, 'Country/Admin1/Admin2 not found');
        }
        this.body = GeoJSONSerializer.serialize(data);
    }

    static * use() {
        logger.info('Obtaining use data with name %s and id %s', this.params.name, this.params.id);
        let thresh = this.query.simplify ? JSON.parse(this.query.simplify) : null;
        if (thresh && typeof thresh === Boolean && thresh.toLowerCase() !== true) {
            this.throw(404, 'Bad syntax for simplify. Must be "true".');
        }

        let useTable = null;
        switch (this.params.name) {
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
                useTable = this.params.name;
        }
        if (!useTable) {
            this.throw(404, 'Name not found');
        }
        const data = yield CartoServiceV2.getUse(useTable, this.params.id, thresh);
        if (!data) {
          this.throw(404, 'Use not found');
        }
        this.body = GeoJSONSerializer.serialize(data);
    }

    static * wdpa() {
        logger.info('Obtaining wpda data with id %s', this.params.id);
        const data = yield CartoServiceV2.getWdpa(this.params.id);
        if (!data) {
          this.throw(404, 'Wdpa not found');
        }
        this.body = GeoJSONSerializer.serialize(data);
    }

    static * view() {
        this.assert(this.params.hash, 400, 'Hash param not found');
        logger.debug('Getting geostore by hash %s', this.params.hash);
        var geoStore = null;
        var geojsonIoPath = null;

        try {
            geoStore = yield GeoStoreServiceV2.getGeostoreById(this.params.hash);

            if(!geoStore) {
                this.throw(404, 'GeoStore not found');
                return;
            }
            logger.debug('GeoStore found. Returning...');

            geojsonIoPath = yield GeoJsonIOService.view(geoStore.geojson);
            this.body = {'view_link': geojsonIoPath};

        } catch(e) {
            logger.error(e);
            throw e;
        }
    }
}

router.get('/:hash', GeoStoreRouterV2.getGeoStoreById);
router.post('/', GeoStoreValidator.create, GeoStoreRouterV2.createGeoStore);
router.post('/area', GeoStoreValidator.create, GeoStoreRouterV2.getArea);
router.get('/admin/:iso', GeoStoreRouterV2.getNational);
router.get('/admin/list', GeoStoreRouterV2.getNationalList);
router.get('/admin/:iso/:id1', GeoStoreRouterV2.getSubnational);
router.get('/admin/:iso/:id1/:id2', GeoStoreRouterV2.getRegional);
router.get('/use/:name/:id', GeoStoreRouterV2.use);
router.get('/wdpa/:id', GeoStoreRouterV2.wdpa);
router.get('/:hash/view', GeoStoreRouterV2.view);

module.exports = router;
