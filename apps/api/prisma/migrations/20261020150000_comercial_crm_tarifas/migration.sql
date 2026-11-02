-- CreateTable
CREATE TABLE "perfiles_comerciales_cliente" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "clasificacion" VARCHAR(60),
    "instruccionesFacturacion" VARCHAR(500),
    "version" INTEGER NOT NULL DEFAULT 1,
    "actualizadoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perfiles_comerciales_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contactos_comerciales" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "email" VARCHAR(254),
    "telefono" VARCHAR(25),
    "cargo" VARCHAR(100),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creadoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contactos_comerciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas_comerciales" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "autorId" INTEGER NOT NULL,
    "texto" VARCHAR(2000) NOT NULL,
    "creadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notas_comerciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referencias_documentos_comerciales" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "autorId" INTEGER NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "tipo" VARCHAR(60) NOT NULL,
    "url" VARCHAR(2048),
    "nota" VARCHAR(500),
    "creadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referencias_documentos_comerciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conceptos_comerciales" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "unidad" VARCHAR(30) NOT NULL,
    "servicioId" INTEGER,
    "materialId" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creadoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conceptos_comerciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarifas_comerciales" (
    "id" SERIAL NOT NULL,
    "conceptoId" INTEGER NOT NULL,
    "clienteId" INTEGER,
    "moneda" VARCHAR(3) NOT NULL DEFAULT 'NIO',
    "precio" DECIMAL(16,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "creadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarifas_comerciales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "perfiles_comerciales_cliente_clienteId_key" ON "perfiles_comerciales_cliente"("clienteId");

-- CreateIndex
CREATE INDEX "contactos_comerciales_clienteId_activo_idx" ON "contactos_comerciales"("clienteId", "activo");

-- CreateIndex
CREATE INDEX "notas_comerciales_clienteId_creadaEn_id_idx" ON "notas_comerciales"("clienteId", "creadaEn", "id");

-- CreateIndex
CREATE INDEX "referencias_documentos_comerciales_clienteId_creadaEn_id_idx" ON "referencias_documentos_comerciales"("clienteId", "creadaEn", "id");

-- CreateIndex
CREATE UNIQUE INDEX "conceptos_comerciales_codigo_key" ON "conceptos_comerciales"("codigo");

-- CreateIndex
CREATE INDEX "tarifas_comerciales_conceptoId_clienteId_activo_idx" ON "tarifas_comerciales"("conceptoId", "clienteId", "activo");

-- AddForeignKey
ALTER TABLE "perfiles_comerciales_cliente" ADD CONSTRAINT "perfiles_comerciales_cliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contactos_comerciales" ADD CONSTRAINT "contactos_comerciales_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_comerciales" ADD CONSTRAINT "notas_comerciales_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_comerciales" ADD CONSTRAINT "notas_comerciales_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referencias_documentos_comerciales" ADD CONSTRAINT "referencias_documentos_comerciales_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referencias_documentos_comerciales" ADD CONSTRAINT "referencias_documentos_comerciales_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conceptos_comerciales" ADD CONSTRAINT "conceptos_comerciales_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conceptos_comerciales" ADD CONSTRAINT "conceptos_comerciales_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarifas_comerciales" ADD CONSTRAINT "tarifas_comerciales_conceptoId_fkey" FOREIGN KEY ("conceptoId") REFERENCES "conceptos_comerciales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarifas_comerciales" ADD CONSTRAINT "tarifas_comerciales_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Invariantes comerciales persistentes; compatibles con las tablas existentes.
CREATE UNIQUE INDEX tarifas_estandar_activa_unica ON tarifas_comerciales ("conceptoId", moneda) WHERE activo AND "clienteId" IS NULL;
CREATE UNIQUE INDEX tarifas_cliente_activa_unica ON tarifas_comerciales ("conceptoId", "clienteId", moneda) WHERE activo AND "clienteId" IS NOT NULL;
ALTER TABLE tarifas_comerciales ADD CONSTRAINT tarifa_precio_valido CHECK (precio >= 0 AND moneda = 'NIO');
ALTER TABLE conceptos_comerciales ADD CONSTRAINT concepto_tipo_valido CHECK (tipo IN ('SERVICIO','MANO_OBRA','EQUIPO','REPUESTO','INSUMO'));
ALTER TABLE conceptos_comerciales ADD CONSTRAINT concepto_referencia_unica CHECK ("servicioId" IS NULL OR "materialId" IS NULL);
ALTER TABLE perfiles_comerciales_cliente ADD CONSTRAINT perfil_version_valida CHECK (version >= 1);
ALTER TABLE contactos_comerciales ADD CONSTRAINT contacto_version_valida CHECK (version >= 1);
