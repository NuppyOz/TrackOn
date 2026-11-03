CREATE TABLE "integraciones_google_calendar" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "accessTokenCifrado" TEXT NOT NULL,
    "refreshTokenCifrado" TEXT,
    "expiraEn" TIMESTAMPTZ(6),
    "scope" TEXT,
    "calendarId" VARCHAR(255) NOT NULL DEFAULT 'primary',
    "creadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "integraciones_google_calendar_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "eventos_google_calendar" (
    "id" SERIAL NOT NULL,
    "integracionId" INTEGER NOT NULL,
    "ordenId" INTEGER NOT NULL,
    "googleEventId" VARCHAR(1024) NOT NULL,
    "sincronizadoEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "eventos_google_calendar_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "estados_oauth_google" (
    "id" VARCHAR(128) NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "expiraEn" TIMESTAMPTZ(6) NOT NULL,
    "creadaEn" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "estados_oauth_google_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integraciones_google_calendar_usuarioId_key" ON "integraciones_google_calendar"("usuarioId");
CREATE UNIQUE INDEX "eventos_google_calendar_integracionId_ordenId_key" ON "eventos_google_calendar"("integracionId", "ordenId");
CREATE INDEX "eventos_google_calendar_ordenId_idx" ON "eventos_google_calendar"("ordenId");
CREATE INDEX "estados_oauth_google_expiraEn_idx" ON "estados_oauth_google"("expiraEn");

ALTER TABLE "integraciones_google_calendar" ADD CONSTRAINT "integraciones_google_calendar_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eventos_google_calendar" ADD CONSTRAINT "eventos_google_calendar_integracionId_fkey" FOREIGN KEY ("integracionId") REFERENCES "integraciones_google_calendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "eventos_google_calendar" ADD CONSTRAINT "eventos_google_calendar_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "ordenes_trabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "estados_oauth_google" ADD CONSTRAINT "estados_oauth_google_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
