-- Archiva datos creados por pruebas y deja identificadores comprensibles aun
-- cuando se consultan registros inactivos o actores históricos.
UPDATE "clientes"
SET "activo" = false
WHERE "codigo" LIKE 'FLOW-%' OR "codigo" LIKE 'TEST-%';

UPDATE "equipos"
SET "activo" = false
WHERE "codigo" LIKE 'FLOW-%';

UPDATE "servicios"
SET "activo" = false
WHERE "codigo" LIKE 'FLOW-%';

UPDATE "materiales"
SET "activo" = false
WHERE "codigo" LIKE 'FLOW-%';

UPDATE "servicios"
SET "codigo" = 'SRV-AC',
    "nombre" = 'Mantenimiento de aire acondicionado',
    "descripcion" = 'Limpieza, inspección y ajuste general del sistema de aire acondicionado.'
WHERE "codigo" = '123123';

UPDATE "usuarios" u
SET "identificador" = 'archivado.usuario.' || lpad(u."id"::text, 3, '0')
FROM "empleados" e
WHERE u."empleadoId" = e."id" AND e."active" = false;

UPDATE "empleados"
SET "codEmpleado" = 'ARCH-EMP-' || lpad("id"::text, 3, '0')
WHERE "active" = false;

UPDATE "personas" p
SET "firstName" = 'Registro',
    "secondName" = NULL,
    "firstLastName" = 'Archivado',
    "secondLastName" = NULL
FROM "empleados" e
WHERE e."personaId" = p."id" AND e."active" = false;

INSERT INTO "materiales" ("codigo", "nombre", "unidadMedida", "activo")
VALUES
    ('MAT-REF-001', 'Refrigerante R-410A', 'kg', true),
    ('MAT-TUB-001', 'Tubería de cobre para refrigeración', 'metro', true),
    ('MAT-ELE-001', 'Capacitor eléctrico', 'unidad', true)
ON CONFLICT ("codigo") DO UPDATE
SET "nombre" = EXCLUDED."nombre",
    "unidadMedida" = EXCLUDED."unidadMedida",
    "activo" = true;
