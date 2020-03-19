const createQueryISOName = (iso) => `SELECT gid_0 as iso, name_0 as name
        FROM gadm36_adm0
        WHERE gid_0 in ${iso}`;

const createQueryWDPA = (wdpaId) => `SELECT ST_AsGeoJSON(ST_MAKEVALID(p.the_geom)) AS geojson, (ST_Area(geography(the_geom))/10000) as area_ha
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

module.exports = { createQueryWDPA, createQueryISOName };
