const GeoJSONConverter = require('converters/geoJSONConverter');


describe('Error serializer test', () => {
    const featureCollectionExample = {
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [
                        [-130.078125,
                            52.05249047600099
                        ]
                    ]
                ]
            }
        }]
    };
    const featureExample = {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [
                [
                    [-130.078125,
                        52.05249047600099
                    ]
                ]
            ]

        }
    };
    const geometryExample = {
        type: 'Polygon',
        coordinates: [
            [
                [-130.078125,
                    52.05249047600099
                ]
            ]
        ]
    };

    it('Create correct geojson from geometry', () => {
        const converted = GeoJSONConverter.makeFeatureCollection(geometryExample);
        converted.should.have.property('type');
        converted.type.should.be.equal(featureCollectionExample.type);
        converted.should.have.property('features');
        converted.features.should.be.an('array');
        converted.features.should.length(featureCollectionExample.features.length);

        const feature = converted.features[0];
        feature.should.have.property('type');
        feature.type.should.be.equal(featureCollectionExample.features[0].type);
        feature.should.have.property('geometry');
        feature.geometry.should.be.an('object');

        const { geometry } = feature;
        geometry.should.have.property('type');
        geometry.type.should.be.equal(featureCollectionExample.features[0].geometry.type);
        geometry.should.have.a.property('coordinates');
        geometry.coordinates.should.be.an('array');
        geometry.coordinates.should.length(featureCollectionExample.features[0].geometry.coordinates.length);
    });

    it('Create correct geojson from feature', () => {
        const converted = GeoJSONConverter.makeFeatureCollection(featureExample);
        converted.should.have.property('type');
        converted.type.should.be.equal(featureCollectionExample.type);
        converted.should.have.property('features');
        converted.features.should.be.an('array');
        converted.features.should.length(featureCollectionExample.features.length);

        const feature = converted.features[0];
        feature.should.have.property('type');
        feature.type.should.be.equal(featureCollectionExample.features[0].type);
        feature.should.have.property('geometry');
        feature.geometry.should.be.an('object');

        const { geometry } = feature;
        geometry.should.have.property('type');
        geometry.type.should.be.equal(featureCollectionExample.features[0].geometry.type);
        geometry.should.have.a.property('coordinates');
        geometry.coordinates.should.be.an('array');
        geometry.coordinates.should.length(featureCollectionExample.features[0].geometry.coordinates.length);
    });

    it('Create correct geojson from feature collection', () => {
        const converted = GeoJSONConverter.makeFeatureCollection(featureCollectionExample);
        converted.should.have.property('type');
        converted.type.should.be.equal(featureCollectionExample.type);
        converted.should.have.property('features');
        converted.features.should.be.an('array');
        converted.features.should.length(featureCollectionExample.features.length);

        const feature = converted.features[0];
        feature.should.have.property('type');
        feature.type.should.be.equal(featureCollectionExample.features[0].type);
        feature.should.have.property('geometry');
        feature.geometry.should.be.an('object');

        const { geometry } = feature;
        geometry.should.have.property('type');
        geometry.type.should.be.equal(featureCollectionExample.features[0].geometry.type);
        geometry.should.have.a.property('coordinates');
        geometry.coordinates.should.be.an('array');
        geometry.coordinates.should.length(featureCollectionExample.features[0].geometry.coordinates.length);
    });

    it('Get geometry from from feature collection', () => {
        const geometry = GeoJSONConverter.getGeometry(featureCollectionExample);
        geometry.should.have.property('type');
        geometry.type.should.be.equal(geometryExample.type);
        geometry.should.have.a.property('coordinates');
        geometry.coordinates.should.be.an('array');
        geometry.coordinates.should.length(geometryExample.coordinates.length);
    });

    it('Get geometry from from feature collection', () => {
        const geometry = GeoJSONConverter.getGeometry(featureExample);
        geometry.should.have.property('type');
        geometry.type.should.be.equal(geometryExample.type);
        geometry.should.have.a.property('coordinates');
        geometry.coordinates.should.be.an('array');
        geometry.coordinates.should.length(geometryExample.coordinates.length);
    });

    it('Get geometry from from feature collection', () => {
        const geometry = GeoJSONConverter.getGeometry(geometryExample);
        geometry.should.have.property('type');
        geometry.type.should.be.equal(geometryExample.type);
        geometry.should.have.a.property('coordinates');
        geometry.coordinates.should.be.an('array');
        geometry.coordinates.should.length(geometryExample.coordinates.length);
    });
});
