-- CHECK admite NULL en PostgreSQL: exigir origen explícito en decisiones finales.
ALTER TABLE cotizaciones_comerciales ADD CONSTRAINT cotizacion_decision_origen_requerido
CHECK (estado NOT IN ('APROBADA', 'RECHAZADA') OR "decisionOrigen" IS NOT NULL);
