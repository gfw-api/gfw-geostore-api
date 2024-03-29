const DEFAULT_GEOJSON = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'MultiPoint',
                coordinates: [
                    [14.26438308756265, 14.062500000000002],
                    [5.266007882805498, 2.8125],
                    [44.84029065139799, 16.523437500000004],
                ],
            },
        },
    ],
};

const ANTIMERIDIAN_GEOJSON_WRONG = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [
                        [177.066650390625, -20.663626054152797],
                        [-173.759765625, -20.663626054152797],
                        [-173.759765625, -13.218555949175457],
                        [177.066650390625, -13.218555949175457],
                        [177.066650390625, -20.663626054152797],
                    ],
                ],
            },
        },
    ],
};

const ANTIMERIDIAN_GEOJSON = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'MultiPolygon',
                coordinates: [
                    [[
                        [176.515420, -34.184289],
                        [180, -34.184289],
                        [180, -27.592584],
                        [176.515420, -27.592584],
                        [176.515420, -34.184289],
                    ],
                    ],
                    [[
                        [-180, -34.184289],
                        [-173, -34.184289],
                        [-173, -27.592584],
                        [-180, -27.592584],
                        [-180, -34.184289],
                    ],
                    ]
                ],
            },
        }
    ],
};

const MOCK_RESULT_CARTODB = [
    {
        geojson:
            '{"type":"MultiPolygon","coordinates":[[[[7.4134,43.7346],[7.4396,43.7492],[7.4179,43.7226],[7.4095,43.7299],[7.4134,43.7346]]]]}',
        area_ha: 235.490994944,
        name: 'Monaco',
    },
];

const APPLICATION = {
    data: {
        type: 'applications',
        id: '649c4b204967792f3a4e52c9',
        attributes: {
            name: 'grouchy-armpit',
            organization: null,
            user: null,
            apiKeyValue: 'a1a9e4c3-bdff-4b6b-b5ff-7a60a0454e13',
            createdAt: '2023-06-28T15:00:48.149Z',
            updatedAt: '2023-06-28T15:00:48.149Z'
        }
    }
};

module.exports = {
    DEFAULT_GEOJSON, ANTIMERIDIAN_GEOJSON, ANTIMERIDIAN_GEOJSON_WRONG, MOCK_RESULT_CARTODB, APPLICATION
};
