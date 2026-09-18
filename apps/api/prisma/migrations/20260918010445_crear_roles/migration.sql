-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "cod" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "descripcion" VARCHAR(250),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_cod_key" ON "roles"("cod");
