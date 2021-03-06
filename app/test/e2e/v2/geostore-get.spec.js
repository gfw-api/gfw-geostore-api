const nock = require('nock');
const chai = require('chai');
const config = require('config');

const { createRequest } = require('../utils/test-server');
const { getUUID, createGeostore, ensureCorrectError } = require('../utils/utils');
const { DEFAULT_GEOJSON } = require('../utils/test.constants');

chai.should();

const prefix = '/api/v2/geostore/';
let geostore;
nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Geostore v2 tests - Get geostores', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
        if (config.get('cartoDB.user') === null) {
            throw Error(`Carto user not set - please specify a CARTODB_USER env var with it.`);
        }

        geostore = await createRequest(prefix, 'get');

        nock.cleanAll();
    });

    it('Get geostore that doesn\'t exist should return a 404', async () => {
        const randomGeostoreID = getUUID();
        const response = await geostore.get(randomGeostoreID);
        ensureCorrectError(response, 'GeoStore not found', 404);
    });

    it('Getting geostore should return the result (happy case)', async () => {
        const createdGeostore = await createGeostore();
        const response = await geostore.get(createdGeostore.hash);

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

    it('Getting geostore with format esri should return the result with esrijson (happy case)', async () => {
        const createdGeostore = await createGeostore();
        const response = await geostore.get(createdGeostore.hash).query({ format: 'esri' });

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

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
