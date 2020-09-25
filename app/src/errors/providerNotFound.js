class ProviderNotFound extends Error {

    constructor(message) {
        super(message);
        this.name = 'ProviderNotFound';
        this.message = message;
    }

}

module.exports = ProviderNotFound;
