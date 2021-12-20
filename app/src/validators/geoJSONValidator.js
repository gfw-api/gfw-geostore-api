/* eslint-disable func-names */
const geojsonhint = require('geojsonhint');
const koaValidate = require('koa-validate');

(function () {

    koaValidate.Validator.prototype.isGEOJSON = function () {
        if (!this.value) {
            // not required
            return this;
        }
        const result = geojsonhint.hint(this.value);
        if (result && result.length > 0) {
            this.addError(result[0].message);
        }
        return this;
    };

}());
