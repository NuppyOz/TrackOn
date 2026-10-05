# SonarQube Quality Gate

## Configuración incluida

`sonar-project.properties` define el proyecto `multicas-trackon` y analiza el código fuente de `apps/api/src` y `apps/web/src`. Excluye el cliente Prisma generado, dependencias, artefactos compilados, declaraciones de tipos y cobertura generada. El scanner espera el resultado del Quality Gate y termina con error si el gate falla.

No se configuró cobertura porque el repositorio no tiene actualmente reportes de cobertura de pruebas. No se debe reportar cobertura ficticia: cuando existan pruebas instrumentadas, se agrega la ruta real del reporte LCOV (`sonar.javascript.lcov.reportPaths`).

## Requisitos

- Una instancia de SonarQube accesible desde el equipo donde correrá el análisis.
- SonarScanner CLI instalado y compatible con esa instancia.
- Un token de análisis con permisos para el proyecto.
- Que el proyecto exista en SonarQube o que el token tenga permisos para crearlo.

El repositorio no incluye ni instala el servidor/scanner. No se agregan Docker, servicios ni dependencias nuevas porque la infraestructura SonarQube no está definida en el proyecto.

## Ejecutar desde la raíz

En Bash, define la URL y el token solo en tu terminal (no los guardes en Git ni los compartas):

```bash
export SONAR_HOST_URL="http://localhost:9000"
export SONAR_TOKEN="tu-token-de-analisis"
sonar-scanner \
  -Dsonar.host.url="$SONAR_HOST_URL" \
  -Dsonar.token="$SONAR_TOKEN"
```

Reemplaza la URL por la dirección real de tu instancia. Al finalizar, revisa el enlace que imprime el scanner y la sección **Quality Gates** del proyecto en SonarQube. El estado final depende de las condiciones configuradas en el servidor; `sonar.qualitygate.wait=true` hace que el comando refleje ese resultado.

## Si el gate falla

Abre el enlace del análisis y revisa las condiciones incumplidas (bugs, vulnerabilidades, hotspots, deuda o cobertura, según el gate del servidor). Corrige los hallazgos en el código y vuelve a ejecutar el scanner. No reduzcas umbrales ni marques hallazgos como aceptados solo para obtener un estado verde; cualquier cambio de política debe acordarse y documentarse en SonarQube.

## Límite conocido

No puedo confirmar el Quality Gate desde este repositorio sin una instancia SonarQube accesible, scanner instalado y token. La configuración queda preparada, pero el resultado debe producirse en tu entorno.
