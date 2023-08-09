/* eslint-disable max-len */
const nock = require('nock');
const chai = require('chai');
const config = require('config');

const { getTestServer } = require('../utils/test-server');
const { mockValidateRequestWithApiKey } = require('../utils/mock');

chai.should();

let requester;
nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Geostore v2 tests - Create geostores', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
        if (config.get('cartoDB.user') === null) {
            throw Error(`Carto user not set - please specify a CARTODB_USER env var with it.`);
        }

        requester = await getTestServer();

        nock.cleanAll();
    });

    it('Create a geostore an invalid geometry type should fail', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester
            .post(`/api/v2/geostore`)
            .set('x-api-key', 'api-key-test')
            .send({
                geojson: {
                    type: 'InvalidGeometryType'
                }
            });

        response.status.should.equal(400);

        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].status.should.equal(400);
        response.body.errors[0].detail.should.equal('The type InvalidGeometryType is unknown');
    });

    it('Create a geostore with points should be successful', async () => {
        mockValidateRequestWithApiKey({});
        nock(`https://${config.get('cartoDB.user')}.cartodb.com:443`)
            .get('/api/v2/sql')
            .query(
                { q: 'SELECT ST_AsGeoJson(ST_CollectionExtract(st_MakeValid(ST_GeomFromGeoJSON(\'{"type":"MultiPoint","coordinates":[[14.26438308756265,14.062500000000002],[5.266007882805498,2.8125],[44.84029065139799,16.523437500000004],[-7.362466865535738,-3.1640625000000004],[3.1640625,17.644022027872726],[3.1640625,45.82879925192134],[20.0390625,47.517200697839414],[40.078125,36.59788913307022],[-85.4296875,52.05249047600099],[-62.578125,-12.897489183755892],[-9.31640625,25.799891182088334],[-85.078125,37.16031654673677],[-102.65625,48.574789910928864],[34.27734375,57.79794388498275],[21.26953125,-29.688052749856787],[-40.4296875,-8.754794702435618],[-71.54296874999999,2.81137119333114],[-102.48046875,23.885837699862005],[-69.43359375,53.014783245859235],[45.87890625,18.812717856407776],[-4.74609375,40.446947059600475],[-4.04296875,39.232253141714885]]}\')),1)) as geojson' }
            )
            .reply(200, {
                rows: [{ geojson: '{"type":"MultiPoint","coordinates":[[14.26438308756265,14.062500000000002],[5.266007882805498,2.8125],[44.84029065139799,16.523437500000004],[-7.362466865535738,-3.1640625000000004],[3.1640625,17.644022027872726],[3.1640625,45.82879925192134],[20.0390625,47.517200697839414],[40.078125,36.59788913307022],[-85.4296875,52.05249047600099],[-62.578125,-12.897489183755892],[-9.31640625,25.799891182088334],[-85.078125,37.16031654673677],[-102.65625,48.574789910928864],[34.27734375,57.79794388498275],[21.26953125,-29.688052749856787],[-40.4296875,-8.754794702435618],[-71.54296874999999,2.81137119333114],[-102.48046875,23.885837699862005],[-69.43359375,53.014783245859235],[45.87890625,18.812717856407776],[-4.74609375,40.446947059600475],[-4.04296875,39.232253141714885]]}' }],
                time: 0.09,
                fields: { geojson: { type: 'string' } },
                total_rows: 1
            });

        const response = await requester
            .post(`/api/v2/geostore`)
            .set('x-api-key', 'api-key-test')
            .send({
                geojson: {
                    type: 'FeatureCollection',
                    features: [{
                        type: 'Feature',
                        properties: {
                            some: 'property'
                        },
                        geometry: {
                            type: 'MultiPoint',
                            coordinates: [
                                [
                                    14.26438308756265,
                                    14.062500000000002
                                ],
                                [
                                    5.266007882805498,
                                    2.8125
                                ],
                                [
                                    44.84029065139799,
                                    16.523437500000004
                                ],
                                [
                                    -7.362466865535738,
                                    -3.1640625000000004
                                ],
                                [
                                    3.1640625,
                                    17.644022027872726
                                ],
                                [
                                    3.1640625,
                                    45.82879925192134
                                ],
                                [
                                    20.0390625,
                                    47.517200697839414
                                ],
                                [
                                    40.078125,
                                    36.59788913307022
                                ],
                                [
                                    -85.4296875,
                                    52.05249047600099
                                ],
                                [
                                    -62.578125,
                                    -12.897489183755892
                                ],
                                [
                                    -9.31640625,
                                    25.799891182088334
                                ],
                                [
                                    -85.078125,
                                    37.16031654673677
                                ],
                                [
                                    -102.65625,
                                    48.574789910928864
                                ],
                                [
                                    34.27734375,
                                    57.79794388498275
                                ],
                                [
                                    21.26953125,
                                    -29.688052749856787
                                ],
                                [
                                    -40.4296875,
                                    -8.754794702435618
                                ],
                                [
                                    -71.54296874999999,
                                    2.81137119333114
                                ],
                                [
                                    -102.48046875,
                                    23.885837699862005
                                ],
                                [
                                    -69.43359375,
                                    53.014783245859235
                                ],
                                [
                                    45.87890625,
                                    18.812717856407776
                                ],
                                [
                                    -4.74609375,
                                    40.446947059600475
                                ],
                                [
                                    -4.04296875,
                                    39.232253141714885
                                ]
                            ]
                        }
                    }]
                }
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('geoStore');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('geojson').and.be.an('object');
        response.body.data.attributes.should.have.property('hash').and.be.a('string');
        response.body.data.attributes.should.have.property('provider').and.be.an('object');
        response.body.data.attributes.should.have.property('bbox').and.be.an('array');
        response.body.data.attributes.should.have.property('areaHa').and.be.an('number');
        response.body.data.attributes.should.have.property('lock').and.be.a('boolean');
        response.body.data.attributes.should.have.property('info').and.be.an('object');

        response.body.data.attributes.geojson.should.have.property('features').and.be.an('array').and.length(1);
        response.body.data.attributes.geojson.should.have.property('crs').and.be.an('object');
        response.body.data.attributes.geojson.should.have.property('type').and.equal('FeatureCollection');

        response.body.data.attributes.geojson.features[0].should.have.property('properties');
        response.body.data.attributes.geojson.features[0].should.have.property('type').and.equal('Feature');
        response.body.data.attributes.geojson.features[0].should.have.property('geometry').and.be.an('object');

        response.body.data.attributes.geojson.features[0].geometry.should.have.property('type').and.be.a('string');
        response.body.data.attributes.geojson.features[0].geometry.should.have.property('coordinates').and.be.an('array').and.not.length(0);
    });

    it('Create a geostore providing a provider definition should return a 200 OK response with the created geostore', async () => {
        mockValidateRequestWithApiKey({});
        nock(`https://wri-01.cartodb.com:443`).get('/api/v2/sql')
            .query(() => true)
            .reply(200, {
                rows: [{ geojson: '{"type":"MultiPoint","coordinates":[[14.26438308756265,14.062500000000002],[5.266007882805498,2.8125],[44.84029065139799,16.523437500000004],[-7.362466865535738,-3.1640625000000004],[3.1640625,17.644022027872726],[3.1640625,45.82879925192134],[20.0390625,47.517200697839414],[40.078125,36.59788913307022],[-85.4296875,52.05249047600099],[-62.578125,-12.897489183755892],[-9.31640625,25.799891182088334],[-85.078125,37.16031654673677],[-102.65625,48.574789910928864],[34.27734375,57.79794388498275],[21.26953125,-29.688052749856787],[-40.4296875,-8.754794702435618],[-71.54296874999999,2.81137119333114],[-102.48046875,23.885837699862005],[-69.43359375,53.014783245859235],[45.87890625,18.812717856407776],[-4.74609375,40.446947059600475],[-4.04296875,39.232253141714885]]}' }],
                time: 0.09,
                fields: { geojson: { type: 'string' } },
                total_rows: 1
            });

        const response = await requester
            .post(`/api/v2/geostore`)
            .set('x-api-key', 'api-key-test')
            .send({
                provider: {
                    type: 'carto',
                    table: 'gfw_mining',
                    user: 'wri-01',
                    filter: 'cartodb_id=573'
                }
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('geoStore');
        response.body.data.should.have.property('attributes').and.be.an('object');
        response.body.data.attributes.should.have.property('geojson').and.be.an('object');
        response.body.data.attributes.should.have.property('hash').and.be.a('string');
        response.body.data.attributes.should.have.property('provider').and.be.an('object');
        response.body.data.attributes.should.have.property('bbox').and.be.an('array');
        response.body.data.attributes.should.have.property('areaHa').and.be.an('number');
        response.body.data.attributes.should.have.property('lock').and.be.a('boolean');
        response.body.data.attributes.should.have.property('info').and.be.an('object');

        response.body.data.attributes.provider.should.have.property('type').and.equal('carto');
        response.body.data.attributes.provider.should.have.property('table').and.equal('gfw_mining');
        response.body.data.attributes.provider.should.have.property('user').and.equal('wri-01');
        response.body.data.attributes.provider.should.have.property('filter').and.equal('cartodb_id=573');
    });

    it('Create a geostore providing an invalid provider definition should return a 404 Not Found error', async () => {
        mockValidateRequestWithApiKey({});
        nock(`https://wri-01.cartodb.com:443`).get('/api/v2/sql')
            .query(() => true)
            .reply(404, {
                error: ['Table not found.']
            });

        const response = await requester
            .post(`/api/v2/geostore`)
            .set('x-api-key', 'api-key-test')
            .send({
                provider: {
                    type: 'carto',
                    table: 'gfw_mining',
                    user: 'wri-01',
                    filter: 'cartodb_id=573'
                }
            });

        response.status.should.equal(404);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
