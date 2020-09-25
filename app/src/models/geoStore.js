const mongoose = require('mongoose');

const { Schema } = mongoose;

const GeoStore = new Schema({
    geojson: {
        type: { type: String, trim: true },
        features: [{
            _id: false,
            type: { type: String, trim: true },
            properties: { type: Schema.Types.Mixed },
            geometry: {
                _id: false,
                type: { type: String, trim: true },
                coordinates: [Schema.Types.Mixed]
            }
        }],
        crs: {
            _id: false,
            type: { type: String, required: false, trim: true },
            properties: { type: Schema.Types.Mixed, required: false }
        }
    },
    areaHa: { type: Number, required: false },
    bbox: { type: Schema.Types.Mixed, required: false },
    hash: {
        type: String, required: true, trim: true, unique: true
    },
    lock: { type: Boolean, required: true, default: false },
    provider: {
        type: { type: String, trim: true },
        table: { type: String, trim: true },
        user: { type: String, trim: true },
        filter: { type: String, trim: true }
    },
    info: {
        iso: { type: String, required: false },
        name: { type: String, required: false },
        id1: { type: Number, required: false },
        id2: { type: Number, required: false },
        gadm: { type: String, required: false },
        wdpaid: { type: Number, required: false },
        use: {
            use: { type: String, required: false },
            id: { type: Number, required: false },
        },
        simplify: { type: Boolean, required: false },
        simplifyThresh: { type: Number, required: false }

    }
});

GeoStore.index({
    hash: 1,
    'info.iso': 1,
    'info.name': 1,
    'info.id1': 1,
    'info.wdpaid': 1,
    'info.use.use': 1,
    'info.use.id': 1
});
GeoStore.index({ 'info.iso': 1 });
GeoStore.index({ 'info.iso': 1, 'info.id1': 1 });
GeoStore.index({ 'info.iso': 1, 'info.id1': 1, 'info.id2': 1 });
GeoStore.index({ 'info.wdpaid': 1 });
GeoStore.index({ 'info.use.use': 1, 'info.use.id': 1 });

module.exports = mongoose.model('GeoStore', GeoStore);
