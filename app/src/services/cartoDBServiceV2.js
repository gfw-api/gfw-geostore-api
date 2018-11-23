'use strict';
var logger = require('logger');
var path = require('path');
var config = require('config');
var CartoDB = require('cartodb');
var Mustache = require('mustache');
var JSONAPIDeserializer = require('jsonapi-serializer').Deserializer;
const GeoStoreServiceV2 = require('services/geoStoreServiceV2');

const ISO = `SELECT ST_AsGeoJSON(st_makevalid({geom})) AS geojson, (ST_Area(geography({geom}))/10000) as area_ha, name_0 as name
        FROM gadm36_adm0
        WHERE gid_0 = UPPER('{{iso}}')`;

const ISO_NAME = `SELECT gid_0, name_0 as name
        FROM gadm36_adm0
        WHERE gid_0 in `;

const ID1 = `SELECT ST_AsGeoJSON(st_makevalid({geom})) AS geojson, (ST_Area(geography({geom}))/10000) as area_ha, name_1 as name
        FROM gadm36_adm1
        WHERE gid_1 = '{{id1}}'`;

const ID2 = `SELECT ST_AsGeoJSON(st_makevalid({geom})) AS geojson, (ST_Area(geography({geom}))/10000) as area_ha, name_2 as name
        FROM gadm36_adm2
        WHERE gid_2 = '{{id2}}'`;

const WDPA = `SELECT ST_AsGeoJSON(st_makevalid(p.the_geom)) AS geojson, (ST_Area(geography(the_geom))/10000) as area_ha
        FROM (
          SELECT CASE
          WHEN marine::numeric = 2 THEN NULL
            WHEN ST_NPoints(the_geom)<=18000 THEN the_geom
            WHEN ST_NPoints(the_geom) BETWEEN 18000 AND 50000 THEN ST_RemoveRepeatedPoints(the_geom, 0.001)
            ELSE ST_RemoveRepeatedPoints(the_geom, 0.005)
            END AS the_geom
          FROM wdpa_protected_areas
          WHERE wdpaid={{wdpaid}}
        ) p`;

const USE = `SELECT ST_AsGeoJSON(st_makevalid(the_geom)) AS geojson, (ST_Area(geography(the_geom))/10000) as area_ha
        FROM {{use}}
        WHERE cartodb_id = {{id}}`;

const SIMPLIFIED_USE = 
        `SELECT ST_Area(geography(the_geom))/10000 as area_ha, the_geom,
        CASE
            WHEN area_ha::numeric > 1e8 
            THEN st_asgeojson(st_makevalid(st_simplify(the_geom, 0.1)))
            WHEN area_ha::numeric > 1e6 
            THEN st_asgeojson(st_makevalid(st_simplify(the_geom, 0.005)))
            ELSE st_asgeojson(st_makevalid(the_geom))
        END AS geojson
        FROM {{use}}
        WHERE cartodb_id = {{id}}`;

const executeThunk = function(client, sql, params, thresh) {
    return function(callback) {
        sql = sql.replace('{geom}', thresh ? `ST_Simplify(the_geom, ${thresh})` : 'the_geom')
                 .replace('{geom}', thresh ? `ST_Simplify(the_geom, ${thresh})` : 'the_geom');
        logger.debug(Mustache.render(sql, params, thresh));
        client.execute(sql, params).done(function(data) {
            callback(null, data);
        }).error(function(err) {
            callback(err, null);
        });
    };
};

const deserializer = function(obj) {
    return function(callback) {
        new JSONAPIDeserializer({keyForAttribute: 'camelCase'}).deserialize(obj, callback);
    };
};

var parseSimplifyGeom = function(iso, id1, id2) {
    const bigCountries = ['USA', 'RUS', 'CAN', 'CHN', 'BRA', 'IDN'];
    let baseThresh = bigCountries.includes(iso) ? 0.1 : 0.005;
    if(iso && !id1 && !id2){
        return baseThresh;
    }
    else {
        return id1 && !id2 ? baseThresh / 10 : baseThresh / 100;
    }
  };


