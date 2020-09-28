const logger = require('logger');
const GeometryTooLarge = require('errors/geometryTooLarge');

// Legacy code, see line 41 below

// const ErrorCreatingGist = require('errors/errorCreatingGist');
// const { Octokit } = require('@octokit/rest');
// const github = new Octokit({
//     version: '3.0.0',
//     protocol: 'https'
// });

const MAX_URL_LEN = 150e3;

class GeoJsonIOService {

    static async view(geojson) {

        // if this is a multipolygon, grab the first feature in the collection
        // and ditch the rest-- only need type and coordinates properties
        if (geojson.features[0].geometry.type === 'MultiPolygon') {
            logger.debug('found multipolygon');
            // eslint-disable-next-line no-param-reassign
            geojson = {
                type: 'MultiPolygon',
                coordinates: geojson.features[0].geometry.coordinates
            };
        } else {

            for (let i = 0; i < geojson.features.length; i++) {
                // doesn't register when set to {} for some reason
                geojson.features[i].properties = null;
            }
        }

        if (JSON.stringify(geojson).length <= MAX_URL_LEN) {
            return `http://geojson.io/#data=data:application/json,${encodeURIComponent(
                JSON.stringify(geojson)
            )}`;
        }

        // Creating Gists in GH now requires authentication, so the code below throws a "Requires authentication" error
        // So we are decided to throw an error ourselves, so that we can give our end users a more useful error message
        throw new GeometryTooLarge('Geometry too large, please try again with a smaller geometry.');

        // logger.debug('saving to github gist');
        // const res = await github.gists.create({
        //     description: '',
        //     public: true,
        //     files: {
        //         'map.geojson': {
        //             content: JSON.stringify(geojson)
        //         }
        //     }
        // });
        // if (res.data.html_url) {
        //     return res.data.html_url;
        // }
        // throw new ErrorCreatingGist(`Error creating gist`);
    }

}

module.exports = GeoJsonIOService;
