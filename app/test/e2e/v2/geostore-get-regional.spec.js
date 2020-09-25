/* eslint-disable max-len */
const nock = require('nock');
const chai = require('chai');
const config = require('config');
const fs = require('fs');
const path = require('path');
const GeoStore = require('models/geoStore');

const {
    getTestServer
} = require('../utils/test-server');

const {
    createGeostore
} = require('../utils/utils');

chai.should();

let requester;
nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Geostore v2 tests - Get geostore - Regional (admin-1) level', () => {

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

    it('Get region that doesn\'t exist should return a 404', async () => {
        nock(`https://${process.env.CARTODB_USER}.cartodb.com`)
            .get('/api/v2/sql')
            .query({
                q: 'SELECT ST_AsGeoJSON(ST_MAKEVALID(ST_Simplify(the_geom, 0.005))) AS geojson, area_ha, name_1 as name\n        FROM gadm36_adm1\n        WHERE gid_1 = \'AAA.1_1\''
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

        const response = await requester.get(`/api/v2/geostore/admin/AAA/1?simplify=0.005`).send();

        response.status.should.equal(404);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('status').and.equal(404);
        response.body.errors[0].should.have.property('detail').and.equal('Location does not exist.');
    });

    it('Get region that exists should return a 200', async () => {
        nock(`https://${process.env.CARTODB_USER}.cartodb.com`)
            .get('/api/v2/sql')
            .query({
                q: 'SELECT ST_AsGeoJSON(ST_MAKEVALID(ST_Simplify(the_geom, 0.005))) AS geojson, area_ha, name_1 as name\n        FROM gadm36_adm1\n        WHERE gid_1 = \'CYP.1_1\''
            })
            .reply(200, {
                rows: [{
                    geojson: '{"type":"MultiPolygon","coordinates":[ [ [ [ 33.9065, 35.0691 ], [ 33.9129, 35.0659 ], [ 33.9411, 35.0597 ], [ 33.9629, 35.0683 ], [ 33.9981, 35.0617 ], [ 34.0043, 35.0654 ], [ 34.0051, 35.064 ], [ 34.0074, 35.0626 ], [ 34.0076, 35.0612 ], [ 34.0096, 35.0615 ], [ 34.0093, 35.0599 ], [ 34.0099, 35.0593 ], [ 34.0115, 35.0596 ], [ 34.0146, 35.0582 ], [ 34.016, 35.0551 ], [ 34.0213, 35.0551 ], [ 34.0224, 35.0537 ], [ 34.0224, 35.0513 ], [ 34.0246, 35.0521 ], [ 34.029, 35.0479 ], [ 34.0308, 35.0474 ], [ 34.0312, 35.046 ], [ 34.0343, 35.0435 ], [ 34.034, 35.0412 ], [ 34.0363, 35.0407 ], [ 34.0365, 35.0393 ], [ 34.0374, 35.0393 ], [ 34.0385, 35.0374 ], [ 34.0382, 35.0368 ], [ 34.0399, 35.0363 ], [ 34.041, 35.034 ], [ 34.044, 35.0323 ], [ 34.0457, 35.0285 ], [ 34.0474, 35.0288 ], [ 34.0488, 35.0271 ], [ 34.051, 35.0265 ], [ 34.0515, 35.0204 ], [ 34.0537, 35.0171 ], [ 34.0565, 35.0154 ], [ 34.0596, 35.0121 ], [ 34.0621, 35.0121 ], [ 34.0643, 35.0132 ], [ 34.0643, 35.0087 ], [ 34.0618, 35.0085 ], [ 34.0618, 35.0074 ], [ 34.0638, 35.0074 ], [ 34.0646, 35.006 ], [ 34.0649, 35.0043 ], [ 34.0643, 35.0043 ], [ 34.0641, 35.0029 ], [ 34.066, 35.0013 ], [ 34.0693, 35.0015 ], [ 34.0693, 34.9999 ], [ 34.0679, 34.9993 ], [ 34.0679, 34.9982 ], [ 34.0718, 34.9963 ], [ 34.0743, 34.9927 ], [ 34.074, 34.9918 ], [ 34.0762, 34.991 ], [ 34.0788, 34.9874 ], [ 34.0785, 34.9857 ], [ 34.0737, 34.9855 ], [ 34.0732, 34.9843 ], [ 34.0704, 34.9837 ], [ 34.0701, 34.9829 ], [ 34.0715, 34.9818 ], [ 34.0718, 34.979 ], [ 34.0737, 34.976 ], [ 34.0757, 34.976 ], [ 34.0765, 34.9768 ], [ 34.0774, 34.9757 ], [ 34.0763, 34.9685 ], [ 34.0771, 34.9688 ], [ 34.0771, 34.9677 ], [ 34.0788, 34.9665 ], [ 34.0807, 34.9663 ], [ 34.0824, 34.9643 ], [ 34.0835, 34.9646 ], [ 34.0849, 34.9665 ], [ 34.086, 34.9665 ], [ 34.0868, 34.9632 ], [ 34.0882, 34.9624 ], [ 34.0863, 34.9562 ], [ 34.0826, 34.9557 ], [ 34.0799, 34.9568 ], [ 34.079, 34.9585 ], [ 34.0801, 34.9601 ], [ 34.0801, 34.9618 ], [ 34.076, 34.964 ], [ 34.0737, 34.9635 ], [ 34.0726, 34.9621 ], [ 34.0701, 34.9618 ], [ 34.0682, 34.9588 ], [ 34.0662, 34.9585 ], [ 34.0643, 34.9604 ], [ 34.0618, 34.9613 ], [ 34.0593, 34.9649 ], [ 34.0546, 34.9676 ], [ 34.0529, 34.9676 ], [ 34.0485, 34.9704 ], [ 34.0457, 34.9704 ], [ 34.0435, 34.9721 ], [ 34.0368, 34.9718 ], [ 34.0307, 34.9729 ], [ 34.0234, 34.9774 ], [ 34.021, 34.9774 ], [ 34.0199, 34.9788 ], [ 34.0187, 34.9787 ], [ 34.0171, 34.9804 ], [ 34.0168, 34.9821 ], [ 34.014, 34.9832 ], [ 34.0057, 34.9835 ], [ 34.0046, 34.9829 ], [ 34.0049, 34.9801 ], [ 34.0032, 34.9801 ], [ 34.0029, 34.9807 ], [ 33.9996, 34.9807 ], [ 33.999, 34.9815 ], [ 33.9885, 34.9851 ], [ 33.9824, 34.9843 ], [ 33.9829, 34.9824 ], [ 33.9815, 34.9824 ], [ 33.9787, 34.9851 ], [ 33.9715, 34.9857 ], [ 33.9709, 34.9874 ], [ 33.9696, 34.9876 ], [ 33.9685, 34.9874 ], [ 33.9682, 34.9865 ], [ 33.9688, 34.9851 ], [ 33.9663, 34.9857 ], [ 33.9604, 34.9854 ], [ 33.9601, 34.9874 ], [ 33.9592, 34.9874 ], [ 33.9571, 34.9854 ], [ 33.9571, 34.9837 ], [ 33.9551, 34.9829 ], [ 33.9568, 34.9799 ], [ 33.9532, 34.9799 ], [ 33.9532, 34.9824 ], [ 33.9521, 34.9823 ], [ 33.9487, 34.9815 ], [ 33.9482, 34.9801 ], [ 33.941, 34.9779 ], [ 33.9357, 34.9779 ], [ 33.9346, 34.9787 ], [ 33.9251, 34.9762 ], [ 33.9062, 34.9729 ], [ 33.9021, 34.9704 ], [ 33.9018, 34.9685 ], [ 33.9029, 34.9665 ], [ 33.9024, 34.964 ], [ 33.9012, 34.9637 ], [ 33.8926, 34.9549 ], [ 33.8905, 34.9566 ], [ 33.8895, 34.9586 ], [ 33.8644, 34.963 ], [ 33.8458, 34.9597 ], [ 33.8381, 34.9637 ], [ 33.8505, 34.973 ], [ 33.8591, 34.9747 ], [ 33.8591, 34.9918 ], [ 33.8403, 34.9934 ], [ 33.8294, 35.0012 ], [ 33.8302, 35.023 ], [ 33.8224, 35.0301 ], [ 33.799, 35.0385 ], [ 33.8044, 35.0495 ], [ 33.8138, 35.0558 ], [ 33.8271, 35.0613 ], [ 33.8349, 35.0566 ], [ 33.8412, 35.0511 ], [ 33.8551, 35.0534 ], [ 33.8676, 35.0605 ], [ 33.8801, 35.0731 ], [ 33.8981, 35.0613 ], [ 33.9065, 35.0691 ] ] ] ]}',
                    area_ha: 20449.846900523287,
                    name: 'Famagusta'
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

        const response = await requester.get(`/api/v2/geostore/admin/CYP/1?simplify=0.005`).send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('geoStore');
        response.body.data.should.have.property('id').and.a('string');
        response.body.data.should.have.property('attributes').and.be.an('object');

        response.body.data.attributes.should.have.property('areaHa').and.equal(20449.846900523287);
        response.body.data.attributes.should.have.property('bbox').and.be.an('array');
        response.body.data.attributes.should.have.property('geojson').and.be.an('object');
        response.body.data.attributes.should.have.property('hash').and.be.a('string');
        response.body.data.attributes.should.have.property('info').and.be.an('object');

        response.body.data.attributes.info.should.have.property('gadm').and.equal('3.6');
        response.body.data.attributes.info.should.have.property('iso').and.equal('CYP');
        response.body.data.attributes.info.should.have.property('id1').and.equal(1);
        response.body.data.attributes.info.should.have.property('simplifyThresh').and.equal(0.005);
        response.body.data.attributes.info.should.have.property('name');
    });

    it('Get a region that has been saved to the local database should return a 200', async () => {
        await createGeostore(JSON.parse(fs.readFileSync(path.join(__dirname, 'resources', 'CYP-1-geom.json'))));

        const response = await requester.get(`/api/v2/geostore/admin/CYP/1?simplify=0.005`).send();

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');
        response.body.data.should.have.property('type').and.equal('geoStore');
        response.body.data.should.have.property('id').and.a('string');
        response.body.data.should.have.property('attributes').and.be.an('object');

        response.body.data.attributes.should.have.property('areaHa').and.equal(20449.8469005233);
        response.body.data.attributes.should.have.property('bbox').and.be.an('array');
        response.body.data.attributes.should.have.property('geojson').and.be.an('object');
        response.body.data.attributes.should.have.property('hash').and.be.a('string');
        response.body.data.attributes.should.have.property('info').and.be.an('object');

        response.body.data.attributes.info.should.have.property('gadm').and.equal('3.6');
        response.body.data.attributes.info.should.have.property('iso').and.equal('CYP');
        response.body.data.attributes.info.should.have.property('id1').and.equal(1);
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
