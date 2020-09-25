class CoverageDuplicated extends Error {

    constructor(message) {
        super(message);
        this.name = 'CoverageDuplicated';
        this.message = message;
    }

}

module.exports = CoverageDuplicated;
