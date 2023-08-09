const chai = require('chai');
const config = require('config');
const chaiHttp = require('chai-http');
const { mockCloudWatchSetupRequestsSequence } = require('rw-api-microservice-node/dist/test-mocks');

let requester;

chai.use(chaiHttp);

const getTestServer = async function getTestAgent() {
    if (requester) {
        return requester;
    }

    mockCloudWatchSetupRequestsSequence({
        awsRegion: process.env.AWS_REGION,
        logGroupName: process.env.CLOUDWATCH_LOG_GROUP_NAME,
        logStreamName: config.get('service.name').replace(/ /g, '_')
    });

    const serverPromise = require('../../../src/app');
    const { server } = await serverPromise();
    requester = chai.request(server).keepOpen();

    return requester;
};

module.exports = { getTestServer };
