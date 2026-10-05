-- El liderazgo pertenece a una membresía vigente, no al empleado de forma global.
ALTER TABLE "miembros_cuadrilla"
ADD COLUMN "esLider" BOOLEAN NOT NULL DEFAULT false;

-- Impide dos líderes vigentes y permite conservar líderes históricos.
CREATE UNIQUE INDEX "miembros_cuadrilla_un_lider_vigente"
ON "miembros_cuadrilla" ("cuadrillaId")
WHERE "fin" IS NULL AND "esLider" = true;
