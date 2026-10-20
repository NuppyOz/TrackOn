-- CreateTable
CREATE TABLE "articulos_gerenciales" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(60) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "unidad" VARCHAR(30) NOT NULL,
    "materialId" INTEGER,
    "minimo" DECIMAL(12,3) NOT NULL,
    "saldoCantidad" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "saldoValor" DECIMAL(30,9) NOT NULL DEFAULT 0,
    "ultimaFecha" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "creadoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autorId" INTEGER NOT NULL,

    CONSTRAINT "articulos_gerenciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_gerenciales" (
    "id" SERIAL NOT NULL,
    "articuloId" INTEGER NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "sentido" INTEGER NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "valor" DECIMAL(30,9) NOT NULL,
    "saldoCantidad" DECIMAL(12,3) NOT NULL,
    "saldoValor" DECIMAL(30,9) NOT NULL,
    "referencia" VARCHAR(100) NOT NULL,
    "fechaEfectiva" TIMESTAMPTZ(6) NOT NULL,
    "registradoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacion" VARCHAR(1000) NOT NULL,
    "origenId" INTEGER,
    "ordenId" INTEGER,
    "autorId" INTEGER NOT NULL,

    CONSTRAINT "movimientos_gerenciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compras_gerenciales" (
    "id" SERIAL NOT NULL,
    "proveedor" VARCHAR(150) NOT NULL,
    "referencia" VARCHAR(100) NOT NULL,
    "fechaEfectiva" TIMESTAMPTZ(6) NOT NULL,
    "registradoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autorId" INTEGER NOT NULL,
    "observacion" VARCHAR(1000),

    CONSTRAINT "compras_gerenciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lineas_compras_gerenciales" (
    "id" SERIAL NOT NULL,
    "compraId" INTEGER NOT NULL,
    "articuloId" INTEGER NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "costoUnitario" DECIMAL(16,6) NOT NULL,
    "prometidaEn" TIMESTAMPTZ(6) NOT NULL,
    "canceladaEn" TIMESTAMPTZ(6),
    "cantidadCancelada" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "motivoCancelacion" VARCHAR(1000),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "lineas_compras_gerenciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recepciones_gerenciales" (
    "id" SERIAL NOT NULL,
    "lineaId" INTEGER NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "fechaEfectiva" TIMESTAMPTZ(6) NOT NULL,
    "referencia" VARCHAR(100) NOT NULL,
    "movimientoId" INTEGER NOT NULL,
    "autorId" INTEGER NOT NULL,
    "observacion" VARCHAR(1000),

    CONSTRAINT "recepciones_gerenciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "herramientas_gerenciales" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(60) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "creadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autorId" INTEGER NOT NULL,

    CONSTRAINT "herramientas_gerenciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prestamos_herramientas_gerenciales" (
    "id" SERIAL NOT NULL,
    "herramientaId" INTEGER NOT NULL,
    "empleadoId" INTEGER NOT NULL,
    "prestadaEn" TIMESTAMPTZ(6) NOT NULL,
    "previstaEn" TIMESTAMPTZ(6) NOT NULL,
    "devueltaEn" TIMESTAMPTZ(6),
    "referencia" VARCHAR(100) NOT NULL,
    "observacion" VARCHAR(1000),
    "autorId" INTEGER NOT NULL,
    "devueltaPorId" INTEGER,

    CONSTRAINT "prestamos_herramientas_gerenciales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "articulos_gerenciales_codigo_key" ON "articulos_gerenciales"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "articulos_gerenciales_materialId_key" ON "articulos_gerenciales"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "movimientos_gerenciales_referencia_key" ON "movimientos_gerenciales"("referencia");

-- CreateIndex
CREATE INDEX "movimientos_gerenciales_articuloId_fechaEfectiva_id_idx" ON "movimientos_gerenciales"("articuloId", "fechaEfectiva", "id");

-- CreateIndex
CREATE UNIQUE INDEX "compras_gerenciales_proveedor_referencia_key" ON "compras_gerenciales"("proveedor", "referencia");

-- CreateIndex
CREATE INDEX "lineas_compras_gerenciales_articuloId_idx" ON "lineas_compras_gerenciales"("articuloId");

-- CreateIndex
CREATE UNIQUE INDEX "recepciones_gerenciales_referencia_key" ON "recepciones_gerenciales"("referencia");

-- CreateIndex
CREATE UNIQUE INDEX "recepciones_gerenciales_movimientoId_key" ON "recepciones_gerenciales"("movimientoId");

-- CreateIndex
CREATE INDEX "recepciones_gerenciales_fechaEfectiva_idx" ON "recepciones_gerenciales"("fechaEfectiva");

-- CreateIndex
CREATE UNIQUE INDEX "herramientas_gerenciales_codigo_key" ON "herramientas_gerenciales"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "prestamos_herramientas_gerenciales_referencia_key" ON "prestamos_herramientas_gerenciales"("referencia");

-- CreateIndex
CREATE INDEX "prestamos_herramientas_gerenciales_herramientaId_prestadaEn_idx" ON "prestamos_herramientas_gerenciales"("herramientaId", "prestadaEn");

-- AddForeignKey
ALTER TABLE "articulos_gerenciales" ADD CONSTRAINT "articulos_gerenciales_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articulos_gerenciales" ADD CONSTRAINT "articulos_gerenciales_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_gerenciales" ADD CONSTRAINT "movimientos_gerenciales_articuloId_fkey" FOREIGN KEY ("articuloId") REFERENCES "articulos_gerenciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_gerenciales" ADD CONSTRAINT "movimientos_gerenciales_origenId_fkey" FOREIGN KEY ("origenId") REFERENCES "movimientos_gerenciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_gerenciales" ADD CONSTRAINT "movimientos_gerenciales_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes_trabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_gerenciales" ADD CONSTRAINT "movimientos_gerenciales_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras_gerenciales" ADD CONSTRAINT "compras_gerenciales_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_compras_gerenciales" ADD CONSTRAINT "lineas_compras_gerenciales_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras_gerenciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_compras_gerenciales" ADD CONSTRAINT "lineas_compras_gerenciales_articuloId_fkey" FOREIGN KEY ("articuloId") REFERENCES "articulos_gerenciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepciones_gerenciales" ADD CONSTRAINT "recepciones_gerenciales_lineaId_fkey" FOREIGN KEY ("lineaId") REFERENCES "lineas_compras_gerenciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepciones_gerenciales" ADD CONSTRAINT "recepciones_gerenciales_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "movimientos_gerenciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recepciones_gerenciales" ADD CONSTRAINT "recepciones_gerenciales_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "herramientas_gerenciales" ADD CONSTRAINT "herramientas_gerenciales_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamos_herramientas_gerenciales" ADD CONSTRAINT "prestamos_herramientas_gerenciales_herramientaId_fkey" FOREIGN KEY ("herramientaId") REFERENCES "herramientas_gerenciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamos_herramientas_gerenciales" ADD CONSTRAINT "prestamos_herramientas_gerenciales_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamos_herramientas_gerenciales" ADD CONSTRAINT "prestamos_herramientas_gerenciales_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamos_herramientas_gerenciales" ADD CONSTRAINT "prestamos_herramientas_gerenciales_devueltaPorId_fkey" FOREIGN KEY ("devueltaPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE articulos_gerenciales ADD CONSTRAINT articulo_saldos_validos CHECK (minimo >= 0 AND "saldoCantidad" >= 0 AND "saldoValor" >= 0 AND ("saldoCantidad" <> 0 OR "saldoValor" = 0) AND version >= 1);
ALTER TABLE movimientos_gerenciales ADD CONSTRAINT movimiento_datos_validos CHECK (tipo IN ('APERTURA','ENTRADA','CONSUMO','DEVOLUCION','AJUSTE_POSITIVO','AJUSTE_NEGATIVO','REVERSO') AND sentido IN (-1,1) AND cantidad >= 0 AND (cantidad > 0 OR tipo = 'APERTURA') AND valor >= 0 AND "saldoCantidad" >= 0 AND "saldoValor" >= 0 AND ("saldoCantidad" <> 0 OR "saldoValor" = 0) AND (tipo NOT IN ('APERTURA','ENTRADA','DEVOLUCION','AJUSTE_POSITIVO') OR sentido = 1) AND (tipo NOT IN ('CONSUMO','AJUSTE_NEGATIVO') OR sentido = -1) AND (tipo NOT IN ('DEVOLUCION','REVERSO') OR "origenId" IS NOT NULL) AND ("origenId" IS NULL OR "origenId" <> id));
CREATE UNIQUE INDEX apertura_unica_articulo ON movimientos_gerenciales("articuloId") WHERE tipo = 'APERTURA';
CREATE UNIQUE INDEX reverso_unico_movimiento ON movimientos_gerenciales("origenId") WHERE tipo = 'REVERSO';
ALTER TABLE lineas_compras_gerenciales ADD CONSTRAINT linea_compra_datos_validos CHECK (cantidad > 0 AND "costoUnitario" >= 0 AND "cantidadCancelada" >= 0 AND "cantidadCancelada" <= cantidad AND version >= 1 AND (("canceladaEn" IS NULL AND "motivoCancelacion" IS NULL AND "cantidadCancelada" = 0) OR ("canceladaEn" IS NOT NULL AND "motivoCancelacion" IS NOT NULL)));
ALTER TABLE recepciones_gerenciales ADD CONSTRAINT recepcion_cantidad_valida CHECK (cantidad > 0);
ALTER TABLE prestamos_herramientas_gerenciales ADD CONSTRAINT prestamo_fechas_validas CHECK ("previstaEn" >= "prestadaEn" AND (("devueltaEn" IS NULL AND "devueltaPorId" IS NULL) OR ("devueltaEn" IS NOT NULL AND "devueltaEn" >= "prestadaEn" AND "devueltaPorId" IS NOT NULL)));
CREATE UNIQUE INDEX prestamo_abierto_unico ON prestamos_herramientas_gerenciales("herramientaId") WHERE "devueltaEn" IS NULL;
