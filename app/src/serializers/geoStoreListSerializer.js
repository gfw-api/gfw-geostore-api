
const logger = require('logger');


class GeoStoreListSerializer {

    static serialize(data) {
        return {
            data: data.geostores.map((el) => ({
                geostoreId: el.hash,
                geojson: el.geojson
            })),
            info: {
                found: data.found,
                foundIds: data.geostoresFound,
                returned: data.returned
            }
        };
    }

}

module.exports = GeoStoreListSerializer;
