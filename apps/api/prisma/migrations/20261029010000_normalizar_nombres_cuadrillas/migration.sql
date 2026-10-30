-- Sustituye nombres provisionales y residuos visibles de pruebas por nombres operativos.
UPDATE "cuadrillas"
SET "nombre" = 'Equipo Técnico Managua'
WHERE "nombre" = 'Cuadrilla Managua';

UPDATE "cuadrillas"
SET "nombre" = 'Atención de Emergencias'
WHERE "nombre" = 'Emergencias y guardias';

UPDATE "cuadrillas"
SET "nombre" = 'Equipo de Servicio Técnico'
WHERE lower("nombre") = 'los pepitos';

UPDATE "cuadrillas"
SET "nombre" = 'Equipo Operativo ' || lpad("id"::text, 3, '0')
WHERE "nombre" LIKE 'FLOW-%';
