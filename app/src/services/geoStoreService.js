const logger = require('logger');
const GeoStore = require('models/geoStore');
const GeoJSONConverter = require('converters/geoJSONConverter');
const md5 = require('md5');
const CartoDB = require('cartodb');
const IdConnection = require('models/idConnection');
const turf = require('turf');
const ProviderNotFound = require('errors/providerNotFound');
const GeoJSONNotFound = require('errors/geoJSONNotFound');
const UnknownGeometry = require('errors/unknownGeometry');
const config = require('config');

const CARTO_PROVIDER = 'carto';

const executeThunk = (client, sql, params) => new Promise(((resolve, reject) => {
    client.execute(sql, params).done((data) => {
        resolve(data);
    }).error((err) => {
        reject(err[0]);
    });
}));

class GeoStoreService {

    static getGeometryType(geojson) {
        logger.debug('Get geometry type');
        logger.debug('Geometry type: %s', geojson.type);

        if (geojson.type === 'Point' || geojson.type === 'MultiPoint') {
            return 1;
        }
        if (geojson.type === 'LineString' || geojson.type === 'MultiLineString') {
            return 2;
        }
        if (geojson.type === 'Polygon' || geojson.type === 'MultiPolygon') {
            return 3;
        }
        throw new UnknownGeometry(`Unknown geometry type: ${geojson.type}`);
    }

