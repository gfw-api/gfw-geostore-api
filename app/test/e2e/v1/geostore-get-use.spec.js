/* eslint-disable no-underscore-dangle */
const nock = require('nock');
const chai = require('chai');
const config = require('config');
const GeoStore = require('models/geoStore');

const { createRequest } = require('../utils/test-server');
const { createGeostore, ensureCorrectError } = require('../utils/utils');
const { createMockQueryCartoDB } = require('../utils/mock');
const { createQueryUSE, createQueryGeometry } = require('../utils/queries-v1');
const { MOCK_RESULT_CARTODB } = require('../utils/test.constants');

chai.should();
const prefix = '/api/v1/geostore/use';

let geostoreUSE;
nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

const checkUseRequest = (tableName, actualTableName, useID = 123) => async () => {
    const providedINFO = { use: { use: actualTableName, id: useID } };
    const geostore = (await createGeostore({ info: providedINFO })).toObject();
    const response = await geostoreUSE.get(`/${tableName}/${useID}`);
    response.status.should.equal(200);
    response.body.should.have.property('data');
    response.body.data.should.instanceOf(Object);
    const { data } = response.body;

    data.id.should.equal(geostore.hash);
    data.should.have.property('attributes');
    data.attributes.should.instanceOf(Object);

    const { attributes } = data;

    const expectedAttributes = {
        ...geostore,
        info: providedINFO,
        geojson: { ...geostore.geojson, crs: {} },
        provider: {},
    };
    delete expectedAttributes._id;
    delete expectedAttributes.__v;

    expectedAttributes.should.deep.equal(attributes);
};

const checkUseRequestFromQuery = (tableName, actualTableName, useID = 123) => async () => {
    createMockQueryCartoDB({
        query: createQueryGeometry(MOCK_RESULT_CARTODB[0].geojson),
        rows: MOCK_RESULT_CARTODB
    });
    createMockQueryCartoDB({ query: createQueryUSE(useID, actualTableName), rows: MOCK_RESULT_CARTODB });
    const response = await geostoreUSE.get(`/${tableName}/${useID}`);
    response.status.should.equal(200);
    response.body.should.have.property('data');
    response.body.data.should.instanceOf(Object);
    const { data } = response.body;

    const createdGeostore = (await GeoStore.findOne({ hash: data.id })).toObject();
    createdGeostore.should.instanceOf(Object);

    data.id.should.equal(createdGeostore.hash);
    data.should.have.property('attributes');
    data.attributes.should.instanceOf(Object);

    const { attributes } = data;

    const expectedAttributes = {
        ...createdGeostore,
        geojson: { ...createdGeostore.geojson, crs: {} },
        provider: {},
    };
    delete expectedAttributes._id;
    delete expectedAttributes.__v;

    expectedAttributes.should.deep.equal(attributes);
};

const checkUseRequestFromQueryWithError = (tableName, actualTableName, isGeometryNotFound, useID = 123) => async () => {
    if (isGeometryNotFound) {
        createMockQueryCartoDB({ query: createQueryGeometry(MOCK_RESULT_CARTODB[0].geojson), rows: [] });
    }
    createMockQueryCartoDB({
        query: createQueryUSE(useID, actualTableName),
        rows: isGeometryNotFound ? MOCK_RESULT_CARTODB : []
    });
    const response = await geostoreUSE.get(`/${tableName}/${useID}`);
    ensureCorrectError(response, isGeometryNotFound ? 'No Geojson returned' : 'Use not found', 404);
};

describe('Geostore v1 tests - Get list geostore by use', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
        if (config.get('cartoDB.user') === null) {
            throw Error(`Carto user not set - please specify a CARTODB_USER env var with it.`);
        }

        nock.cleanAll();

        geostoreUSE = await createRequest(prefix, 'get');
    });

    it('Getting geostore by use table mining with existing geo should return result (happy case)',
        checkUseRequest('mining', 'gfw_mining'));

    it('Getting geostore by use table oilpalm with existing geo should return result (happy case)',
        checkUseRequest('oilpalm', 'gfw_oil_palm'));

    it('Getting geostore by use table fiber with existing geo should return result (happy case)',
        checkUseRequest('fiber', 'gfw_wood_fiber'));

    it('Getting geostore by use table logging with existing geo should return result (happy case)',
        checkUseRequest('logging', 'gfw_logging'));

    it('Getting geostore by use table endemic_bird_areas with existing geo should return result (happy case)',
        checkUseRequest('endemic_bird_areas', 'endemic_bird_areas'));

    it('Getting geostore by use table tiger_conservation_landscapes with existing geo should return result (happy case)',
        checkUseRequest('tiger_conservation_landscapes', 'tcl'));

    it('Getting geostore by use table custom with existing geo should return result (happy case)',
        checkUseRequest('custom', 'custom'));

    it('Getting geostore by use table mining with doesn\'t existing geo in GEOSTORE and doesn\'t exist data from query should return not found',
        checkUseRequestFromQueryWithError('mining', 'gfw_mining'));

    it('Getting geostore by use table mining with doesn\'t existing geo in GEOSTORE and doesn\'t exist data from geometry should return not found',
        checkUseRequestFromQueryWithError('mining', 'gfw_mining', true));

    it('Getting geostore by use table mining with doesn\'t existing geo in GEOSTORE should create geostore and return (happy case)',
        checkUseRequestFromQuery('mining', 'gfw_mining'));

    it('Getting geostore by use table oilpalm with doesn\'t existing geo in GEOSTORE should create geostore and return (happy case)',
        checkUseRequestFromQuery('oilpalm', 'gfw_oil_palm'));

    it('Getting geostore by use table fiber with doesn\'t existing geo in GEOSTORE should create geostore and return (happy case)',
        checkUseRequestFromQuery('fiber', 'gfw_wood_fiber'));

    it('Getting geostore by use table logging with doesn\'t existing geo in GEOSTORE should create geostore and return (happy case)',
        checkUseRequestFromQuery('logging', 'gfw_logging'));

    it('Getting geostore by use table endemic_bird_areas with doesn\'t existing geo in GEOSTORE should create geostore and return (happy case)',
        checkUseRequestFromQuery('endemic_bird_areas', 'endemic_bird_areas'));

    it('Getting geostore by use table tiger_conservation_landscapes with doesn\'t existing geo in GEOSTORE should create geostore and return (happy case)',
        checkUseRequestFromQuery('tiger_conservation_landscapes', 'tcl'));

    it('Getting geostore by use table custom with doesn\'t existing geo in GEOSTORE should create geostore and return (happy case)',
        checkUseRequestFromQuery('custom', 'custom'));

    afterEach(async () => {
        await GeoStore.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
