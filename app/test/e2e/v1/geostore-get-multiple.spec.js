/* eslint-disable no-unused-vars,no-undef */
const nock = require('nock');
const chai = require('chai');
const config = require('config');
const GeoStore = require('models/geoStore');
const logger = require('logger');

const { createGeostore, getUUID } = require('../utils/utils');
const { getTestServer } = require('../utils/test-server');

const should = chai.should();

let requester;
nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Geostore v1 tests - Get multiple geostorea', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }
        if (config.get('cartoDB.user') === null) {
            throw Error(`Carto user not set - please specify a CARTODB_USER env var with it.`);
        }

        requester = await getTestServer();

        GeoStore.remove({}).exec();

        nock.cleanAll();
    });

    it('Get geostores that have been saved to the local database should max of 2 geostores, return a 200', async () => {
        const createdGeostore1 = await createGeostore({
            areaHa: 205.64210228373287,
            bbox: [],
            info: {
                iso: 'MCO', id1: null, id2: null, gadm: '2.8'
            }
        });
        const createdGeostore2 = await createGeostore({
            areaHa: 206.64210228373287,
            bbox: [],
            info: {
                iso: 'BRA', id1: null, id2: null, gadm: '2.8'
            }
        });
        const createdGeostore3 = await createGeostore({
            areaHa: 207.64210228373287,
            bbox: [],
            info: {
                iso: 'ESP', id1: null, id2: null, gadm: '2.8'
            }
        });

        const response = await requester.post(`/api/v1/geostore/find-by-ids`)
            .send({
                geostores: [
                    {
                        geostore: createdGeostore1.hash
                    }, {
                        geostore: createdGeostore2.hash
                    }, {
                        geostore: createdGeostore3.hash
                    }
                ]
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array');
        response.body.should.have.property('info').and.be.an('object');
        response.body.info.should.have.property('found').and.equal(3);
        response.body.info.should.have.property('returned').and.equal(2);
        response.body.info.should.have.property('foundIds').and.be.an('array');

    });

    it('Get geostores some geostores that dont exist return a 200', async () => {
        const createdGeostore1 = await createGeostore({
            areaHa: 205.64210228373287,
            bbox: [],
            info: {
                iso: 'MCO', id1: null, id2: null, gadm: '2.8'
            }
        });
        const randomGeostoreID1 = getUUID();
        const randomGeostoreID2 = getUUID();

        const response = await requester.post(`/api/v1/geostore/find-by-ids`)
            .send({
                geostores: [
                    {
                        geostore: createdGeostore1.hash
                    }, {
                        geostore: randomGeostoreID1
                    }, {
                        geostore: randomGeostoreID2
                    }
                ]
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array');
        response.body.should.have.property('info').and.be.an('object');
        response.body.info.should.have.property('found').and.equal(1);
        response.body.info.should.have.property('returned').and.equal(1);
        response.body.info.should.have.property('foundIds').and.be.an('array');

    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });

    after(() => {
        GeoStore.remove({}).exec();
    });
});
