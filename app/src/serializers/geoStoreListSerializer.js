const GeoJSONSerializer = require('serializers/geoJSONSerializer');

class GeoStoreListSerializer {

    static serialize(data) {
        return {
            data: data.geostores.map((el) => ({
                geostoreId: el.hash,
                geostore: GeoJSONSerializer.serialize(el)
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
