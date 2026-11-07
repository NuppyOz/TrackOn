CREATE TYPE "EtapaOportunidadComercial" AS ENUM (
  'NUEVA',
  'CALIFICADA',
  'PROPUESTA',
  'GANADA',
  'PERDIDA'
);

CREATE TABLE "oportunidades_comerciales" (
  "id" SERIAL NOT NULL,
  "clienteId" INTEGER NOT NULL,
  "responsableId" INTEGER NOT NULL,
  "nombre" VARCHAR(150) NOT NULL,
  "etapa" "EtapaOportunidadComercial" NOT NULL DEFAULT 'NUEVA',
  "valorEstimado" DECIMAL(16,2),
  "proximaActividad" TIMESTAMPTZ(6),
  "nota" VARCHAR(1000),
  "version" INTEGER NOT NULL DEFAULT 1,
  "creadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "oportunidades_comerciales_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "cotizaciones_comerciales" ADD COLUMN "oportunidadId" INTEGER;

CREATE INDEX "oportunidades_comerciales_clienteId_etapa_actualizadaEn_idx"
  ON "oportunidades_comerciales"("clienteId", "etapa", "actualizadaEn");
CREATE INDEX "oportunidades_comerciales_responsableId_etapa_actualizadaEn_idx"
  ON "oportunidades_comerciales"("responsableId", "etapa", "actualizadaEn");
CREATE INDEX "cotizaciones_comerciales_oportunidadId_idx"
  ON "cotizaciones_comerciales"("oportunidadId");

ALTER TABLE "oportunidades_comerciales"
  ADD CONSTRAINT "oportunidades_comerciales_clienteId_fkey"
  FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "oportunidades_comerciales"
  ADD CONSTRAINT "oportunidades_comerciales_responsableId_fkey"
  FOREIGN KEY ("responsableId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cotizaciones_comerciales"
  ADD CONSTRAINT "cotizaciones_comerciales_oportunidadId_fkey"
  FOREIGN KEY ("oportunidadId") REFERENCES "oportunidades_comerciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
