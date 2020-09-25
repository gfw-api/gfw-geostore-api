class CoverageNotFound extends Error {

    constructor(message) {
        super(message);
        this.name = 'CoverageNotFound';
        this.message = message;
    }

}

module.exports = CoverageNotFound;
