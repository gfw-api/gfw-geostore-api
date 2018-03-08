'use strict';

var logger = require('logger');

class AreaSerializer {
  
  static serialize(data) {
    return {
        data: {
            'type': "geomArea",
            'attributes': {
                'bbox': data.bbox,
                'areaHa': data.areaHa
                }
            }
        };
    }
}

module.exports = AreaSerializer;
