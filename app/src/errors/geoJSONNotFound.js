class GeoJSONNotFound extends Error {

    constructor(message) {
        super(message);
        this.name = 'GeoJSONNotFound';
        this.message = message;
        this.status = 404;
    }

}

module.exports = GeoJSONNotFound;
