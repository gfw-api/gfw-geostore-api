class ErrorCreatingGist extends Error {

    constructor(message) {
        super(message);
        this.name = 'ErrorCreatingGist';
        this.message = message;
    }

}

module.exports = ErrorCreatingGist;
