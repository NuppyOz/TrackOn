-- Conserva relaciones e historial, pero retira de la operación los registros
-- creados por suites de integración ejecutadas contra la base de desarrollo.
WITH empleados_prueba AS (
    SELECT "id"
    FROM "empleados"
    WHERE "codEmpleado" LIKE 'FLOW-%'
       OR "codEmpleado" LIKE 'TEST-%'
       OR "codEmpleado" LIKE 'BS02-%'
       OR "codEmpleado" LIKE 'BS03-%'
       OR "codEmpleado" LIKE 'COTIZ-%'
       OR "codEmpleado" LIKE 'FIN-CONC-%'
       OR "codEmpleado" LIKE 'H5-%'
       OR "codEmpleado" LIKE 'H6-%'
       OR "codEmpleado" LIKE 'H7-%'
       OR "codEmpleado" LIKE 'H8-%'
       OR "codEmpleado" LIKE 'IA-HTTP-%'
       OR "codEmpleado" LIKE 'IDEMP-%'
       OR "codEmpleado" LIKE 'PORTAL-%'
       OR "codEmpleado" LIKE 'TARIFAS-%'
       OR "codEmpleado" LIKE 'VENTA-%'
)
UPDATE "usuarios"
SET "activo" = false
WHERE "empleadoId" IN (SELECT "id" FROM empleados_prueba);

UPDATE "empleados"
SET "active" = false,
    "habilitadoComoTecnico" = false
WHERE "codEmpleado" LIKE 'FLOW-%'
   OR "codEmpleado" LIKE 'TEST-%'
   OR "codEmpleado" LIKE 'BS02-%'
   OR "codEmpleado" LIKE 'BS03-%'
   OR "codEmpleado" LIKE 'COTIZ-%'
   OR "codEmpleado" LIKE 'FIN-CONC-%'
   OR "codEmpleado" LIKE 'H5-%'
   OR "codEmpleado" LIKE 'H6-%'
   OR "codEmpleado" LIKE 'H7-%'
   OR "codEmpleado" LIKE 'H8-%'
   OR "codEmpleado" LIKE 'IA-HTTP-%'
   OR "codEmpleado" LIKE 'IDEMP-%'
   OR "codEmpleado" LIKE 'PORTAL-%'
   OR "codEmpleado" LIKE 'TARIFAS-%'
   OR "codEmpleado" LIKE 'VENTA-%';

UPDATE "cuadrillas"
SET "activa" = false
WHERE "nombre" LIKE 'Equipo Operativo %';

UPDATE "empleados" SET "codEmpleado" = 'ADM-001' WHERE "codEmpleado" = 'DEV-ADMIN';
UPDATE "personas" p
SET "firstLastName" = 'Sistema'
FROM "empleados" e
WHERE e."personaId" = p."id" AND e."codEmpleado" = 'ADM-001';

UPDATE "empleados" SET "codEmpleado" = 'TEC-004' WHERE "codEmpleado" = 'DEV-TEC';
UPDATE "personas" p
SET "firstLastName" = 'Soporte'
FROM "empleados" e
WHERE e."personaId" = p."id" AND e."codEmpleado" = 'TEC-004';
