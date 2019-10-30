const createQueryISOName = (iso) => `SELECT iso, name_0 as name
        FROM gadm2_countries_simple
        WHERE iso in ${iso}`;

const createQueryID1 = (id, iso) => `SELECT ST_AsGeoJSON(st_makevalid(the_geom)) AS geojson, (ST_Area(geography(the_geom))/10000) as area_ha
        FROM gadm28_adm1
        WHERE iso = UPPER('${iso}')
          AND id_1 = ${id}`;

const createQueryID1AndID2 = (id1, id2, iso) => `SELECT ST_AsGeoJSON(st_makevalid(the_geom)) AS geojson, (ST_Area(geography(the_geom))/10000) as area_ha
        FROM gadm28_adm2_geostore
        WHERE iso = UPPER('${iso}')
          AND id_1 = ${id1}
          AND id_2 = ${id2}`;

const createQueryUSE = (cartodbId, useTable) => `SELECT ST_AsGeoJSON(st_makevalid(the_geom)) AS geojson, (ST_Area(geography(the_geom))/10000) as area_ha
        FROM ${useTable}
        WHERE cartodb_id = ${cartodbId}`;

const createQueryWDPA = (wdpaId) => `SELECT ST_AsGeoJSON(st_makevalid(p.the_geom)) AS geojson, (ST_Area(geography(the_geom))/10000) as area_ha
        FROM (
          SELECT CASE
          WHEN marine::numeric = 2 THEN NULL
            WHEN ST_NPoints(the_geom)<=18000 THEN the_geom
            WHEN ST_NPoints(the_geom) BETWEEN 18000 AND 50000 THEN ST_RemoveRepeatedPoints(the_geom, 0.001)
            ELSE ST_RemoveRepeatedPoints(the_geom, 0.005)
            END AS the_geom
          FROM wdpa_protected_areas
          WHERE wdpaid=${wdpaId}
        ) p`;

const createQueryGeometry = (data) => `SELECT ST_AsGeoJson(ST_CollectionExtract(st_MakeValid(ST_GeomFromGeoJSON('${data}')),3)) as geojson`;

module.exports = {
    createQueryID1,
    createQueryISOName,
    createQueryGeometry,
    createQueryID1AndID2,
    createQueryUSE,
    createQueryWDPA
};
