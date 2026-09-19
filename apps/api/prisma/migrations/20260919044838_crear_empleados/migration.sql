-- CreateTable
CREATE TABLE "empleados" (
    "id" SERIAL NOT NULL,
    "codEmpleado" VARCHAR(30) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "personaId" INTEGER NOT NULL,

    CONSTRAINT "empleados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empleados_codEmpleado_key" ON "empleados"("codEmpleado");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_personaId_key" ON "empleados"("personaId");

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
