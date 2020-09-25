/* eslint-disable no-underscore-dangle */
const nock = require('nock');
const chai = require('chai');
const config = require('config');
const GeoStore = require('models/geoStore');
const { createRequest } = require('../utils/test-server');
const { createGeostore, ensureCorrectError } = require('../utils/utils');
const { createQueryWDPA, createQueryGeometry } = require('../utils/queries-v1');
const { createMockQueryCartoDB } = require('../utils/mock');
const { MOCK_RESULT_CARTODB } = require('../utils/test.constants');

chai.should();

const prefix = '/api/v1/geostore/wdpa/';
let geostoreWDPA;

describe('Geostore v1 tests - Getting geodata by wdpa', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
        if (config.get('cartoDB.user') === null) {
            throw Error(`Carto user not set - please specify a CARTODB_USER env var with it.`);
        }

        nock.cleanAll();
        geostoreWDPA = await createRequest(prefix, 'get');
    });

    it('Getting geodata by wdpa when data from query wdpa return empty array, and data doens\'t exist into geostore should return not found', async () => {
        const wdpaid = 123;
        createMockQueryCartoDB({ query: createQueryWDPA(wdpaid), rows: [] });
        const response = await geostoreWDPA.get(wdpaid);
        ensureCorrectError(response, 'Wdpa not found', 404);
    });

    it('Getting geodata by wdpa when data exist into geostore should return the geodata', async () => {
        const wdpaid = 123;
        const geostore = (await createGeostore({ info: { wdpaid } })).toObject();
        const response = await geostoreWDPA.get(wdpaid);
        response.status.should.equal(200);
        response.body.should.instanceOf(Object).and.have.property('data');
        response.body.data.should.instanceOf(Object);
        const { data } = response.body;

        data.id.should.equal(geostore.hash);
        data.should.have.property('attributes');
        data.attributes.should.instanceOf(Object);

        const { attributes } = data;

        const expectedAttributes = {
            ...geostore,
            info: { wdpaid, use: {} },
            geojson: { ...geostore.geojson, crs: {} },
            provider: {},
        };
        delete expectedAttributes._id;
        delete expectedAttributes.__v;

        expectedAttributes.should.deep.equal(attributes);
    });

    it('Getting geodata by wdpa when data doesn\'t exit into geostore but returned by query should create geostore and return the geodata', async () => {
        const wdpaid = 123;
        createMockQueryCartoDB({
            query: createQueryGeometry(MOCK_RESULT_CARTODB[0].geojson),
            rows: MOCK_RESULT_CARTODB
        });
        createMockQueryCartoDB({ query: createQueryWDPA(wdpaid), rows: MOCK_RESULT_CARTODB });
        const response = await geostoreWDPA.get(wdpaid);
        const geostore = (await GeoStore.findOne({ info: { wdpaid } })).toObject();

        response.status.should.equal(200);
        response.body.should.instanceOf(Object).and.have.property('data');
        response.body.data.should.instanceOf(Object);
        const { data } = response.body;

        data.id.should.equal(geostore.hash);
        data.should.have.property('attributes');
        data.attributes.should.instanceOf(Object);

        const { attributes } = data;

        const expectedAttributes = {
            ...geostore,
            info: { wdpaid, use: {} },
            geojson: { ...geostore.geojson, crs: {} },
            provider: {},
        };
        delete expectedAttributes._id;
        delete expectedAttributes.__v;

        expectedAttributes.should.deep.equal(attributes);
    });

    afterEach(async () => {
        await GeoStore.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
