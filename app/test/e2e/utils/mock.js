const nock = require('nock');
const config = require('config');
const { mockValidateRequest, mockCloudWatchLogRequest } = require('rw-api-microservice-node/dist/test-mocks');
const { APPLICATION } = require('./test.constants');

const createMockQueryCartoDB = ({ rows = [], query }) => {
    nock(`https://${process.env.CARTODB_USER}.cartodb.com`, {
        encodedQueryParams: true
    })
        .get(`/api/v2/sql`)
        .query({
            q: query
        })
        .reply(200, {
            rows,
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
            total_rows: rows.length
        });
};

const mockValidateRequestWithApiKey = ({
    apiKey = 'api-key-test',
    application = APPLICATION
}) => {
    mockValidateRequest({
        gatewayUrl: process.env.GATEWAY_URL,
        microserviceToken: process.env.MICROSERVICE_TOKEN,
        application,
        apiKey
    });
    mockCloudWatchLogRequest({
        application,
        awsRegion: process.env.AWS_REGION,
        logGroupName: process.env.CLOUDWATCH_LOG_GROUP_NAME,
        logStreamName: config.get('service.name')
    });
};

module.exports = { createMockQueryCartoDB, mockValidateRequestWithApiKey };
