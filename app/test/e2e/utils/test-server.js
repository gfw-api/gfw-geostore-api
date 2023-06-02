/* eslint-disable import/no-extraneous-dependencies */
const chai = require('chai');
const chaiHttp = require('chai-http');

let requester;
let createdServer;

chai.use(chaiHttp);

const createRequest = async (prefix, method) => {
    if (!createdServer) {
        const serverPromise = require('../../../src/app');
        const { server } = await serverPromise();
        createdServer = server;
    }
    const newRequest = chai.request(createdServer).keepOpen();
    const oldHandler = newRequest[method];

    newRequest[method] = (url = '') => oldHandler(prefix + url);

    return newRequest;
};

const getTestServer = async function getTestAgent() {
    if (requester) {
        return requester;
    }

    const serverPromise = require('../../../src/app');
    const { server } = await serverPromise();
    createdServer = server;
    requester = chai.request(server).keepOpen();

    return requester;
};

module.exports = { getTestServer, createRequest };
