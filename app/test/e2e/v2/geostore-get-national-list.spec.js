const nock = require('nock');
const chai = require('chai');
const config = require('config');
const GeoStore = require('models/geoStore');

const { getTestServer } = require('../utils/test-server');
const { createGeostore } = require('../utils/utils');
const { createMockQueryCartoDB, mockValidateRequestWithApiKey } = require('../utils/mock');
const { createQueryISOName } = require('../utils/queries-v2');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Geostore v2 tests - Get list geostore national', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
        if (config.get('cartoDB.user') === null) {
            throw Error(`Carto user not set - please specify a CARTODB_USER env var with it.`);
        }

        nock.cleanAll();

        requester = await getTestServer();
    });

    it('Getting list national geostore should return empty list error (happy case)', async () => {
        mockValidateRequestWithApiKey({});
        const isoDATA = [{ info: { iso: 'foo' } }, { info: { iso: 'bar' } }];
        const geostores = await Promise.all([createGeostore(isoDATA[0]), createGeostore(isoDATA[1])]);
        createMockQueryCartoDB({ query: createQueryISOName('(\'BAR\', \'FOO\')') });

        const response = await requester
            .get('/api/v2/geostore/admin/list')
            .set('x-api-key', 'api-key-test');
        response.status.should.equal(200);
        response.body.should.have.property('data');
        response.body.data.should.instanceOf(Array);

        const { data } = response.body;
        data.should.lengthOf(geostores.length);
        geostores.reverse().forEach((geo, key) => {
            data[key].iso.should.equal(geo.info.iso);
            data[key].geostoreId.should.equal(geo.hash);
        });
    });

    afterEach(async () => {
        await GeoStore.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
