const DEFAULT_GEOJSON = {
    type: 'FeatureCollection',
    features: [{
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'MultiPoint',
            coordinates: [
                [
                    14.26438308756265,
                    14.062500000000002
                ],
                [
                    5.266007882805498,
                    2.8125
                ],
                [
                    44.84029065139799,
                    16.523437500000004
                ],
            ]
        }
    }],
};

const ANTIMERIDIAN_GEOJSON = {
    type: 'FeatureCollection',
    features: [{
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'Polygon',
            coordinates: [
                [
                    [
                        176.55029296875,
                        -20.11783963049162
                    ],
                    [
                        183.09814453125,
                        -20.11783963049162
                    ],
                    [
                        183.09814453125,
                        -14.827991347352068
                    ],
                    [
                        176.55029296875,
                        -14.827991347352068
                    ],
                    [
                        176.55029296875,
                        -20.11783963049162
                    ]
                ]
            ]
        }
    }],
};

const MOCK_RESULT_CARTODB = [{
    geojson: '{"type":"MultiPolygon","coordinates":[[[[7.4134,43.7346],[7.4396,43.7492],[7.4179,43.7226],[7.4095,43.7299],[7.4134,43.7346]]]]}',
    area_ha: 235.490994944,
    name: 'Monaco'
}];

module.exports = { DEFAULT_GEOJSON, ANTIMERIDIAN_GEOJSON, MOCK_RESULT_CARTODB };
