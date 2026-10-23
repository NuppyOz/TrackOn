-- CreateTable
CREATE TABLE "comprobantes_gerenciales" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "referencia" VARCHAR(100) NOT NULL,
    "emisor" VARCHAR(100) NOT NULL,
    "emitidaEn" TIMESTAMPTZ(6) NOT NULL,
    "venceEn" TIMESTAMPTZ(6) NOT NULL,
    "importeFinal" DECIMAL(16,2) NOT NULL,
    "moneda" VARCHAR(3) NOT NULL DEFAULT 'NIO',
    "anuladaEn" TIMESTAMPTZ(6),
    "motivoAnulacion" VARCHAR(1000),
    "registradoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autorId" INTEGER NOT NULL,
    "observacion" VARCHAR(1000),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "comprobantes_gerenciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lineas_comprobantes_gerenciales" (
    "id" SERIAL NOT NULL,
    "comprobanteId" INTEGER NOT NULL,
    "descripcion" VARCHAR(200) NOT NULL,
    "importe" DECIMAL(16,2) NOT NULL,
    "ordenId" INTEGER,
    "conceptoId" INTEGER,

    CONSTRAINT "lineas_comprobantes_gerenciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facturables_gerenciales" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "conceptoId" INTEGER NOT NULL,
    "ordenId" INTEGER,
    "ventaId" INTEGER,
    "lineaCotizacionId" INTEGER,
    "referencia" VARCHAR(100) NOT NULL,
    "fechaEfectiva" TIMESTAMPTZ(6) NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "unidad" VARCHAR(30) NOT NULL,
    "autorId" INTEGER NOT NULL,
    "registradoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacion" VARCHAR(1000),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "facturables_gerenciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aplicaciones_facturables_gerenciales" (
    "id" SERIAL NOT NULL,
    "facturableId" INTEGER NOT NULL,
    "lineaComprobanteId" INTEGER NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "fechaEfectiva" TIMESTAMPTZ(6) NOT NULL,
    "autorId" INTEGER NOT NULL,

    CONSTRAINT "aplicaciones_facturables_gerenciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cobros_gerenciales" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "referencia" VARCHAR(100) NOT NULL,
    "fechaEfectiva" TIMESTAMPTZ(6) NOT NULL,
    "importe" DECIMAL(16,2) NOT NULL,
    "revertidoEn" TIMESTAMPTZ(6),
    "motivoReversion" VARCHAR(1000),
    "autorId" INTEGER NOT NULL,
    "registradoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacion" VARCHAR(1000),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "cobros_gerenciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aplicaciones_cobros_gerenciales" (
    "id" SERIAL NOT NULL,
    "cobroId" INTEGER NOT NULL,
    "comprobanteId" INTEGER NOT NULL,
    "importe" DECIMAL(16,2) NOT NULL,

    CONSTRAINT "aplicaciones_cobros_gerenciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "costos_gerenciales" (
    "id" SERIAL NOT NULL,
    "referencia" VARCHAR(100) NOT NULL,
    "fechaEfectiva" TIMESTAMPTZ(6) NOT NULL,
    "categoria" VARCHAR(30) NOT NULL,
    "importe" DECIMAL(16,2) NOT NULL,
    "clienteId" INTEGER,
    "ordenId" INTEGER,
    "comprobanteId" INTEGER,
    "revertidoEn" TIMESTAMPTZ(6),
    "motivoReversion" VARCHAR(1000),
    "autorId" INTEGER NOT NULL,
    "registradoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacion" VARCHAR(1000),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "costos_gerenciales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comprobantes_gerenciales_clienteId_emitidaEn_idx" ON "comprobantes_gerenciales"("clienteId", "emitidaEn");

-- CreateIndex
CREATE UNIQUE INDEX "comprobantes_gerenciales_emisor_referencia_key" ON "comprobantes_gerenciales"("emisor", "referencia");

-- CreateIndex
CREATE INDEX "lineas_comprobantes_gerenciales_comprobanteId_idx" ON "lineas_comprobantes_gerenciales"("comprobanteId");

-- CreateIndex
CREATE UNIQUE INDEX "facturables_gerenciales_lineaCotizacionId_key" ON "facturables_gerenciales"("lineaCotizacionId");

-- CreateIndex
CREATE UNIQUE INDEX "facturables_gerenciales_referencia_key" ON "facturables_gerenciales"("referencia");

-- CreateIndex
CREATE INDEX "facturables_gerenciales_clienteId_fechaEfectiva_idx" ON "facturables_gerenciales"("clienteId", "fechaEfectiva");

-- CreateIndex
CREATE INDEX "aplicaciones_facturables_gerenciales_facturableId_idx" ON "aplicaciones_facturables_gerenciales"("facturableId");

-- CreateIndex
CREATE INDEX "cobros_gerenciales_fechaEfectiva_idx" ON "cobros_gerenciales"("fechaEfectiva");

-- CreateIndex
CREATE UNIQUE INDEX "cobros_gerenciales_clienteId_referencia_key" ON "cobros_gerenciales"("clienteId", "referencia");

-- CreateIndex
CREATE INDEX "aplicaciones_cobros_gerenciales_comprobanteId_idx" ON "aplicaciones_cobros_gerenciales"("comprobanteId");

-- CreateIndex
CREATE UNIQUE INDEX "aplicaciones_cobros_gerenciales_cobroId_comprobanteId_key" ON "aplicaciones_cobros_gerenciales"("cobroId", "comprobanteId");

-- CreateIndex
CREATE UNIQUE INDEX "costos_gerenciales_referencia_key" ON "costos_gerenciales"("referencia");

-- CreateIndex
CREATE INDEX "costos_gerenciales_fechaEfectiva_clienteId_idx" ON "costos_gerenciales"("fechaEfectiva", "clienteId");

-- AddForeignKey
ALTER TABLE "comprobantes_gerenciales" ADD CONSTRAINT "comprobantes_gerenciales_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprobantes_gerenciales" ADD CONSTRAINT "comprobantes_gerenciales_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_comprobantes_gerenciales" ADD CONSTRAINT "lineas_comprobantes_gerenciales_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES "comprobantes_gerenciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_comprobantes_gerenciales" ADD CONSTRAINT "lineas_comprobantes_gerenciales_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes_trabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_comprobantes_gerenciales" ADD CONSTRAINT "lineas_comprobantes_gerenciales_conceptoId_fkey" FOREIGN KEY ("conceptoId") REFERENCES "conceptos_comerciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturables_gerenciales" ADD CONSTRAINT "facturables_gerenciales_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturables_gerenciales" ADD CONSTRAINT "facturables_gerenciales_conceptoId_fkey" FOREIGN KEY ("conceptoId") REFERENCES "conceptos_comerciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturables_gerenciales" ADD CONSTRAINT "facturables_gerenciales_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes_trabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturables_gerenciales" ADD CONSTRAINT "facturables_gerenciales_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas_comerciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturables_gerenciales" ADD CONSTRAINT "facturables_gerenciales_lineaCotizacionId_fkey" FOREIGN KEY ("lineaCotizacionId") REFERENCES "lineas_cotizaciones_comerciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturables_gerenciales" ADD CONSTRAINT "facturables_gerenciales_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aplicaciones_facturables_gerenciales" ADD CONSTRAINT "aplicaciones_facturables_gerenciales_facturableId_fkey" FOREIGN KEY ("facturableId") REFERENCES "facturables_gerenciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aplicaciones_facturables_gerenciales" ADD CONSTRAINT "aplicaciones_facturables_gerenciales_lineaComprobanteId_fkey" FOREIGN KEY ("lineaComprobanteId") REFERENCES "lineas_comprobantes_gerenciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aplicaciones_facturables_gerenciales" ADD CONSTRAINT "aplicaciones_facturables_gerenciales_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobros_gerenciales" ADD CONSTRAINT "cobros_gerenciales_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobros_gerenciales" ADD CONSTRAINT "cobros_gerenciales_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aplicaciones_cobros_gerenciales" ADD CONSTRAINT "aplicaciones_cobros_gerenciales_cobroId_fkey" FOREIGN KEY ("cobroId") REFERENCES "cobros_gerenciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aplicaciones_cobros_gerenciales" ADD CONSTRAINT "aplicaciones_cobros_gerenciales_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES "comprobantes_gerenciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costos_gerenciales" ADD CONSTRAINT "costos_gerenciales_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costos_gerenciales" ADD CONSTRAINT "costos_gerenciales_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes_trabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costos_gerenciales" ADD CONSTRAINT "costos_gerenciales_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES "comprobantes_gerenciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costos_gerenciales" ADD CONSTRAINT "costos_gerenciales_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE comprobantes_gerenciales ADD CONSTRAINT comprobante_datos_validos CHECK ("importeFinal" > 0 AND moneda = 'NIO' AND "venceEn" >= "emitidaEn" AND version >= 1 AND (("anuladaEn" IS NULL AND "motivoAnulacion" IS NULL) OR ("anuladaEn" IS NOT NULL AND "anuladaEn" >= "emitidaEn" AND "motivoAnulacion" IS NOT NULL)));
ALTER TABLE lineas_comprobantes_gerenciales ADD CONSTRAINT linea_comprobante_importe_valido CHECK (importe >= 0);
ALTER TABLE facturables_gerenciales ADD CONSTRAINT facturable_datos_validos CHECK (cantidad > 0 AND version >= 1 AND (("ventaId" IS NULL AND "lineaCotizacionId" IS NULL) OR ("ventaId" IS NOT NULL AND "lineaCotizacionId" IS NOT NULL)));
ALTER TABLE aplicaciones_facturables_gerenciales ADD CONSTRAINT aplicacion_facturable_cantidad_valida CHECK (cantidad > 0);
ALTER TABLE cobros_gerenciales ADD CONSTRAINT cobro_datos_validos CHECK (importe > 0 AND version >= 1 AND (("revertidoEn" IS NULL AND "motivoReversion" IS NULL) OR ("revertidoEn" IS NOT NULL AND "revertidoEn" >= "fechaEfectiva" AND "motivoReversion" IS NOT NULL)));
ALTER TABLE aplicaciones_cobros_gerenciales ADD CONSTRAINT aplicacion_cobro_importe_valido CHECK (importe > 0);
ALTER TABLE costos_gerenciales ADD CONSTRAINT costo_datos_validos CHECK (importe > 0 AND version >= 1 AND categoria IN ('MANO_OBRA','MATERIAL','TRANSPORTE','OTRO') AND (("revertidoEn" IS NULL AND "motivoReversion" IS NULL) OR ("revertidoEn" IS NOT NULL AND "revertidoEn" >= "fechaEfectiva" AND "motivoReversion" IS NOT NULL)));
