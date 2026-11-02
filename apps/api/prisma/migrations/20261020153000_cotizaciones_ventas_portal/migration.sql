-- CreateTable
CREATE TABLE "cotizaciones_comerciales" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "contactoId" INTEGER,
    "creadaPorId" INTEGER NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
    "clienteNombreRegistrado" VARCHAR(200) NOT NULL,
    "clienteIdentificacionRegistrada" VARCHAR(50),
    "moneda" VARCHAR(3) NOT NULL DEFAULT 'NIO',
    "subtotal" DECIMAL(16,2) NOT NULL,
    "descuento" DECIMAL(16,2) NOT NULL,
    "total" DECIMAL(16,2) NOT NULL,
    "venceEn" TIMESTAMPTZ(6) NOT NULL,
    "nota" VARCHAR(2000),
    "version" INTEGER NOT NULL DEFAULT 1,
    "creadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviadaEn" TIMESTAMPTZ(6),
    "decididaEn" TIMESTAMPTZ(6),
    "decisionOrigen" VARCHAR(10),
    "decisionUsuarioId" INTEGER,
    "decisionCuentaId" INTEGER,
    "decisionComentario" VARCHAR(1000),

    CONSTRAINT "cotizaciones_comerciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lineas_cotizaciones_comerciales" (
    "id" SERIAL NOT NULL,
    "cotizacionId" INTEGER NOT NULL,
    "conceptoId" INTEGER NOT NULL,
    "posicion" INTEGER NOT NULL,
    "descripcion" VARCHAR(150) NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "unidad" VARCHAR(30) NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "precio" DECIMAL(16,2) NOT NULL,
    "descuento" DECIMAL(16,2) NOT NULL,
    "subtotal" DECIMAL(16,2) NOT NULL,
    "total" DECIMAL(16,2) NOT NULL,

    CONSTRAINT "lineas_cotizaciones_comerciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas_cotizaciones_comerciales" (
    "id" SERIAL NOT NULL,
    "cotizacionId" INTEGER NOT NULL,
    "autorId" INTEGER NOT NULL,
    "texto" VARCHAR(2000) NOT NULL,
    "creadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notas_cotizaciones_comerciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas_comerciales" (
    "id" SERIAL NOT NULL,
    "cotizacionId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "confirmadaPorId" INTEGER NOT NULL,
    "moneda" VARCHAR(3) NOT NULL DEFAULT 'NIO',
    "total" DECIMAL(16,2) NOT NULL,
    "confirmadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ventas_comerciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuentas_portal" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "identificador" VARCHAR(100) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cuentas_portal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones_portal" (
    "id" SERIAL NOT NULL,
    "cuentaId" INTEGER NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "creadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMPTZ(6) NOT NULL,
    "revocadaEn" TIMESTAMPTZ(6),

    CONSTRAINT "sesiones_portal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operaciones_idempotentes" (
    "id" SERIAL NOT NULL,
    "tipoActor" VARCHAR(10) NOT NULL,
    "actorId" INTEGER NOT NULL,
    "operacion" VARCHAR(100) NOT NULL,
    "clave" VARCHAR(100) NOT NULL,
    "payloadHash" VARCHAR(64) NOT NULL,
    "resultado" JSONB NOT NULL,
    "creadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operaciones_idempotentes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cotizaciones_comerciales_clienteId_creadaEn_id_idx" ON "cotizaciones_comerciales"("clienteId", "creadaEn", "id");

-- CreateIndex
CREATE INDEX "cotizaciones_comerciales_estado_enviadaEn_idx" ON "cotizaciones_comerciales"("estado", "enviadaEn");

-- CreateIndex
CREATE UNIQUE INDEX "lineas_cotizaciones_comerciales_cotizacionId_posicion_key" ON "lineas_cotizaciones_comerciales"("cotizacionId", "posicion");

-- CreateIndex
CREATE INDEX "notas_cotizaciones_comerciales_cotizacionId_creadaEn_idx" ON "notas_cotizaciones_comerciales"("cotizacionId", "creadaEn");

-- CreateIndex
CREATE UNIQUE INDEX "ventas_comerciales_cotizacionId_key" ON "ventas_comerciales"("cotizacionId");

-- CreateIndex
CREATE INDEX "ventas_comerciales_clienteId_confirmadaEn_idx" ON "ventas_comerciales"("clienteId", "confirmadaEn");

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_portal_clienteId_key" ON "cuentas_portal"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_portal_identificador_key" ON "cuentas_portal"("identificador");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_portal_tokenHash_key" ON "sesiones_portal"("tokenHash");

-- CreateIndex
CREATE INDEX "sesiones_portal_cuentaId_expiraEn_idx" ON "sesiones_portal"("cuentaId", "expiraEn");

-- CreateIndex
CREATE UNIQUE INDEX "operaciones_idempotentes_tipoActor_actorId_operacion_clave_key" ON "operaciones_idempotentes"("tipoActor", "actorId", "operacion", "clave");

-- AddForeignKey
ALTER TABLE "cotizaciones_comerciales" ADD CONSTRAINT "cotizaciones_comerciales_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones_comerciales" ADD CONSTRAINT "cotizaciones_comerciales_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "contactos_comerciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones_comerciales" ADD CONSTRAINT "cotizaciones_comerciales_creadaPorId_fkey" FOREIGN KEY ("creadaPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones_comerciales" ADD CONSTRAINT "cotizaciones_comerciales_decisionUsuarioId_fkey" FOREIGN KEY ("decisionUsuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones_comerciales" ADD CONSTRAINT "cotizaciones_comerciales_decisionCuentaId_fkey" FOREIGN KEY ("decisionCuentaId") REFERENCES "cuentas_portal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_cotizaciones_comerciales" ADD CONSTRAINT "lineas_cotizaciones_comerciales_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones_comerciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineas_cotizaciones_comerciales" ADD CONSTRAINT "lineas_cotizaciones_comerciales_conceptoId_fkey" FOREIGN KEY ("conceptoId") REFERENCES "conceptos_comerciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_cotizaciones_comerciales" ADD CONSTRAINT "notas_cotizaciones_comerciales_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones_comerciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_cotizaciones_comerciales" ADD CONSTRAINT "notas_cotizaciones_comerciales_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas_comerciales" ADD CONSTRAINT "ventas_comerciales_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones_comerciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas_comerciales" ADD CONSTRAINT "ventas_comerciales_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas_comerciales" ADD CONSTRAINT "ventas_comerciales_confirmadaPorId_fkey" FOREIGN KEY ("confirmadaPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_portal" ADD CONSTRAINT "cuentas_portal_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones_portal" ADD CONSTRAINT "sesiones_portal_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "cuentas_portal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE cotizaciones_comerciales ADD CONSTRAINT cotizacion_importes_validos CHECK (moneda = 'NIO' AND subtotal >= 0 AND descuento >= 0 AND descuento <= subtotal AND total = subtotal - descuento AND version >= 1);
ALTER TABLE cotizaciones_comerciales ADD CONSTRAINT cotizacion_estado_valido CHECK (estado IN ('BORRADOR','ENVIADA','APROBADA','RECHAZADA'));
ALTER TABLE cotizaciones_comerciales ADD CONSTRAINT cotizacion_decision_valida CHECK (
 (estado = 'BORRADOR' AND "enviadaEn" IS NULL AND "decididaEn" IS NULL AND "decisionOrigen" IS NULL AND "decisionUsuarioId" IS NULL AND "decisionCuentaId" IS NULL)
 OR (estado = 'ENVIADA' AND "enviadaEn" IS NOT NULL AND "decididaEn" IS NULL AND "decisionOrigen" IS NULL AND "decisionUsuarioId" IS NULL AND "decisionCuentaId" IS NULL)
 OR (estado IN ('APROBADA','RECHAZADA') AND "enviadaEn" IS NOT NULL AND "decididaEn" IS NOT NULL AND (
   ("decisionOrigen" = 'INTERNO' AND "decisionUsuarioId" IS NOT NULL AND "decisionCuentaId" IS NULL)
   OR ("decisionOrigen" = 'PORTAL' AND "decisionCuentaId" IS NOT NULL AND "decisionUsuarioId" IS NULL)
 )));
ALTER TABLE lineas_cotizaciones_comerciales ADD CONSTRAINT linea_cotizacion_importes_validos CHECK (cantidad > 0 AND precio >= 0 AND descuento >= 0 AND descuento <= subtotal AND subtotal = round(cantidad * precio, 2) AND total = subtotal - descuento AND posicion >= 0);
ALTER TABLE ventas_comerciales ADD CONSTRAINT venta_importe_valido CHECK (moneda = 'NIO' AND total >= 0);
ALTER TABLE cuentas_portal ADD CONSTRAINT cuenta_portal_version_valida CHECK (version >= 1);
ALTER TABLE sesiones_portal ADD CONSTRAINT sesion_portal_fechas_validas CHECK ("expiraEn" > "creadaEn");
ALTER TABLE operaciones_idempotentes ADD CONSTRAINT operacion_actor_valido CHECK ("tipoActor" IN ('USUARIO','PORTAL') AND "actorId" > 0 AND length(clave) BETWEEN 16 AND 100);