    static async repairGeometry(geojson) {
        try {

            logger.debug('GeoJSON: %s', JSON.stringify(geojson));

            const geometryType = GeoStoreService.getGeometryType(geojson);
            logger.debug('Geometry type: %s', JSON.stringify(geometryType));

            logger.debug('Repair geoJSON geometry');
            logger.debug('Generating query');
            const sql = `SELECT ST_AsGeoJson(ST_CollectionExtract(st_MakeValid(ST_GeomFromGeoJSON('${JSON.stringify(geojson)}')),${geometryType})) as geojson`;

            if (process.env.NODE_ENV !== 'test' || sql.length < 2000) {
                logger.debug('SQL to repair geojson: %s', sql);
            }

            const client = new CartoDB.SQL({
                user: config.get('cartoDB.user')
            });
            const data = await executeThunk(client, sql, {});
            if (data.rows && data.rows.length === 1) {
                data.rows[0].geojson = JSON.parse(data.rows[0].geojson);
                logger.debug(data.rows[0].geojson);
                return data.rows[0];
            }
            throw new GeoJSONNotFound('No Geojson returned');
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }

    static async obtainGeoJSONOfCarto(table, user, filter) {
        logger.debug('Obtaining geojson with params: table %s, user %s, filter %s', table, user, filter);
        logger.debug('Generating query');
        const sql = `SELECT ST_AsGeoJson(the_geom) as geojson, (ST_Area(geography(the_geom))/10000) as area_ha FROM ${table} WHERE ${filter}`;
        logger.debug('SQL to obtain geojson: %s', sql);
        const client = new CartoDB.SQL({
            user
        });
        const data = await client.execute(sql, {});
        if (data.rows && data.rows.length === 1) {
            data.rows[0].geojson = JSON.parse(data.rows[0].geojson);
            logger.debug(data.rows[0].geojson);
            return data.rows[0];
        }
        throw new GeoJSONNotFound('Geojson not found');
    }

    static async getNewHash(hash) {
        const idCon = await IdConnection.findOne({ oldId: hash }).exec();
        if (!idCon) {
            return hash;
        }
        return idCon.hash;
    }

    static async getGeostoreById(id) {
        logger.debug(`Getting geostore by id ${id}`);
        const hash = await GeoStoreService.getNewHash(id);
        logger.debug('hash', hash);
        const geoStore = await GeoStore.findOne({ hash }, { 'geojson._id': 0, 'geojson.features._id': 0 });
        if (geoStore) {
            logger.debug('geostore', JSON.stringify(geoStore.geojson));
            return geoStore;
        }
        return null;
    }

    static async getMultipleGeostores(ids) {
        logger.debug(`Getting geostores with ids: ${ids}`);
        const hashes = await Promise.all(ids.map(GeoStoreService.getNewHash));
        const query = { hash: { $in: hashes } };
        const geoStores = await GeoStore.find(query);

        if (geoStores && geoStores.length > 0) {
            return geoStores;
        }
        return null;
    }

    static async getNationalList() {
        logger.debug('Obtaining national list from database');
        const query = {
            'info.iso': { $ne: null },
            'info.id1': null
        };
        const select = 'hash info.iso';
        return GeoStore.find(query, select);
    }

    static async getGeostoreByInfoProps(infoQuery) {
        const geoStore = await GeoStore.findOne(infoQuery);
        return geoStore;
    }

    static async getGeostoreByInfo(info) {
        const geoStore = await GeoStore.findOne({ info });
        return geoStore;
    }

    static async obtainGeoJSON(provider) {
        logger.debug('Obtaining geojson of provider', provider);
        switch (provider.type) {

            case CARTO_PROVIDER:
                return GeoStoreService.obtainGeoJSONOfCarto(provider.table, provider.user, provider.filter);
            default:
                logger.error('Provider not found');
                throw new ProviderNotFound(`Provider ${provider.type} not found`);

        }
    }

    static async calculateBBox(geoStore) {
        logger.debug('Calculating bbox');
        geoStore.bbox = turf.bbox(geoStore.geojson);
        await geoStore.save();
        return geoStore;
    }

    static async saveGeostore(geojson, data) {
        const geoStore = {
            geojson
        };

        if (data && data.provider) {
            const geoJsonObtained = await GeoStoreService.obtainGeoJSON(data.provider);
            geoStore.geojson = geoJsonObtained.geojson;
            geoStore.areaHa = geoJsonObtained.area_ha;
            geoStore.provider = {
                type: data.provider.type,
                table: data.provider.table,
                user: data.provider.user,
                filter: data.provider.filter
            };
        }

        let props;
        const geomType = geoStore.geojson.type || null;
        if (geomType && geomType === 'FeatureCollection') {
            logger.info('Preserving FeatureCollection properties.');
            props = geoStore.geojson.features[0].properties || null;
        } else if (geomType && geomType === 'Feature') {
            logger.info('Preserving Feature properties.');
            props = geoStore.geojson.properties || null;
        } else {
            logger.info('Preserving Geometry properties.');
            props = geoStore.geojson.properties || null;
        }
        logger.debug('Props', JSON.stringify(props));

        if (data && data.info) {
            geoStore.info = data.info;
        }
        geoStore.lock = data.lock || false;

        logger.debug('Fix and convert geojson');
        logger.debug('Converting', JSON.stringify(geoStore.geojson));

        const geoJsonObtained = await GeoStoreService.repairGeometry(GeoJSONConverter.getGeometry(geoStore.geojson));
        geoStore.geojson = geoJsonObtained.geojson;

        logger.debug('Repaired geometry', JSON.stringify(geoStore.geojson));
        logger.debug('Make Feature Collection');
        geoStore.geojson = GeoJSONConverter.makeFeatureCollection(geoStore.geojson, props);
        logger.debug('Result', JSON.stringify(geoStore.geojson));
        logger.debug('Creating hash from geojson md5');
        geoStore.hash = md5(JSON.stringify(geoStore.geojson));
        if (geoStore.areaHa === undefined) {
            geoStore.areaHa = turf.area(geoStore.geojson) / 10000; // convert to ha2
        }
        await GeoStore.findOne({
            hash: geoStore.hash
        });
        if (!geoStore.bbox) {
            geoStore.bbox = turf.bbox(geoStore.geojson);
        }

        return GeoStore.findOneAndUpdate({ hash: geoStore.hash }, geoStore, {
            upsert: true,
            new: true,
            runValidators: true,
            projection: {
                'geojson._id': 0,
                'geojson.features._id': 0
            }
        });
    }

    static async calculateArea(geojson, data) {

        const geoStore = {
            geojson
        };

        if (data && data.provider) {
            const geoJsonObtained = await GeoStoreService.obtainGeoJSON(data.provider);
            geoStore.geojson = geoJsonObtained.geojson;
            geoStore.areaHa = geoJsonObtained.area_ha;
        }

        logger.debug('Converting geojson');
        logger.debug('Converting', JSON.stringify(geoStore.geojson));
        geoStore.geojson = GeoJSONConverter.makeFeatureCollection(geoStore.geojson);
        logger.debug('Result', JSON.stringify(geoStore.geojson));
        geoStore.areaHa = turf.area(geoStore.geojson) / 10000; // convert to ha2
        geoStore.bbox = turf.bbox(geoStore.geojson);

        return geoStore;

    }

}

module.exports = GeoStoreService;
