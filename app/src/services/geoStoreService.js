'use strict';
var logger = require('logger');
var GeoStore = require('models/geoStore');
var GeoJSONConverter = require('converters/geoJSONConverter');
var md5 = require('md5');
var CartoDB = require('cartodb');
var IdConnection = require('models/idConnection');
var turf = require('turf');
var ProviderNotFound = require('errors/providerNotFound');
var GeoJSONNotFound = require('errors/geoJSONNotFound');
var config = require('config');

const CARTO_PROVIDER = 'carto';


var executeThunk = function(client, sql, params) {
    return function(callback) {
        client.execute(sql, params).done(function(data) {
            callback(null, data);
        }).error(function(err) {
            callback(err[0], null);
        });
    };
};


class GeoStoreService {

    static * repairGeometry(geojson) {
        logger.debug('Repair geoJSON geometry');
        logger.debug('Generating query');
        let sql = `SELECT ST_AsGeoJson(ST_CollectionExtract(st_MakeValid(ST_GeomFromGeoJSON('${JSON.stringify(geojson)}')),3)) as geojson`;
        logger.debug('SQL to repair geojson: %s', sql);
        try {
            let client = new CartoDB.SQL({
                user: config.get('cartoDB.user')
            });
            let data = yield executeThunk(client, sql, {});
            if (data.rows && data.rows.length === 1) {
                data.rows[0].geojson = JSON.parse(data.rows[0].geojson);
                logger.debug(data.rows[0].geojson);
                return data.rows[0];
            }
            throw new GeoJSONNotFound('No Geojson returned');
        }
        catch(e) {
            logger.error(e);
            throw e;
        }
    }
    
    static * obtainGeoJSONOfCarto(table, user, filter) {
        logger.debug('Obtaining geojson with params: table %s, user %s, filter %s', table, user, filter);
        logger.debug('Generating query');
        let sql = `SELECT ST_AsGeoJson(the_geom) as geojson, (ST_Area(geography(the_geom))/10000) as area_ha FROM ${table} WHERE ${filter}`;
        logger.debug('SQL to obtain geojson: %s', sql);
        let client = new CartoDB.SQL({
            user: user
        });
        let data = yield executeThunk(client, sql, {});
        if (data.rows && data.rows.length === 1) {
            data.rows[0].geojson = JSON.parse(data.rows[0].geojson);
            logger.debug(data.rows[0].geojson);
            return data.rows[0];
        }
        throw new GeoJSONNotFound('Geojson not found');
    }

    static * getNewHash(hash){
        let idCon = yield IdConnection.findOne({oldId: hash}).exec();
        if(!idCon){
            return hash;
        }
        return idCon.hash;
    }

    static * getGeostoreById(id){
        logger.debug(`Getting geostore by id ${id}`);
        let hash = yield GeoStoreService.getNewHash(id);
        logger.debug('hash',hash);
        let geoStore = yield GeoStore.findOne({hash: hash}, {'geojson._id': 0, 'geojson.features._id': 0});
        if (geoStore){
          logger.debug('geostore', JSON.stringify(geoStore.geojson));
          return geoStore;
        }
        return null;
    }

    static * getNationalList(){
        logger.debug('Obtaining national list from database');
        const query = {
            'info.iso': { $ne:  null },
            'info.id1': null
        };
        const select = 'hash info.iso';
        return yield GeoStore.find(query, select);
    }

    static * getGeostoreByInfoProps(infoQuery){
        const geoStore = yield GeoStore.findOne(infoQuery);
        return geoStore;
    }

    static * getGeostoreByInfo(info){
      const geoStore = yield GeoStore.findOne({info});
      return geoStore;
    }

    static * obtainGeoJSON(provider) {
        logger.debug('Obtaining geojson of provider', provider);
        switch (provider.type) {
            case CARTO_PROVIDER:
                return yield GeoStoreService.obtainGeoJSONOfCarto(provider.table, provider.user, provider.filter);
            default:
                logger.error('Provider not found');
                throw new ProviderNotFound(`Provider ${provider.type} not found`);
        }
    }

    static * calculateBBox(geoStore){
        logger.debug('Calculating bbox');
        geoStore.bbox = turf.bbox(geoStore.geojson);
        yield geoStore.save();
        return geoStore;
    }

    static * saveGeostore(geojson, data) {

        let geoStore = {
            geojson: geojson
        };

        if (data && data.provider) {
          let geoJsonObtained = yield GeoStoreService.obtainGeoJSON(data.provider);
          geoStore.geojson = geoJsonObtained.geojson;
          geoStore.areaHa = geoJsonObtained.area_ha;
          geoStore.provider = {
              type: data.provider.type,
              table: data.provider.table,
              user: data.provider.user,
              filter: data.provider.filter
          };
        }
        if (data && data.info) {
          geoStore.info = data.info;
        }
        geoStore.lock = data.lock || false;
        
        logger.debug('Fix and convert geojson');
        logger.debug('Converting', JSON.stringify(geoStore.geojson));
        
        let geoJsonObtained = yield GeoStoreService.repairGeometry(GeoJSONConverter.getGeometry(geoStore.geojson));
        geoStore.geojson = geoJsonObtained.geojson;
        
        logger.debug('Repaired geometry', JSON.stringify(geoStore.geojson));
        logger.debug('Make Feature Collection');
        geoStore.geojson = GeoJSONConverter.makeFeatureCollection(geoStore.geojson);
        logger.debug('Result', JSON.stringify(geoStore.geojson));
        logger.debug('Creating hash from geojson md5');
        geoStore.hash = md5(JSON.stringify(geoStore.geojson));
        if (geoStore.areaHa === undefined) {
            geoStore.areaHa = turf.area(geoStore.geojson) / 10000; // convert to ha2
        }
        let exist = yield GeoStore.findOne({
            hash: geoStore.hash
        });
        if(!geoStore.bbox) {
            geoStore.bbox = turf.bbox(geoStore.geojson);
        }

        yield GeoStore.findOneAndUpdate({hash: geoStore.hash}, geoStore, {upsert: true, new: true, runValidators: true});
        
        return yield GeoStore.findOne({
            hash: geoStore.hash
        }, {
            'geojson._id': 0,
            'geojson.features._id': 0
        });
    }

    static * calculateArea(geojson, data) {

        let geoStore = {
            geojson: geojson
        };

        if (data && data.provider) {
          let geoJsonObtained = yield GeoStoreService.obtainGeoJSON(data.provider);
          geoStore.geojson = geoJsonObtained.geojson;
          geoStore.areaHa = geoJsonObtained.area_ha;
        }

        logger.debug('Converting geojson');
        logger.debug('Converting', JSON.stringify(geoStore.geojson));
        geoStore.geojson = GeoJSONConverter.convert(geoStore.geojson);
        logger.debug('Result', JSON.stringify(geoStore.geojson));
        geoStore.areaHa = turf.area(geoStore.geojson) / 10000; // convert to ha2
        geoStore.bbox = turf.bbox(geoStore.geojson);

        return yield geoStore;

    }

}

module.exports = GeoStoreService;
