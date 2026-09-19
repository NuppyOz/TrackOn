-- CreateTable
CREATE TABLE "personas" (
    "id" SERIAL NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "secondName" VARCHAR(100),
    "firstLastName" VARCHAR(100) NOT NULL,
    "secondLastName" VARCHAR(100),
    "typeDocument" VARCHAR(30),
    "numberDocument" VARCHAR(50),
    "telephone" VARCHAR(25),
    "correo" VARCHAR(254),

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "personas"
ADD CONSTRAINT "personas_documento_completo_check"
CHECK (
  ("typeDocument" IS NULL AND "numberDocument" IS NULL)
  OR
  ("typeDocument" IS NOT NULL AND "numberDocument" IS NOT NULL)
);
