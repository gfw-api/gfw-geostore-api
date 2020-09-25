/* eslint-disable no-underscore-dangle */
const nock = require('nock');
const chai = require('chai');
const config = require('config');
const GeoStore = require('models/geoStore');

const { createRequest } = require('../utils/test-server');
const { ensureCorrectError, createGeostore } = require('../utils/utils');
const { createMockQueryCartoDB } = require('../utils/mock');
const { createQueryID1, createQueryGeometry } = require('../utils/queries-v1');
const { DEFAULT_GEOJSON, MOCK_RESULT_CARTODB } = require('../utils/test.constants');

chai.should();
const prefix = '/api/v1/geostore/admin';

let subnational;
nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Geostore v1 tests - Get geostore subnational by id', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
        if (config.get('cartoDB.user') === null) {
            throw Error(`Carto user not set - please specify a CARTODB_USER env var with it.`);
        }
        nock.cleanAll();

        subnational = await createRequest(prefix, 'get');

    });

    it('Getting subnational from CartoDB with no rows, should return not found', async () => {
        const testID = 123;
        const testISO = 'TEST123';
        createMockQueryCartoDB({ query: createQueryID1(testID, testISO) });

        const response = await subnational.get(`/${testISO}/${testID}`);
        ensureCorrectError(response, 'Country/Region not found', 404);
    });

    it('Getting subnational from CartoDB with no geojson returned should return not found', async () => {
        const testID = 123;
        const testISO = 'TEST123';
        createMockQueryCartoDB({ query: createQueryID1(testID, testISO), rows: MOCK_RESULT_CARTODB });
        createMockQueryCartoDB({ query: createQueryGeometry(MOCK_RESULT_CARTODB[0].geojson) });

        const response = await subnational.get(`/${testISO}/${testID}`);
        ensureCorrectError(response, 'No Geojson returned', 404);
    });

    it('Getting subnational by id should return directly from db when it was created (happy case)', async () => {
        const testID = 123;
        const testISO = 'TEST123';
        const createdSubnational = await createGeostore({
            info: {
                iso: testISO, id1: testID, id2: null, gadm: '2.8'
            }
        });

        const response = await subnational.get(`/${testISO}/${testID}`);

        const { data } = response.body;
        data.id.should.equal(createdSubnational.hash);
        data.type.should.equal('geoStore');
        data.should.have.property('attributes').and.should.instanceOf(Object);
        data.attributes.should.instanceOf(Object);

        const { geojson, hash } = data.attributes;

        const expectedGeojson = {
            ...DEFAULT_GEOJSON,
            crs: {},
        };
        delete expectedGeojson.features[0].properties;

        geojson.should.deep.equal(expectedGeojson);
        hash.should.equal(createdSubnational.hash);
    });

    it('Getting subnational from CartoDB and should be created in db (happy case)', async () => {
        const testID = 123;
        const testISO = 'TEST123';
        createMockQueryCartoDB({ query: createQueryID1(testID, testISO), rows: MOCK_RESULT_CARTODB });
        createMockQueryCartoDB({
            query: createQueryGeometry(MOCK_RESULT_CARTODB[0].geojson),
            rows: MOCK_RESULT_CARTODB
        });

        const response = await subnational.get(`/${testISO}/${testID}`);
        response.status.should.equal(200);
        response.body.should.have.property('data');
        response.body.data.should.instanceOf(Object);
        const { id, type, attributes } = response.body.data;
        type.should.equal('geoStore');

        const createdSubnational = (await GeoStore.findOne({ hash: id })).toObject();
        createdSubnational.should.instanceOf(Object);
        createdSubnational.hash.should.equal(id);

        delete createdSubnational._id;
        delete createdSubnational.__v;

        const expectedSubnational = {
            ...createdSubnational,
            info: {
                use: {},
                ...createdSubnational.info,
            },
            geojson: {
                ...createdSubnational.geojson,
                crs: {}
            },
            provider: {},
        };

        expectedSubnational.should.deep.equal(attributes);
    });

    afterEach(async () => {
        await GeoStore.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
