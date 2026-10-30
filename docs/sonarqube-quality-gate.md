# SonarQube Cloud Quality Gate

## Configuración del proyecto

`sonar-project.properties` configura la organización `nuppyoz` y el proyecto
`NuppyOz_TrackOn`. Estos identificadores deben coincidir exactamente con los de
SonarQube Cloud, aunque el repositorio GitHub pertenezca a otra cuenta.
Comprueba la información del proyecto en SonarQube Cloud antes de cambiarlos.

Se analizan `apps/api/src` y `apps/web/src`, con pruebas en `apps/api/test` y
`apps/web/test`. Se importan los reportes reales `apps/api/coverage/lcov.info`
y `apps/web/coverage/lcov.info` generados por CI. Se excluyen dependencias,
archivos generados y artefactos de compilación. `sonar.qualitygate.wait=true`
hace fallar el análisis cuando no se supera el gate.

## Configurar GitHub Actions

1. Accede a la cuenta de SonarQube Cloud que tenga permiso **Execute Analysis**
   sobre el proyecto configurado. Genera un token en **My Account > Security**
   o utiliza el token de análisis indicado por la organización.
2. En [Settings > Secrets and variables > Actions del repositorio](https://github.com/Lois-mttr/TrackOn/settings/secrets/actions),
   selecciona **New repository secret**.
3. Usa el nombre exacto `SONAR_TOKEN` y pega el token como valor. Debe ser un
   secret de Actions, no una variable ni un secret de Codespaces o Dependabot.
   Un token en el `.env` local no se envía a GitHub Actions.
4. Si usas un secret de organización GitHub, concede acceso a este repositorio.
   Si está guardado en un environment, este job no lo recibe porque no declara
   un environment: usa un repository secret para esta configuración.
5. Sube los cambios del workflow y vuelve a ejecutar CI. Para un fallo causado
   solo por el secret, puedes usar **Re-run failed jobs** después de guardarlo.

El workflow comprueba la presencia del token antes de compilar las imágenes.
Analiza los pushes a `main` y los pull requests internos hacia `main` o `dev`.
Los pushes a `dev` ejecutan las pruebas sin análisis SonarQube. Los pull requests
desde forks y las ejecuciones de Dependabot omiten SonarQube porque no reciben
los secrets de Actions; las pruebas siguen ejecutándose. Se utiliza
`pull_request`, sin ejecutar código de forks mediante `pull_request_target`.

La acción verifica la firma GPG del scanner mediante
`skipSignatureVerification: false`; `ubuntu-latest` incluye `gpg` y `dirmngr`.

## Diagnóstico de autenticación

- **Running this GitHub Action without SONAR_TOKEN**: el token llegó vacío.
  Revisa el nombre, el tipo y el alcance del secret, así como el evento que
  inició la ejecución.
- **Not authorized or organization not found**, con token configurado: revisa
  su caducidad, revocación, permiso **Execute Analysis** y acceso al proyecto.
  Comprueba también `sonar.organization` y `sonar.projectKey` en las opciones
  del proyecto de SonarQube Cloud. La organización SonarQube puede tener un
  identificador diferente del usuario u organización GitHub.
- **Skipping GPG signature verification**: es una advertencia sobre la descarga
  del scanner; no causa el error de autorización. La verificación está habilitada
  explícitamente en este workflow.

No imprimas el token en logs ni lo agregues al repositorio. La existencia de un
secret no demuestra que el token sea válido: esa comprobación requiere ejecutar
el análisis autenticado.

## Ejecutar desde la raíz local

Genera primero ambos reportes LCOV con las suites de cobertura. Las pruebas de
integración de la API requieren una base aislada de pruebas; consulta
`compose.test.yaml` y el workflow de CI.

Con `SONAR_TOKEN` disponible en el entorno o en `.env.sonar.local` (ignorado por
Git), ejecuta:

```bash
pnpm sonar
```

`scripts/sonar.mjs` comprueba el token y los reportes e inicia el scanner.

## Si el Quality Gate falla

Una vez resuelta la autenticación, abre el enlace del análisis y revisa las
condiciones incumplidas: bugs, vulnerabilidades, hotspots, duplicación o
cobertura. Corrige los hallazgos y vuelve a ejecutar CI. Los fallos de
autenticación anteriores ocurren antes de evaluar la calidad del código.

## Referencias

- [Uso de secrets en GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets).
- [Acción oficial de SonarQube](https://github.com/SonarSource/sonarqube-scan-action).