class CartoDBServiceV2 {

    constructor() {
        this.client = new CartoDB.SQL({
            user: config.get('cartoDB.user')
        });
    }

    * getNational(iso, thresh) {
        logger.debug('Request %s to carto', iso);
        let params = {
            'iso': iso.toUpperCase()
        };

        const simplifyThresh = parseSimplifyGeom(iso);

        if(thresh === true) {
            thresh = simplifyThresh;
        }

        logger.debug('Checking existing national geo');
        let existingGeo = yield GeoStoreServiceV2.getGeostoreByInfoProps({iso, simplifyThresh: thresh});
        logger.debug('Existed geo', existingGeo);
        if (existingGeo) {
          logger.debug('Return national geojson stored');
          return existingGeo;
        }

        let data = yield executeThunk(this.client, ISO, params, thresh);
        if (data.rows && data.rows.length > 0) {
          let result = data.rows[0];
          logger.debug('Saving national geostore');
          const geoData = {
            info : {
                iso: iso.toUpperCase(),
                name: result.name,
                gadm: '3.6',
                simplifyThresh
            }
          };
          existingGeo = yield GeoStoreServiceV2.saveGeostore(JSON.parse(result.geojson), geoData);
          logger.debug('Return national geojson from carto');
          return existingGeo;
        }
        return null;
    }

    * getNationalList(){
        logger.debug('Request national list names from carto');
        const countryList = yield GeoStoreServiceV2.getNationalList();
        const iso_values_map = countryList.map(el => {
            return el.info.iso;
        });
        let iso_values = '';
        iso_values_map.forEach(el => {
            iso_values += `'${el.toUpperCase()}', `;
        });
        iso_values = `(${iso_values.substr(0, iso_values.length-2)})`;
        let data = yield executeThunk(this.client, ISO_NAME+iso_values);
        if (data.rows && data.rows.length > 0) {
            logger.debug('Adding Country names');
            countryList.forEach(countryListElement => {
                let idx = data.rows.findIndex(el => {
                    return el.iso.toUpperCase() === countryListElement.info.iso.toUpperCase();
                });
                if (idx > -1) {
                    countryListElement.name = data.rows[idx].name;
                    data.rows.splice(idx, 1);
                    logger.debug(data.rows);
                }
            });
        }
        return countryList;
    }

    * getSubnational(iso, id1, thresh) {
      logger.debug('Obtaining subnational of iso %s and id1', iso, id1);
      let params = {
        id1: `${iso.toUpperCase()}.${parseInt(id1, 10)}_1`
      };

      const simplifyThresh = parseSimplifyGeom(iso, id1);
      if(thresh === true) {
          thresh = simplifyThresh;
      }

      logger.debug('Checking existing subnational geo');
      let existingGeo = yield GeoStoreServiceV2.getGeostoreByInfo({iso, id1, simplifyThresh});
      logger.debug('Existed geo', existingGeo);
      if (existingGeo) {
        logger.debug('Return subnational geojson stored');
        return existingGeo;
      }
   
      let data = yield executeThunk(this.client, ID1, params, thresh);
      logger.debug('Request subnational to carto');
      if (data.rows && data.rows.length > 0) {
        logger.debug('Return subnational geojson from carto');
        let result = data.rows[0];
        logger.debug('Saving national geostore');
        const geoData = {
          info: {
              iso: iso.toUpperCase(),
              name: result.name,
              id1: parseInt(id1, 10),
              gadm: '3.6',
              simplifyThresh
          }
        };
        existingGeo = yield GeoStoreServiceV2.saveGeostore(JSON.parse(result.geojson), geoData);
        return existingGeo;
      }
      return null;
    }

