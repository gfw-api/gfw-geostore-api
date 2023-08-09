/* eslint-disable max-len */
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

describe('Geostore v2 tests - Get geostore - SubRegional (admin-2) level', () => {

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

    it('Get subregion that doesn\'t exist should return a 404', async () => {
        mockValidateRequestWithApiKey({});
        nock(`https://${process.env.CARTODB_USER}.cartodb.com`)
            .get('/api/v2/sql')
            .query({
                q: 'SELECT ST_AsGeoJSON(ST_MAKEVALID(ST_Simplify(the_geom, 0.005))) AS geojson, area_ha, name_2 as name\n        FROM gadm36_adm2\n        WHERE gid_2 = \'AAA.1.1_1\''
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
            .get(`/api/v2/geostore/admin/AAA/1/1?simplify=0.005`)
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(404);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('status').and.equal(404);
        response.body.errors[0].should.have.property('detail').and.equal('Location does not exist.');
    });

    it('Get subregion that exists should return a 200', async () => {
        mockValidateRequestWithApiKey({});
        nock(`https://${process.env.CARTODB_USER}.cartodb.com`)
            .get('/api/v2/sql')
            .query({
                q: 'SELECT ST_AsGeoJSON(ST_MAKEVALID(ST_Simplify(the_geom, 0.005))) AS geojson, area_ha, name_2 as name\n        FROM gadm36_adm2\n        WHERE gid_2 = \'GBR.1.1_1\''
            })
            .reply(200, {
                rows: [{
                    geojson: '{"type": "MultiPolygon", "coordinates": [ [ [ [ -1.78996992, 53.47292709 ], [ -1.795555, 53.49694061 ], [ -1.81611097, 53.51610947 ], [ -1.80666602, 53.53194046 ], [ -1.77166796, 53.53527069 ], [ -1.71472299, 53.55472183 ], [ -1.67444599, 53.54999924 ], [ -1.61527801, 53.5633316 ], [ -1.58416796, 53.59777069 ], [ -1.56055605, 53.60667038 ], [ -1.53527796, 53.59360886 ], [ -1.37547255, 53.59835052 ], [ -1.35688055, 53.56272888 ], [ -1.30618405, 53.53486633 ], [ -1.30653143, 53.51360703 ], [ -1.33669162, 53.49596405 ], [ -1.36181271, 53.49150467 ], [ -1.41347778, 53.44810104 ], [ -1.40317249, 53.42793655 ], [ -1.4153924, 53.42136002 ], [ -1.44422317, 53.45098114 ], [ -1.4484477, 53.46956635 ], [ -1.48384893, 53.47826385 ], [ -1.48939252, 53.47064209 ], [ -1.53735459, 53.46238708 ], [ -1.5420723, 53.47199631 ], [ -1.57650959, 53.48079681 ], [ -1.6727581, 53.49085617 ], [ -1.70368445, 53.48768616 ], [ -1.72925007, 53.46931458 ], [ -1.78996992, 53.47292709 ] ] ] ]}',
                    area_ha: 35086.93865282212,
                    name: 'Barnsley'
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
            .get(`/api/v2/geostore/admin/GBR/1/1?simplify=0.005`)
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('geoStore');
        response.body.data.should.have.property('id').and.a('string');
        response.body.data.should.have.property('attributes').and.be.an('object');

        response.body.data.attributes.should.have.property('areaHa').and.equal(35086.93865282212);
        response.body.data.attributes.should.have.property('bbox').and.be.an('array');
        response.body.data.attributes.should.have.property('geojson').and.be.an('object');
        response.body.data.attributes.should.have.property('hash').and.be.a('string');
        response.body.data.attributes.should.have.property('info').and.be.an('object');

        response.body.data.attributes.info.should.have.property('gadm').and.equal('3.6');
        response.body.data.attributes.info.should.have.property('iso').and.equal('GBR');
        response.body.data.attributes.info.should.have.property('id1').and.equal(1);
        response.body.data.attributes.info.should.have.property('id2').and.equal(1);
        response.body.data.attributes.info.should.have.property('simplifyThresh').and.equal(0.005);
        response.body.data.attributes.info.should.have.property('name');
    });

    it('Get a subregion that has been saved to the local database should return a 200', async () => {
        mockValidateRequestWithApiKey({});
        await createGeostore(JSON.parse(fs.readFileSync(path.join(__dirname, 'resources', 'GBR-1-1-geom.json'))));

        const response = await requester
            .get(`/api/v2/geostore/admin/GBR/1/1?simplify=0.005`)
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('geoStore');
        response.body.data.should.have.property('id').and.a('string');
        response.body.data.should.have.property('attributes').and.be.an('object');

        response.body.data.attributes.should.have.property('areaHa').and.equal(35086.9386528221);
        response.body.data.attributes.should.have.property('bbox').and.be.an('array');
        response.body.data.attributes.should.have.property('geojson').and.be.an('object');
        response.body.data.attributes.should.have.property('hash').and.be.a('string');
        response.body.data.attributes.should.have.property('info').and.be.an('object');

        response.body.data.attributes.info.should.have.property('gadm').and.equal('3.6');
        response.body.data.attributes.info.should.have.property('iso').and.equal('GBR');
        response.body.data.attributes.info.should.have.property('id1').and.equal(1);
        response.body.data.attributes.info.should.have.property('id2').and.equal(1);
        response.body.data.attributes.info.should.have.property('simplifyThresh').and.equal(0.005);
        response.body.data.attributes.info.should.have.property('name');
    });

    afterEach(async () => {
        await GeoStore.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
