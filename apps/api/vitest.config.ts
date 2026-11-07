import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['test/**/*.test.ts'],
        // Las pruebas que escriben en la base solo corren contra trackon_test (compose.test.yaml) o con TRACKON_RUN_DB_TESTS=1.
        exclude: process.env.TRACKON_RUN_DB_TESTS === '1' || /trackon_test/.test(process.env.DATABASE_URL ?? '')
            ? ['**/node_modules/**']
            : ['**/node_modules/**', 'test/**/*.integration.test.ts', 'test/app.integration.test.ts', 'test/fuentes.BS02.test.ts', 'test/fuentes.BS03-BS04.test.ts', 'test/gerencial.h8.cortes.test.ts', 'test/inteligencia.h5.integration.test.ts', 'test/comercial.portal-login-race.test.ts'],
        fileParallelism: false,

        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            reportsDirectory: 'coverage',

            include: ['src/**/*.ts'],

            exclude: [
                'src/server.ts',
                'src/types/**',
            ],
        },
    },
});