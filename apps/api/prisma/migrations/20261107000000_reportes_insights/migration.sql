CREATE TABLE "reportes_generados" (
  "id" SERIAL PRIMARY KEY,
  "tipo" VARCHAR(30) NOT NULL,
  "desde" TIMESTAMPTZ(6),
  "hasta" TIMESTAMPTZ(6),
  "filas" INTEGER NOT NULL,
  "contenido" TEXT NOT NULL,
  "creadoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "usuarioId" INTEGER NOT NULL REFERENCES "usuarios"("id") ON DELETE RESTRICT
);
CREATE INDEX "reportes_generados_usuarioId_creadoEn_idx" ON "reportes_generados"("usuarioId", "creadoEn");
