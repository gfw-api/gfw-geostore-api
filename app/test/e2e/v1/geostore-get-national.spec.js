/* eslint-disable max-len */
const nock = require('nock');
const chai = require('chai');
const config = require('config');
const GeoStore = require('models/geoStore');

const { createGeostore } = require('../utils/utils');
const { getTestServer } = require('../utils/test-server');
const { mockValidateRequestWithApiKey } = require('../utils/mock');

chai.should();

let requester;
nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Geostore v1 tests - Get geostore - National level', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
        if (config.get('cartoDB.user') === null) {
            throw Error(`Carto user not set - please specify a CARTODB_USER env var with it.`);
        }

        requester = await getTestServer();

        await GeoStore.deleteMany({}).exec();

        nock.cleanAll();
    });

    it('Get country that doesn\'t exist should return a 404', async () => {
        mockValidateRequestWithApiKey({});

        nock(`https://${process.env.CARTODB_USER}.cartodb.com`)
            .get('/api/v2/sql')
            .query({ q: 'SELECT ST_AsGeoJSON(st_makevalid(the_geom)) AS geojson, (ST_Area(geography(the_geom))/10000) as area_ha, name_0 as name\n        FROM gadm2_countries_simple\n        WHERE iso = UPPER(\'AAA\')' })
            .reply(200, {
                rows: [],
                time: 0.002,
                fields: {
                    geojson: { type: 'string' },
                    area_ha: { type: 'number' },
                    name: { type: 'string' }
                },
                total_rows: 0
            });

        const response = await requester
            .get(`/api/v1/geostore/admin/AAA`)
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(404);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('status').and.equal(404);
        response.body.errors[0].should.have.property('detail').and.equal('Country not found');
    });

    it('Get country that exists should return a 200', async () => {
        mockValidateRequestWithApiKey({});

        nock(`https://${process.env.CARTODB_USER}.cartodb.com`)
            .get('/api/v2/sql')
            .query({ q: 'SELECT ST_AsGeoJSON(st_makevalid(the_geom)) AS geojson, (ST_Area(geography(the_geom))/10000) as area_ha, name_0 as name\n        FROM gadm2_countries_simple\n        WHERE iso = UPPER(\'MCO\')' })
            .reply(200, {
                rows: [{
                    geojson: '{"type":"MultiPolygon","coordinates":[[[[7.44013786315929,43.7493057250977],[7.4397549629212,43.7493057250977],[7.44013786315929,43.74951171875],[7.44013786315929,43.7493057250977]]],[[[7.44041585922241,43.7495841979982],[7.44027185440069,43.7495841979982],[7.44041538238537,43.7496604919434],[7.44041585922241,43.7495841979982]]],[[[7.43630027771002,43.750888824463],[7.43958187103283,43.7459716796876],[7.43541622161877,43.7462501525879],[7.43014001846313,43.7376403808593],[7.42347288131714,43.7359733581546],[7.42847204208374,43.7312507629394],[7.4148612022401,43.7229156494142],[7.41562128067017,43.7257347106935],[7.40952730178827,43.729866027832],[7.43630027771002,43.750888824463]]]]}',
                    area_ha: 205.628911552059,
                    name: 'Monaco'
                }],
                time: 0.004,
                fields: {
                    geojson: { type: 'string' },
                    area_ha: { type: 'number' },
                    name: { type: 'string' }
                },
                total_rows: 1
            });

        nock(`https://${process.env.CARTODB_USER}.cartodb.com`)
            .get('/api/v2/sql')
            .query({ q: 'SELECT ST_AsGeoJson(ST_CollectionExtract(st_MakeValid(ST_GeomFromGeoJSON(\'{"type":"MultiPolygon","coordinates":[[[[7.44013786315929,43.7493057250977],[7.4397549629212,43.7493057250977],[7.44013786315929,43.74951171875],[7.44013786315929,43.7493057250977]]],[[[7.44041585922241,43.7495841979982],[7.44027185440069,43.7495841979982],[7.44041538238537,43.7496604919434],[7.44041585922241,43.7495841979982]]],[[[7.43630027771002,43.750888824463],[7.43958187103283,43.7459716796876],[7.43541622161877,43.7462501525879],[7.43014001846313,43.7376403808593],[7.42347288131714,43.7359733581546],[7.42847204208374,43.7312507629394],[7.4148612022401,43.7229156494142],[7.41562128067017,43.7257347106935],[7.40952730178827,43.729866027832],[7.43630027771002,43.750888824463]]]]}\')),3)) as geojson' })
            .reply(200, {
                rows: [{ geojson: '{"type":"MultiPolygon","coordinates":[[[[7.44013786315929,43.7493057250977],[7.4397549629212,43.7493057250977],[7.44013786315929,43.74951171875],[7.44013786315929,43.7493057250977]]],[[[7.44041585922241,43.7495841979982],[7.44027185440069,43.7495841979982],[7.44041538238537,43.7496604919434],[7.44041585922241,43.7495841979982]]],[[[7.43630027771002,43.750888824463],[7.43958187103283,43.7459716796876],[7.43541622161877,43.7462501525879],[7.43014001846313,43.7376403808593],[7.42347288131714,43.7359733581546],[7.42847204208374,43.7312507629394],[7.4148612022401,43.7229156494142],[7.41562128067017,43.7257347106935],[7.40952730178827,43.729866027832],[7.43630027771002,43.750888824463]]]]}' }],
                time: 0.002,
                fields: { geojson: { type: 'string' } },
                total_rows: 1
            });

        const response = await requester
            .get(`/api/v1/geostore/admin/MCO`)
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('geoStore');
        response.body.data.should.have.property('id').and.a('string');
        response.body.data.should.have.property('attributes').and.be.an('object');

        response.body.data.attributes.should.have.property('areaHa').and.equal(205.64210228373287);
        response.body.data.attributes.should.have.property('bbox').and.be.an('array');
        response.body.data.attributes.should.have.property('geojson').and.be.an('object');
        response.body.data.attributes.should.have.property('hash').and.be.a('string');
        response.body.data.attributes.should.have.property('info').and.be.an('object');

        response.body.data.attributes.info.should.have.property('gadm').and.equal('2.8');
        response.body.data.attributes.info.should.have.property('iso').and.equal('MCO');
        response.body.data.attributes.info.should.have.property('name');
    });

    it('Get country that has been saved to the local database should return a 200', async () => {
        mockValidateRequestWithApiKey({});
        await createGeostore({
            areaHa: 205.64210228373287,
            bbox: [],
            info: {
                iso: 'MCO', id1: null, id2: null, gadm: '2.8'
            }
        });
        const response = await requester
            .get(`/api/v1/geostore/admin/MCO`)
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('geoStore');
        response.body.data.should.have.property('id').and.a('string');
        response.body.data.should.have.property('attributes').and.be.an('object');

        response.body.data.attributes.should.have.property('areaHa').and.equal(205.64210228373287);
        response.body.data.attributes.should.have.property('bbox').and.be.an('array');
        response.body.data.attributes.should.have.property('geojson').and.be.an('object');
        response.body.data.attributes.should.have.property('hash').and.be.a('string');
        response.body.data.attributes.should.have.property('info').and.be.an('object');

        response.body.data.attributes.info.should.have.property('gadm').and.equal('2.8');
        response.body.data.attributes.info.should.have.property('iso').and.equal('MCO');

    });

    afterEach(async () => {
        await GeoStore.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
