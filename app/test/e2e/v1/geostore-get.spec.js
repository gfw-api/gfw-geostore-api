const nock = require('nock');
const chai = require('chai');
const config = require('config');
const GeoStore = require('models/geoStore');

const { getTestServer } = require('../utils/test-server');
const { DEFAULT_GEOJSON, ANTIMERIDIAN_GEOJSON } = require('../utils/test.constants');
const { getUUID, ensureCorrectError, createGeostore } = require('../utils/utils');
const { mockValidateRequestWithApiKey } = require('../utils/mock');

chai.should();

let requester;
nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Geostore v1 tests - Get geostores', () => {

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

    it('Get geostore that doesn\'t exist should return a 404', async () => {
        mockValidateRequestWithApiKey({});
        const randomGeostoreID = getUUID();
        const response = await requester.get(`/api/v1/geostore/${randomGeostoreID}`)
            .set('x-api-key', 'api-key-test');
        ensureCorrectError(response, 'GeoStore not found', 404);
    });

    it('Getting geostore should return the result (happy case)', async () => {
        mockValidateRequestWithApiKey({});
        const createdGeostore = await createGeostore();
        const response = await requester
            .get(`/api/v1/geostore/${createdGeostore.hash}`)
            .set('x-api-key', 'api-key-test');

        response.status.should.equal(200);
        response.body.should.instanceOf(Object).and.have.property('data');

        const { data } = response.body;
        data.id.should.equal(createdGeostore.hash);
        data.type.should.equal('geoStore');
        data.should.have.property('attributes').and.should.instanceOf(Object);
        data.attributes.should.instanceOf(Object);

        const { geojson, bbox, hash } = data.attributes;

        const expectedGeojson = {
            ...DEFAULT_GEOJSON,
            crs: {},
        };
        delete expectedGeojson.features[0].properties;

        geojson.should.deep.equal(expectedGeojson);
        bbox.should.instanceOf(Array);
        hash.should.equal(createdGeostore.hash);
    });

    it('Getting a geostore that crosses the antimeridian should give a bbox [position 0 and 2] from [-180, 180] to [0, 360] (happy case)', async () => {
        mockValidateRequestWithApiKey({});
        const createdGeostore = await createGeostore({}, ANTIMERIDIAN_GEOJSON);
        const response = await requester
            .get(`/api/v1/geostore/${createdGeostore.hash}`)
            .set('x-api-key', 'api-key-test');

        response.status.should.equal(200);
        response.body.should.instanceOf(Object).and.have.property('data');

        const { data } = response.body;
        data.id.should.equal(createdGeostore.hash);
        data.type.should.equal('geoStore');
        data.should.have.property('attributes').and.should.instanceOf(Object);
        data.attributes.should.instanceOf(Object);

        const { geojson, bbox, hash } = data.attributes;

        const expectedGeojson = {
            ...ANTIMERIDIAN_GEOJSON,
            crs: {},
        };
        delete expectedGeojson.features[0].properties;

        geojson.should.deep.equal(expectedGeojson);
        bbox.should.instanceOf(Array);
        bbox.should.deep.equal([
            176.51542,
            -34.184289,
            187,
            -27.592584
        ]);
        hash.should.equal(createdGeostore.hash);
    });

    it('Getting geostore with format esri should return the result with esrijson (happy case)', async () => {
        mockValidateRequestWithApiKey({});
        const createdGeostore = await createGeostore();
        const response = await requester
            .get(`/api/v1/geostore/${createdGeostore.hash}`)
            .query({ format: 'esri' })
            .set('x-api-key', 'api-key-test');

        response.status.should.equal(200);
        response.body.should.instanceOf(Object).and.have.property('data');

        const { data } = response.body;
        data.id.should.equal(createdGeostore.hash);
        data.type.should.equal('geoStore');
        data.should.have.property('attributes').and.instanceOf(Object);

        const {
            geojson, bbox, hash, esrijson
        } = data.attributes;

        const expectedGeojson = {
            ...DEFAULT_GEOJSON,
            crs: {},
        };
        delete expectedGeojson.features[0].properties;

        geojson.should.deep.equal(expectedGeojson);
        bbox.should.instanceOf(Array);
        hash.should.equal(createdGeostore.hash);
        esrijson.should.deep.equal({ spatialReference: { wkid: 4326 } });
    });

    afterEach(async () => {
        await GeoStore.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
