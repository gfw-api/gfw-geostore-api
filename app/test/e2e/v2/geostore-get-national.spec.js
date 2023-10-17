const nock = require('nock');
const chai = require('chai');
const config = require('config');
const GeoStore = require('models/geoStore');
const fs = require('fs');
const path = require('path');
const { getTestServer } = require('../utils/test-server');
const { createGeostore } = require('../utils/utils');
const { mockValidateRequestWithApiKey } = require('../utils/mock');

chai.should();

let requester;
nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Geostore v2 tests - Get geostore - National level', () => {

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
            .query({
                q: 'SELECT ST_AsGeoJSON(ST_MAKEVALID(ST_Simplify(the_geom, 0.005))) AS geojson, area_ha, name_0 as name\n        FROM gadm36_countries\n        WHERE gid_0 = UPPER(\'AAA\')'
            })
            .reply(200, {
                rows: [],
                time: 0.349,
                fields: {
                    geojson: {
                        type: 'string'
                    },
                    area_ha: {
                        type: 'number'
                    },
                    name: {
                        type: 'string'
                    }
                },
                total_rows: 0
            });

        const response = await requester
            .get(`/api/v2/geostore/admin/AAA`)
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
            .query({
                q: 'SELECT ST_AsGeoJSON(ST_MAKEVALID(ST_Simplify(the_geom, 0.005))) AS geojson, area_ha, name_0 as name\n        FROM gadm36_countries\n        WHERE gid_0 = UPPER(\'MCO\')'
            })
            .reply(200, {
                rows: [{
                    geojson: '{"type":"MultiPolygon","coordinates":[[[[7.4134,43.7346],[7.4396,43.7492],[7.4179,43.7226],[7.4095,43.7299],[7.4134,43.7346]]]]}',
                    area_ha: 235.490994944,
                    name: 'Monaco'
                }],
                time: 0.002,
                fields: {
                    geojson: {
                        type: 'string'
                    },
                    area_ha: {
                        type: 'number'
                    },
                    name: {
                        type: 'string'
                    }
                },
                total_rows: 1
            });

        const response = await requester
            .get(`/api/v2/geostore/admin/MCO?simplify=0.005`)
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('geoStore');
        response.body.data.should.have.property('id').and.a('string');
        response.body.data.should.have.property('attributes').and.be.an('object');

        response.body.data.attributes.should.have.property('areaHa').and.equal(200.60179285554386);
        response.body.data.attributes.should.have.property('bbox').and.be.an('array');
        response.body.data.attributes.should.have.property('geojson').and.be.an('object');
        response.body.data.attributes.should.have.property('hash').and.be.a('string');
        response.body.data.attributes.should.have.property('info').and.be.an('object');

        response.body.data.attributes.info.should.have.property('gadm').and.equal('3.6');
        response.body.data.attributes.info.should.have.property('iso').and.equal('MCO');
        response.body.data.attributes.info.should.have.property('simplifyThresh').and.equal(0.005);
        response.body.data.attributes.info.should.have.property('name');
    });

    it('Get country that has been saved to the local database should return a 200', async () => {
        mockValidateRequestWithApiKey({});
        await createGeostore({
            hash: 'f6bed9bc97c8672f76d213632ec1e51a',
            areaHa: 200.60179285554386,
            bbox: [
                7.4095,
                43.7226,
                7.4396,
                43.7492
            ],
            geojson: {
                type: 'FeatureCollection',
                features: [
                    {
                        geometry: {
                            coordinates: [
                                [
                                    [
                                        [
                                            7.4134,
                                            43.7346
                                        ],
                                        [
                                            7.4396,
                                            43.7492
                                        ],
                                        [
                                            7.4179,
                                            43.7226
                                        ],
                                        [
                                            7.4095,
                                            43.7299
                                        ],
                                        [
                                            7.4134,
                                            43.7346
                                        ]
                                    ]
                                ]
                            ],
                            type: 'MultiPolygon'
                        },
                        type: 'Feature',
                        properties: null
                    }
                ]
            },
            info: {
                iso: 'MCO',
                name: 'Monaco',
                gadm: '3.6',
                simplifyThresh: 0.005
            },
            lock: false
        });

        const response = await requester
            .get(`/api/v2/geostore/admin/MCO?simplify=0.005`)
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('geoStore');
        response.body.data.should.have.property('id').and.a('string');
        response.body.data.should.have.property('attributes').and.be.an('object');

        response.body.data.attributes.should.have.property('areaHa').and.equal(200.60179285554386);
        response.body.data.attributes.should.have.property('bbox').and.be.an('array');
        response.body.data.attributes.should.have.property('geojson').and.be.an('object');
        response.body.data.attributes.should.have.property('hash').and.be.a('string');
        response.body.data.attributes.should.have.property('info').and.be.an('object');

        response.body.data.attributes.info.should.have.property('gadm').and.equal('3.6');
        response.body.data.attributes.info.should.have.property('iso').and.equal('MCO');
        response.body.data.attributes.info.should.have.property('simplifyThresh').and.equal(0.005);
        response.body.data.attributes.info.should.have.property('name');
    });

    it('Get complex country that exists should return a 200', async () => {
        mockValidateRequestWithApiKey({});
        await createGeostore(JSON.parse(fs.readFileSync(path.join(__dirname, 'resources', 'USA-geom.json'))));

        nock(`https://${process.env.CARTODB_USER}.cartodb.com`, {
            encodedQueryParams: true
        })
            .get('/api/v2/sql')
            .query({
                q: 'SELECT ST_AsGeoJSON(ST_MAKEVALID(ST_Simplify(the_geom, 0.005))) AS geojson, area_ha, name_0 as name\n        FROM gadm36_countries\n        WHERE gid_0 = UPPER(\'USA\')'
            })
            .reply(200, JSON.parse(fs.readFileSync(path.join(__dirname, 'resources', 'USA-request-one-reply.json'))));

        const response = await requester
            .get(`/api/v2/geostore/admin/USA?simplify=0.005`)
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(200);
    });

    afterEach(async () => {
        await GeoStore.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
