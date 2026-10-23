-- CreateTable
CREATE TABLE "coberturas_gerenciales" (
    "id" SERIAL NOT NULL,
    "area" VARCHAR(20) NOT NULL,
    "desde" TIMESTAMPTZ(6) NOT NULL,
    "hastaVerificada" TIMESTAMPTZ(6) NOT NULL,
    "responsableId" INTEGER NOT NULL,
    "observacion" VARCHAR(1000),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "coberturas_gerenciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos_gerenciales" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "referencia" VARCHAR(100) NOT NULL,
    "inicio" TIMESTAMPTZ(6) NOT NULL,
    "fin" TIMESTAMPTZ(6) NOT NULL,
    "importe" DECIMAL(16,2) NOT NULL,
    "anteriorId" INTEGER,
    "terminadoEn" TIMESTAMPTZ(6),
    "registradoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autorId" INTEGER NOT NULL,
    "observacion" VARCHAR(1000),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "contratos_gerenciales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coberturas_gerenciales_area_key" ON "coberturas_gerenciales"("area");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_gerenciales_referencia_key" ON "contratos_gerenciales"("referencia");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_gerenciales_anteriorId_key" ON "contratos_gerenciales"("anteriorId");

-- CreateIndex
CREATE INDEX "contratos_gerenciales_clienteId_inicio_fin_idx" ON "contratos_gerenciales"("clienteId", "inicio", "fin");

-- AddForeignKey
ALTER TABLE "coberturas_gerenciales" ADD CONSTRAINT "coberturas_gerenciales_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_gerenciales" ADD CONSTRAINT "contratos_gerenciales_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_gerenciales" ADD CONSTRAINT "contratos_gerenciales_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos_gerenciales" ADD CONSTRAINT "contratos_gerenciales_anteriorId_fkey" FOREIGN KEY ("anteriorId") REFERENCES "contratos_gerenciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE coberturas_gerenciales ADD CONSTRAINT cobertura_fechas_validas CHECK ("desde" < "hastaVerificada" AND version >= 1 AND area IN ('COMERCIAL','FINANCIERO','LOGISTICO','CALIDAD'));
ALTER TABLE contratos_gerenciales ADD CONSTRAINT contrato_datos_validos CHECK (inicio < fin AND importe >= 0 AND version >= 1 AND ("anteriorId" IS NULL OR "anteriorId" <> id) AND ("terminadoEn" IS NULL OR "terminadoEn" >= inicio AND "terminadoEn" <= fin));