    * getRegional(iso, id1, id2, thresh) {
      logger.debug('Obtaining admin2 of iso %s, id1 and id2', iso, id1, id2);
      let params = {
        id2: `${iso.toUpperCase()}.${parseInt(id1, 10)}.${parseInt(id2, 10)}_1`
      };

      const simplifyThresh = parseSimplifyGeom(iso, id1, id2);
      if(thresh === true) {
          thresh = simplifyThresh;
      }

      logger.debug('Checking existing admin2 geostore');
      let existingGeo = yield GeoStoreServiceV2.getGeostoreByInfo({iso, id1, id2, simplifyThresh});
      logger.debug('Existed geo', existingGeo);
      if (existingGeo && !thresh) {
        logger.debug('Return admin2 geojson stored');
        return existingGeo;
      }

      logger.debug('Request admin2 shape from Carto');
      let data = yield executeThunk(this.client, ID2, params, thresh);
      if (data.rows && data.rows.length > 0) {
        logger.debug('Return admin2 geojson from Carto');
        let result = data.rows[0];
        logger.debug('Saving admin2 geostore');
        const geoData = {
            info: {
                iso: iso.toUpperCase(),
                id1: parseInt(id1, 10),
                id2: parseInt(id2, 10),
                name: result.name,
                gadm: '3.6',
                simplifyThresh
            }
        };
        existingGeo = yield GeoStoreServiceV2.saveGeostore(JSON.parse(result.geojson), geoData);
        return existingGeo;
      }
      return null;
    }

    * getUse(use, id, thresh) {
        logger.debug('Obtaining use with id %s', id);
        let params = {
          use: use,
          id: parseInt(id, 10)
        };
        let info = {
          use: params,
          simplify: thresh ? true : false
        };

        logger.debug('Checking existing use geo', info);
        let existingGeo = yield GeoStoreServiceV2.getGeostoreByInfo(info);
        logger.debug('Existed geo', existingGeo);
        if (existingGeo) {
          logger.debug('Return use geojson stored');
          return existingGeo;
        }

        const USE_SQL = thresh ? SIMPLIFIED_USE : USE;

        logger.debug('Request use to carto');
        let data = yield executeThunk(this.client, USE_SQL, params);

        if (data.rows && data.rows.length > 0) {
            let result = data.rows[0];
            logger.debug('Saving use geostore');
            const geoData = {
              info : info
            };
            existingGeo = yield GeoStoreServiceV2.saveGeostore(JSON.parse(result.geojson), geoData);
            logger.debug('Return use geojson from carto');
            return existingGeo;
        }
        return null;
    }

    * getWdpa(wdpaid) {
        logger.debug('Obtaining wpda of id %s', wdpaid);

        let params = {
          wdpaid: parseInt(wdpaid, 10)
        };

        logger.debug('Checking existing wdpa geo');
        let existingGeo = yield GeoStoreServiceV2.getGeostoreByInfo(params);
        logger.debug('Existed geo', existingGeo);
        if (existingGeo) {
          logger.debug('Return wdpa geojson stored');
          return existingGeo;
        }

        logger.debug('Request wdpa to carto');
        let data = yield executeThunk(this.client, WDPA, params);
        if (data.rows && data.rows.length > 0) {
            let result = data.rows[0];
            logger.debug('Saving national geostore');
            const geoData = {
              info : params
            };
            existingGeo = yield GeoStoreServiceV2.saveGeostore(JSON.parse(result.geojson), geoData);
            logger.debug('Return wdpa geojson from carto');
            return existingGeo;
        }
        return null;
    }

    * getGeostore(hashGeoStore) {
        logger.debug('Obtaining geostore with hash %s', hashGeoStore);
        let result = yield require('vizz.microservice-client').requestToMicroservice({
            uri: '/geostore/' + hashGeoStore,
            method: 'GET',
            json: true
        });
        if (result.statusCode !== 200) {
            console.error('Error obtaining geostore:');
            console.error(result);
            return null;
        }
        let geostore = yield deserializer(result.body);
        if (geostore) {
            return geostore;
        }
        return null;
    }
}

module.exports = new CartoDBServiceV2();
