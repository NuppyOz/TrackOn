-- CreateEnum
CREATE TYPE "PrioridadOrden" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "EstadoCargaEvidencia" AS ENUM ('PENDIENTE', 'DISPONIBLE', 'FALLIDA');

-- CreateEnum
CREATE TYPE "DecisionEvidencia" AS ENUM ('ACEPTADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "TipoActorAuditoria" AS ENUM ('USUARIO', 'SISTEMA');

-- AlterTable
ALTER TABLE "empleados" ADD COLUMN     "actualizadoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "creadoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "habilitadoComoTecnico" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "personas" ADD COLUMN     "actualizadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "creadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "organizaciones" (
    "id" SERIAL NOT NULL,
    "razonSocial" VARCHAR(200) NOT NULL,
    "nombreComercial" VARCHAR(200),
    "identificacionTributaria" VARCHAR(50),
    "creadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "personaId" INTEGER,
    "organizacionId" INTEGER,
    "telefonoComercial" VARCHAR(25),
    "correoComercial" VARCHAR(254),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ubicaciones" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "direccion" TEXT NOT NULL,
    "referencia" TEXT,
    "contactoNombre" VARCHAR(200),
    "contactoTelefono" VARCHAR(25),
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ubicaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "empleadoId" INTEGER NOT NULL,
    "rolId" INTEGER NOT NULL,
    "identificador" VARCHAR(100) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuadrillas" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cuadrillas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "miembros_cuadrilla" (
    "id" SERIAL NOT NULL,
    "cuadrillaId" INTEGER NOT NULL,
    "empleadoId" INTEGER NOT NULL,
    "inicio" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fin" TIMESTAMPTZ(6),

    CONSTRAINT "miembros_cuadrilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipos" (
    "id" SERIAL NOT NULL,
    "ubicacionId" INTEGER NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,
    "tipo" VARCHAR(100) NOT NULL,
    "marca" VARCHAR(100),
    "modelo" VARCHAR(100),
    "numeroSerie" VARCHAR(150),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estados_orden" (
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,

    CONSTRAINT "estados_orden_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "ordenes_trabajo" (
    "id" SERIAL NOT NULL,
    "numero" BIGSERIAL NOT NULL,
    "ubicacionId" INTEGER NOT NULL,
    "estadoCodigo" VARCHAR(30) NOT NULL,
    "creadaPorId" INTEGER NOT NULL,
    "solicitud" TEXT NOT NULL,
    "prioridad" "PrioridadOrden" NOT NULL DEFAULT 'MEDIA',
    "fechaProgramada" TIMESTAMPTZ(6),
    "creadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradaEn" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "clienteNombreRegistrado" VARCHAR(200) NOT NULL,
    "clienteIdentificacionRegistrada" VARCHAR(50),
    "ubicacionNombreRegistrado" VARCHAR(150) NOT NULL,
    "direccionRegistrada" TEXT NOT NULL,

    CONSTRAINT "ordenes_trabajo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_equipos" (
    "id" SERIAL NOT NULL,
    "ordenId" INTEGER NOT NULL,
    "equipoId" INTEGER,
    "identificadaPorId" INTEGER,
    "descripcionProvisional" TEXT,
    "tipoRegistrado" VARCHAR(100),
    "marcaRegistrada" VARCHAR(100),
    "modeloRegistrado" VARCHAR(100),
    "serieRegistrada" VARCHAR(150),
    "motivoMarcaNoVisible" TEXT,
    "motivoModeloNoVisible" TEXT,
    "motivoSerieNoVisible" TEXT,
    "identificadaEn" TIMESTAMPTZ(6),
    "diagnostico" TEXT,
    "observaciones" TEXT,
    "resultado" TEXT,
    "creadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordenes_equipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidencias_equipo" (
    "id" SERIAL NOT NULL,
    "ordenEquipoId" INTEGER NOT NULL,
    "cargadaPorId" INTEGER NOT NULL,
    "reemplazaAId" INTEGER,
    "claveArchivo" VARCHAR(512) NOT NULL,
    "nombreOriginal" VARCHAR(255) NOT NULL,
    "tipoArchivo" VARCHAR(100) NOT NULL,
    "tamanoBytes" BIGINT NOT NULL,
    "hashArchivo" VARCHAR(128),
    "estadoCarga" "EstadoCargaEvidencia" NOT NULL DEFAULT 'PENDIENTE',
    "creadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disponibleEn" TIMESTAMPTZ(6),

    CONSTRAINT "evidencias_equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revisiones_evidencia" (
    "id" SERIAL NOT NULL,
    "evidenciaId" INTEGER NOT NULL,
    "revisadaPorId" INTEGER NOT NULL,
    "decision" "DecisionEvidencia" NOT NULL,
    "observacion" TEXT,
    "revisadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revisiones_evidencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicios" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "servicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_servicios" (
    "id" SERIAL NOT NULL,
    "ordenEquipoId" INTEGER NOT NULL,
    "servicioId" INTEGER NOT NULL,
    "nombreRegistrado" VARCHAR(150) NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "descripcionTrabajo" TEXT NOT NULL,

    CONSTRAINT "ordenes_servicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiales" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "unidadMedida" VARCHAR(30) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "materiales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_materiales" (
    "id" SERIAL NOT NULL,
    "ordenEquipoId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "nombreRegistrado" VARCHAR(150) NOT NULL,
    "unidadRegistrada" VARCHAR(30) NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "observacion" TEXT,

    CONSTRAINT "ordenes_materiales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones" (
    "id" SERIAL NOT NULL,
    "ordenId" INTEGER NOT NULL,
    "empleadoResponsableId" INTEGER,
    "cuadrillaId" INTEGER,
    "asignadaPorId" INTEGER NOT NULL,
    "inicio" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fin" TIMESTAMPTZ(6),
    "motivo" TEXT NOT NULL,

    CONSTRAINT "asignaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones_tecnicos" (
    "id" SERIAL NOT NULL,
    "asignacionId" INTEGER NOT NULL,
    "empleadoId" INTEGER NOT NULL,

    CONSTRAINT "asignaciones_tecnicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historiales_estado" (
    "id" SERIAL NOT NULL,
    "ordenId" INTEGER NOT NULL,
    "estadoAnterior" VARCHAR(30),
    "estadoNuevo" VARCHAR(30) NOT NULL,
    "cambiadoPorId" INTEGER NOT NULL,
    "motivo" TEXT,
    "fecha" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historiales_estado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditorias" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER,
    "tipoActor" "TipoActorAuditoria" NOT NULL,
    "entidad" VARCHAR(80) NOT NULL,
    "entidadId" VARCHAR(100) NOT NULL,
    "accion" VARCHAR(80) NOT NULL,
    "datosAnteriores" JSONB,
    "datosNuevos" JSONB,
    "correlacionId" VARCHAR(100),
    "fecha" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "ordenId" INTEGER,
    "tipo" VARCHAR(60) NOT NULL,
    "mensaje" TEXT NOT NULL,
    "creadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leidaEn" TIMESTAMPTZ(6),

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tokenRenovacionHash" VARCHAR(128) NOT NULL,
    "creadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMPTZ(6) NOT NULL,
    "revocadaEn" TIMESTAMPTZ(6),

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restablecimientos_credencial" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "iniciadoPorId" INTEGER NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "creadoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMPTZ(6) NOT NULL,
    "utilizadoEn" TIMESTAMPTZ(6),
    "revocadoEn" TIMESTAMPTZ(6),

    CONSTRAINT "restablecimientos_credencial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizaciones_identificacionTributaria_key" ON "organizaciones"("identificacionTributaria");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_codigo_key" ON "clientes"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_personaId_key" ON "clientes"("personaId");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_organizacionId_key" ON "clientes"("organizacionId");

-- CreateIndex
CREATE INDEX "ubicaciones_clienteId_activa_idx" ON "ubicaciones"("clienteId", "activa");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_empleadoId_key" ON "usuarios"("empleadoId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_identificador_key" ON "usuarios"("identificador");

-- CreateIndex
CREATE INDEX "usuarios_rolId_idx" ON "usuarios"("rolId");

-- CreateIndex
CREATE UNIQUE INDEX "cuadrillas_nombre_key" ON "cuadrillas"("nombre");

-- CreateIndex
CREATE INDEX "miembros_cuadrilla_cuadrillaId_fin_idx" ON "miembros_cuadrilla"("cuadrillaId", "fin");

-- CreateIndex
CREATE INDEX "miembros_cuadrilla_empleadoId_fin_idx" ON "miembros_cuadrilla"("empleadoId", "fin");

-- CreateIndex
CREATE UNIQUE INDEX "equipos_codigo_key" ON "equipos"("codigo");

-- CreateIndex
CREATE INDEX "equipos_ubicacionId_activo_idx" ON "equipos"("ubicacionId", "activo");

-- CreateIndex
CREATE INDEX "equipos_numeroSerie_idx" ON "equipos"("numeroSerie");

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_trabajo_numero_key" ON "ordenes_trabajo"("numero");

-- CreateIndex
CREATE INDEX "ordenes_trabajo_ubicacionId_idx" ON "ordenes_trabajo"("ubicacionId");

-- CreateIndex
CREATE INDEX "ordenes_trabajo_estadoCodigo_fechaProgramada_idx" ON "ordenes_trabajo"("estadoCodigo", "fechaProgramada");

-- CreateIndex
CREATE INDEX "ordenes_trabajo_creadaPorId_idx" ON "ordenes_trabajo"("creadaPorId");

-- CreateIndex
CREATE INDEX "ordenes_equipos_ordenId_idx" ON "ordenes_equipos"("ordenId");

-- CreateIndex
CREATE INDEX "ordenes_equipos_equipoId_idx" ON "ordenes_equipos"("equipoId");

-- CreateIndex
CREATE INDEX "ordenes_equipos_identificadaPorId_idx" ON "ordenes_equipos"("identificadaPorId");

-- CreateIndex
CREATE UNIQUE INDEX "evidencias_equipo_claveArchivo_key" ON "evidencias_equipo"("claveArchivo");

-- CreateIndex
CREATE INDEX "evidencias_equipo_ordenEquipoId_estadoCarga_idx" ON "evidencias_equipo"("ordenEquipoId", "estadoCarga");

-- CreateIndex
CREATE INDEX "evidencias_equipo_cargadaPorId_idx" ON "evidencias_equipo"("cargadaPorId");

-- CreateIndex
CREATE INDEX "evidencias_equipo_reemplazaAId_idx" ON "evidencias_equipo"("reemplazaAId");

-- CreateIndex
CREATE INDEX "revisiones_evidencia_evidenciaId_revisadaEn_idx" ON "revisiones_evidencia"("evidenciaId", "revisadaEn");

-- CreateIndex
CREATE INDEX "revisiones_evidencia_revisadaPorId_idx" ON "revisiones_evidencia"("revisadaPorId");

-- CreateIndex
CREATE UNIQUE INDEX "servicios_codigo_key" ON "servicios"("codigo");

-- CreateIndex
CREATE INDEX "ordenes_servicios_ordenEquipoId_idx" ON "ordenes_servicios"("ordenEquipoId");

-- CreateIndex
CREATE INDEX "ordenes_servicios_servicioId_idx" ON "ordenes_servicios"("servicioId");

-- CreateIndex
CREATE UNIQUE INDEX "materiales_codigo_key" ON "materiales"("codigo");

-- CreateIndex
CREATE INDEX "ordenes_materiales_ordenEquipoId_idx" ON "ordenes_materiales"("ordenEquipoId");

-- CreateIndex
CREATE INDEX "ordenes_materiales_materialId_idx" ON "ordenes_materiales"("materialId");

-- CreateIndex
CREATE INDEX "asignaciones_ordenId_inicio_idx" ON "asignaciones"("ordenId", "inicio");

-- CreateIndex
CREATE INDEX "asignaciones_empleadoResponsableId_idx" ON "asignaciones"("empleadoResponsableId");

-- CreateIndex
CREATE INDEX "asignaciones_cuadrillaId_idx" ON "asignaciones"("cuadrillaId");

-- CreateIndex
CREATE INDEX "asignaciones_asignadaPorId_idx" ON "asignaciones"("asignadaPorId");

-- CreateIndex
CREATE INDEX "asignaciones_tecnicos_empleadoId_idx" ON "asignaciones_tecnicos"("empleadoId");

-- CreateIndex
CREATE UNIQUE INDEX "asignaciones_tecnicos_asignacionId_empleadoId_key" ON "asignaciones_tecnicos"("asignacionId", "empleadoId");

-- CreateIndex
CREATE INDEX "historiales_estado_ordenId_fecha_idx" ON "historiales_estado"("ordenId", "fecha");

-- CreateIndex
CREATE INDEX "historiales_estado_estadoAnterior_idx" ON "historiales_estado"("estadoAnterior");

-- CreateIndex
CREATE INDEX "historiales_estado_estadoNuevo_idx" ON "historiales_estado"("estadoNuevo");

-- CreateIndex
CREATE INDEX "historiales_estado_cambiadoPorId_idx" ON "historiales_estado"("cambiadoPorId");

-- CreateIndex
CREATE INDEX "auditorias_entidad_entidadId_fecha_idx" ON "auditorias"("entidad", "entidadId", "fecha");

-- CreateIndex
CREATE INDEX "auditorias_usuarioId_fecha_idx" ON "auditorias"("usuarioId", "fecha");

-- CreateIndex
CREATE INDEX "notificaciones_usuarioId_leidaEn_creadaEn_idx" ON "notificaciones"("usuarioId", "leidaEn", "creadaEn");

-- CreateIndex
CREATE INDEX "notificaciones_ordenId_idx" ON "notificaciones"("ordenId");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_tokenRenovacionHash_key" ON "sesiones"("tokenRenovacionHash");

-- CreateIndex
CREATE INDEX "sesiones_usuarioId_revocadaEn_idx" ON "sesiones"("usuarioId", "revocadaEn");

-- CreateIndex
CREATE INDEX "sesiones_expiraEn_idx" ON "sesiones"("expiraEn");

-- CreateIndex
CREATE UNIQUE INDEX "restablecimientos_credencial_tokenHash_key" ON "restablecimientos_credencial"("tokenHash");

-- CreateIndex
CREATE INDEX "restablecimientos_credencial_usuarioId_expiraEn_idx" ON "restablecimientos_credencial"("usuarioId", "expiraEn");

-- CreateIndex
CREATE INDEX "restablecimientos_credencial_iniciadoPorId_idx" ON "restablecimientos_credencial"("iniciadoPorId");

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ubicaciones" ADD CONSTRAINT "ubicaciones_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "miembros_cuadrilla" ADD CONSTRAINT "miembros_cuadrilla_cuadrillaId_fkey" FOREIGN KEY ("cuadrillaId") REFERENCES "cuadrillas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "miembros_cuadrilla" ADD CONSTRAINT "miembros_cuadrilla_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_ubicacionId_fkey" FOREIGN KEY ("ubicacionId") REFERENCES "ubicaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_trabajo_ubicacionId_fkey" FOREIGN KEY ("ubicacionId") REFERENCES "ubicaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_trabajo_estadoCodigo_fkey" FOREIGN KEY ("estadoCodigo") REFERENCES "estados_orden"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_trabajo_creadaPorId_fkey" FOREIGN KEY ("creadaPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_equipos" ADD CONSTRAINT "ordenes_equipos_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes_trabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_equipos" ADD CONSTRAINT "ordenes_equipos_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_equipos" ADD CONSTRAINT "ordenes_equipos_identificadaPorId_fkey" FOREIGN KEY ("identificadaPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencias_equipo" ADD CONSTRAINT "evidencias_equipo_ordenEquipoId_fkey" FOREIGN KEY ("ordenEquipoId") REFERENCES "ordenes_equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencias_equipo" ADD CONSTRAINT "evidencias_equipo_cargadaPorId_fkey" FOREIGN KEY ("cargadaPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencias_equipo" ADD CONSTRAINT "evidencias_equipo_reemplazaAId_fkey" FOREIGN KEY ("reemplazaAId") REFERENCES "evidencias_equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisiones_evidencia" ADD CONSTRAINT "revisiones_evidencia_evidenciaId_fkey" FOREIGN KEY ("evidenciaId") REFERENCES "evidencias_equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisiones_evidencia" ADD CONSTRAINT "revisiones_evidencia_revisadaPorId_fkey" FOREIGN KEY ("revisadaPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_servicios" ADD CONSTRAINT "ordenes_servicios_ordenEquipoId_fkey" FOREIGN KEY ("ordenEquipoId") REFERENCES "ordenes_equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_servicios" ADD CONSTRAINT "ordenes_servicios_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_materiales" ADD CONSTRAINT "ordenes_materiales_ordenEquipoId_fkey" FOREIGN KEY ("ordenEquipoId") REFERENCES "ordenes_equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_materiales" ADD CONSTRAINT "ordenes_materiales_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materiales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones" ADD CONSTRAINT "asignaciones_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes_trabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones" ADD CONSTRAINT "asignaciones_empleadoResponsableId_fkey" FOREIGN KEY ("empleadoResponsableId") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones" ADD CONSTRAINT "asignaciones_cuadrillaId_fkey" FOREIGN KEY ("cuadrillaId") REFERENCES "cuadrillas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones" ADD CONSTRAINT "asignaciones_asignadaPorId_fkey" FOREIGN KEY ("asignadaPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_tecnicos" ADD CONSTRAINT "asignaciones_tecnicos_asignacionId_fkey" FOREIGN KEY ("asignacionId") REFERENCES "asignaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_tecnicos" ADD CONSTRAINT "asignaciones_tecnicos_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historiales_estado" ADD CONSTRAINT "historiales_estado_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes_trabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historiales_estado" ADD CONSTRAINT "historiales_estado_estadoAnterior_fkey" FOREIGN KEY ("estadoAnterior") REFERENCES "estados_orden"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historiales_estado" ADD CONSTRAINT "historiales_estado_estadoNuevo_fkey" FOREIGN KEY ("estadoNuevo") REFERENCES "estados_orden"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historiales_estado" ADD CONSTRAINT "historiales_estado_cambiadoPorId_fkey" FOREIGN KEY ("cambiadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditorias" ADD CONSTRAINT "auditorias_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes_trabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restablecimientos_credencial" ADD CONSTRAINT "restablecimientos_credencial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restablecimientos_credencial" ADD CONSTRAINT "restablecimientos_credencial_iniciadoPorId_fkey" FOREIGN KEY ("iniciadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "clientes" ADD CONSTRAINT "clientes_identidad_xor_check"
CHECK (("personaId" IS NOT NULL) <> ("organizacionId" IS NOT NULL));

ALTER TABLE "asignaciones" ADD CONSTRAINT "asignaciones_destino_xor_check"
CHECK (("empleadoResponsableId" IS NOT NULL) <> ("cuadrillaId" IS NOT NULL));

ALTER TABLE "asignaciones" ADD CONSTRAINT "asignaciones_fechas_check"
CHECK ("fin" IS NULL OR "fin" >= "inicio");

CREATE UNIQUE INDEX "asignaciones_una_vigente_por_orden"
ON "asignaciones" ("ordenId") WHERE "fin" IS NULL;

ALTER TABLE "miembros_cuadrilla" ADD CONSTRAINT "miembros_cuadrilla_fechas_check"
CHECK ("fin" IS NULL OR "fin" >= "inicio");


CREATE UNIQUE INDEX "miembros_cuadrilla_par_vigente_unico"
ON "miembros_cuadrilla" ("cuadrillaId", "empleadoId") WHERE "fin" IS NULL;

ALTER TABLE "ordenes_servicios" ADD CONSTRAINT "ordenes_servicios_cantidad_check"
CHECK ("cantidad" > 0);
ALTER TABLE "ordenes_materiales" ADD CONSTRAINT "ordenes_materiales_cantidad_check"
CHECK ("cantidad" > 0);

ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_version_positiva_check"
CHECK ("version" >= 1);
ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_cierre_fecha_check"
CHECK ("cerradaEn" IS NULL OR "cerradaEn" >= "creadaEn");

ALTER TABLE "ordenes_equipos" ADD CONSTRAINT "ordenes_equipos_identificador_fecha_check"
CHECK (("identificadaPorId" IS NULL) = ("identificadaEn" IS NULL));

ALTER TABLE "evidencias_equipo" ADD CONSTRAINT "evidencias_tamano_check"
CHECK ("tamanoBytes" > 0);
ALTER TABLE "evidencias_equipo" ADD CONSTRAINT "evidencias_no_autorreemplazo_check"
CHECK ("reemplazaAId" IS NULL OR "reemplazaAId" <> "id");
ALTER TABLE "evidencias_equipo" ADD CONSTRAINT "evidencias_disponibilidad_check"
CHECK (
  ("estadoCarga" = 'DISPONIBLE' AND "disponibleEn" IS NOT NULL)
  OR
  ("estadoCarga" <> 'DISPONIBLE' AND "disponibleEn" IS NULL)
);
ALTER TABLE "evidencias_equipo" ADD CONSTRAINT "evidencias_fecha_check"
CHECK ("disponibleEn" IS NULL OR "disponibleEn" >= "creadaEn");

ALTER TABLE "revisiones_evidencia" ADD CONSTRAINT "revision_rechazo_motivo_check"
CHECK ("decision" <> 'RECHAZADA' OR NULLIF(BTRIM("observacion"), '') IS NOT NULL);

ALTER TABLE "historiales_estado" ADD CONSTRAINT "historial_estado_distinto_check"
CHECK ("estadoAnterior" IS NULL OR "estadoAnterior" <> "estadoNuevo");

ALTER TABLE "auditorias" ADD CONSTRAINT "auditorias_actor_check"
CHECK (
  ("tipoActor" = 'USUARIO' AND "usuarioId" IS NOT NULL)
  OR
  ("tipoActor" = 'SISTEMA' AND "usuarioId" IS NULL)
);

ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_fecha_check"
CHECK ("leidaEn" IS NULL OR "leidaEn" >= "creadaEn");

ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_fechas_check"
CHECK ("expiraEn" > "creadaEn" AND ("revocadaEn" IS NULL OR "revocadaEn" >= "creadaEn"));

ALTER TABLE "restablecimientos_credencial" ADD CONSTRAINT "restablecimientos_fechas_check"
CHECK (
  "expiraEn" > "creadoEn"
  AND ("utilizadoEn" IS NULL OR ("utilizadoEn" >= "creadoEn" AND "utilizadoEn" < "expiraEn"))
  AND ("revocadoEn" IS NULL OR "revocadoEn" >= "creadoEn")
);
