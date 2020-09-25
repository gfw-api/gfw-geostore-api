const mongoose = require('mongoose');

const { Schema } = mongoose;

const IdConnection = new Schema({
    hash: { type: String, required: true, trim: true },
    oldId: { type: String, required: true, trim: true }

});
IdConnection.index({ oldId: 1 });

module.exports = mongoose.model('IdConnection', IdConnection);
