-- CreateTable
CREATE TABLE "garantias_gerenciales" (
    "id" SERIAL NOT NULL,
    "referencia" VARCHAR(100) NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "activoReferencia" VARCHAR(100) NOT NULL,
    "equipoId" INTEGER,
    "ordenId" INTEGER,
    "inicio" TIMESTAMPTZ(6) NOT NULL,
    "fin" TIMESTAMPTZ(6) NOT NULL,
    "cobertura" VARCHAR(2000) NOT NULL,
    "exclusiones" VARCHAR(2000),
    "autorId" INTEGER NOT NULL,
    "registradaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "garantias_gerenciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "casos_calidad_gerenciales" (
    "id" SERIAL NOT NULL,
    "referencia" VARCHAR(100) NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "activoReferencia" VARCHAR(100) NOT NULL,
    "codigoFalla" VARCHAR(60) NOT NULL,
    "descripcion" VARCHAR(2000) NOT NULL,
    "equipoId" INTEGER,
    "ordenId" INTEGER,
    "garantiaId" INTEGER,
    "anteriorId" INTEGER,
    "abiertaEn" TIMESTAMPTZ(6) NOT NULL,
    "respuestaLimiteEn" TIMESTAMPTZ(6),
    "resolucionLimiteEn" TIMESTAMPTZ(6),
    "respondidaEn" TIMESTAMPTZ(6),
    "resueltaEn" TIMESTAMPTZ(6),
    "cerradaEn" TIMESTAMPTZ(6),
    "resultado" VARCHAR(20),
    "causaRaiz" VARCHAR(2000),
    "autorId" INTEGER NOT NULL,
    "registradaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "casos_calidad_gerenciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retrabajos_gerenciales" (
    "id" SERIAL NOT NULL,
    "casoId" INTEGER NOT NULL,
    "referenciaTrabajo" VARCHAR(100) NOT NULL,
    "fechaEfectiva" TIMESTAMPTZ(6) NOT NULL,
    "motivo" VARCHAR(2000) NOT NULL,
    "ordenId" INTEGER,
    "autorId" INTEGER NOT NULL,
    "registradoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retrabajos_gerenciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correctivas_gerenciales" (
    "id" SERIAL NOT NULL,
    "casoId" INTEGER NOT NULL,
    "descripcion" VARCHAR(2000) NOT NULL,
    "responsableId" INTEGER NOT NULL,
    "creadaEn" TIMESTAMPTZ(6) NOT NULL,
    "venceEn" TIMESTAMPTZ(6) NOT NULL,
    "cerradaEn" TIMESTAMPTZ(6),
    "resultado" VARCHAR(2000),
    "autorId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "correctivas_gerenciales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "garantias_gerenciales_referencia_key" ON "garantias_gerenciales"("referencia");

-- CreateIndex
CREATE INDEX "garantias_gerenciales_inicio_fin_idx" ON "garantias_gerenciales"("inicio", "fin");

-- CreateIndex
CREATE UNIQUE INDEX "casos_calidad_gerenciales_referencia_key" ON "casos_calidad_gerenciales"("referencia");

-- CreateIndex
CREATE INDEX "casos_calidad_gerenciales_activoReferencia_codigoFalla_abie_idx" ON "casos_calidad_gerenciales"("activoReferencia", "codigoFalla", "abiertaEn");

-- CreateIndex
CREATE UNIQUE INDEX "retrabajos_gerenciales_referenciaTrabajo_key" ON "retrabajos_gerenciales"("referenciaTrabajo");

-- CreateIndex
CREATE INDEX "correctivas_gerenciales_venceEn_cerradaEn_idx" ON "correctivas_gerenciales"("venceEn", "cerradaEn");

-- AddForeignKey
ALTER TABLE "garantias_gerenciales" ADD CONSTRAINT "garantias_gerenciales_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garantias_gerenciales" ADD CONSTRAINT "garantias_gerenciales_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garantias_gerenciales" ADD CONSTRAINT "garantias_gerenciales_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes_trabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garantias_gerenciales" ADD CONSTRAINT "garantias_gerenciales_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casos_calidad_gerenciales" ADD CONSTRAINT "casos_calidad_gerenciales_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casos_calidad_gerenciales" ADD CONSTRAINT "casos_calidad_gerenciales_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casos_calidad_gerenciales" ADD CONSTRAINT "casos_calidad_gerenciales_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes_trabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casos_calidad_gerenciales" ADD CONSTRAINT "casos_calidad_gerenciales_garantiaId_fkey" FOREIGN KEY ("garantiaId") REFERENCES "garantias_gerenciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casos_calidad_gerenciales" ADD CONSTRAINT "casos_calidad_gerenciales_anteriorId_fkey" FOREIGN KEY ("anteriorId") REFERENCES "casos_calidad_gerenciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "casos_calidad_gerenciales" ADD CONSTRAINT "casos_calidad_gerenciales_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retrabajos_gerenciales" ADD CONSTRAINT "retrabajos_gerenciales_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "casos_calidad_gerenciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retrabajos_gerenciales" ADD CONSTRAINT "retrabajos_gerenciales_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes_trabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retrabajos_gerenciales" ADD CONSTRAINT "retrabajos_gerenciales_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correctivas_gerenciales" ADD CONSTRAINT "correctivas_gerenciales_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "casos_calidad_gerenciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correctivas_gerenciales" ADD CONSTRAINT "correctivas_gerenciales_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correctivas_gerenciales" ADD CONSTRAINT "correctivas_gerenciales_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE garantias_gerenciales ADD CONSTRAINT garantia_datos_validos CHECK (inicio < fin AND tipo IN ('SERVICIO','EQUIPO','REPUESTO','COMPONENTE'));
ALTER TABLE casos_calidad_gerenciales ADD CONSTRAINT caso_fechas_validas CHECK (version >= 1 AND ("anteriorId" IS NULL OR "anteriorId" <> id) AND ("respuestaLimiteEn" IS NULL OR "respuestaLimiteEn" >= "abiertaEn") AND ("resolucionLimiteEn" IS NULL OR "resolucionLimiteEn" >= "abiertaEn") AND ("respuestaLimiteEn" IS NULL OR "resolucionLimiteEn" IS NULL OR "resolucionLimiteEn" >= "respuestaLimiteEn") AND ("respondidaEn" IS NULL OR "respondidaEn" >= "abiertaEn") AND (("resueltaEn" IS NULL AND resultado IS NULL AND "causaRaiz" IS NULL) OR ("resueltaEn" IS NOT NULL AND "respondidaEn" IS NOT NULL AND "resueltaEn" >= "respondidaEn" AND resultado IS NOT NULL AND resultado IN ('PROCEDE','NO_PROCEDE') AND "causaRaiz" IS NOT NULL)) AND ("cerradaEn" IS NULL OR "resueltaEn" IS NOT NULL AND "cerradaEn" >= "resueltaEn"));
ALTER TABLE correctivas_gerenciales ADD CONSTRAINT correctiva_fechas_validas CHECK (version >= 1 AND "venceEn" >= "creadaEn" AND (("cerradaEn" IS NULL AND resultado IS NULL) OR ("cerradaEn" IS NOT NULL AND "cerradaEn" >= "creadaEn" AND resultado IS NOT NULL)));
