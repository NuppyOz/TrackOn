import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['test/**/*.test.ts'],
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