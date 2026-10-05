-- Normalizar tipos y números de cédula nicaragüense existentes.
UPDATE "personas"
SET
    "typeDocument" = 'CEDULA_NIC',
    "numberDocument" = UPPER(
        REPLACE(
            REPLACE(
                BTRIM("numberDocument"),
                '-',
                ''
            ),
            ' ',
            ''
        )
    )
WHERE
    "typeDocument" IS NOT NULL
    AND "numberDocument" IS NOT NULL
    AND UPPER(BTRIM("typeDocument")) IN (
        'CEDULA',
        'CÉDULA',
        'CEDULA_NIC'
    );

-- Normalizar pasaportes existentes.
UPDATE "personas"
SET
    "typeDocument" = 'PASAPORTE',
    "numberDocument" = UPPER(
        BTRIM("numberDocument")
    )
WHERE
    "typeDocument" IS NOT NULL
    AND "numberDocument" IS NOT NULL
    AND UPPER(BTRIM("typeDocument")) = 'PASAPORTE';

-- Normalizar cédulas de residencia existentes.
UPDATE "personas"
SET
    "typeDocument" = 'CEDULA_RESIDENCIA',
    "numberDocument" = UPPER(
        BTRIM("numberDocument")
    )
WHERE
    "typeDocument" IS NOT NULL
    AND "numberDocument" IS NOT NULL
    AND UPPER(BTRIM("typeDocument")) IN (
        'CEDULA_RESIDENCIA',
        'CÉDULA_RESIDENCIA'
    );

-- Un documento identificado por tipo + número
-- no puede pertenecer a dos personas diferentes.
CREATE UNIQUE INDEX IF NOT EXISTS
"personas_tipo_numero_documento_key"
ON "personas" (
    "typeDocument",
    "numberDocument"
)
WHERE
    "typeDocument" IS NOT NULL
    AND "numberDocument" IS NOT NULL;