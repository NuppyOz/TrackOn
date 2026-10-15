import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';

if (existsSync('.env.sonar.local')) process.loadEnvFile('.env.sonar.local');
if (!process.env.SONAR_TOKEN) {
    console.error('Configura SONAR_TOKEN en el entorno o en .env.sonar.local (ignorado por Git).');
    process.exit(1);
}
for (const app of ['api', 'web']) {
    const reporte = `apps/${app}/coverage/lcov.info`;
    if (!existsSync(reporte)) {
        console.error(`Falta cobertura: ${reporte}. Ejecuta las suites con cobertura antes del análisis.`);
        process.exit(1);
    }
    const contenido = await readFile(reporte, 'utf8');
    await writeFile(reporte, contenido.replace(/^SF:src\//gm, `SF:apps/${app}/src/`));
}
const scanner = spawn('npx', ['--yes', '@sonar/scan@5.0.0'], { stdio: 'inherit', env: process.env });
scanner.on('error', () => { console.error('No se pudo iniciar SonarScanner.'); process.exitCode = 1; });
scanner.on('exit', code => { process.exitCode = code ?? 1; });
