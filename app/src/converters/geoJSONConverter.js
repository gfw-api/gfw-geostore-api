
const logger = require('logger');

module.exports.makeFeatureCollection = function (data, props) {
    if (data.type === 'FeatureCollection') {
        logger.debug('Is a FeatureCollection');
        data.features.properties = props;
        return data;
    } if (data.type === 'Feature') {
        logger.debug('Is a feature');
        data.properties = props;
        return {
            type: 'FeatureCollection',
            features: [data],
            /* crs: {
                     type: 'name',
                     properties: {
                         name: 'urn:ogc:def:crs:OGC:1.3:CRS84'
                     }
             } */
        };
    }
    logger.debug('Is a geometry');
    return {
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            properties: props,
            geometry: data
        }],
        /*  crs: {
                      type: 'name',
                      properties: {
                          name: 'urn:ogc:def:crs:OGC:1.3:CRS84'
                      }
              } */
    };

};

module.exports.getGeometry = function (data) {
    if (data.type === 'FeatureCollection') {
        logger.debug('Is a FeatureCollection');
        return data.features[0].geometry;
    } if (data.type === 'Feature') {
        logger.debug('Is a feature');
        return data.geometry;
    }
    logger.debug('Is a geometry');
    return data;

};
