const nock = require('nock');
const chai = require('chai');
const config = require('config');
const GeoStore = require('models/geoStore');

const { createRequest } = require('../utils/test-server');
const { createGeostore } = require('../utils/utils');
const { createMockQueryCartoDB } = require('../utils/mock');
const { createQueryISOName } = require('../utils/queries-v1');

chai.should();
const prefix = '/api/v1/geostore/admin/list';

let listNational;
nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Geostore v1 tests - Get list geostore national', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
        if (config.get('cartoDB.user') === null) {
            throw Error(`Carto user not set - please specify a CARTODB_USER env var with it.`);
        }

        nock.cleanAll();

        listNational = await createRequest(prefix, 'get');
    });

    it('Getting list national geostore should return empty list error (happy case)', async () => {
        const isoDATA = [{ info: { iso: 'foo' } }, { info: { iso: 'bar' } }];
        const geostores = await Promise.all([createGeostore(isoDATA[0]), createGeostore(isoDATA[1])]);
        createMockQueryCartoDB({ query: createQueryISOName('(\'BAR\', \'FOO\')') });

        const response = await listNational.get();
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
