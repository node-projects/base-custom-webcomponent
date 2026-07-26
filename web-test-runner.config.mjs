import { chromeLauncher } from '@web/test-runner';

const ciArgs = process.env.CI
    ? ['--no-sandbox', '--disable-dev-shm-usage']
    : [];

export default {
    files: 'test/**/*.test.js',
    nodeResolve: true,
    concurrency: 2,
    concurrentBrowsers: 1,
    browsers: [
        chromeLauncher({
            launchOptions: {
                args: ciArgs,
            },
        }),
    ],
    coverageConfig: {
        include: ['dist/**/*.js'],
        exclude: ['dist/index-min.js'],
        threshold: {
            statements: 80,
            branches: 95,
            functions: 80,
            lines: 75,
        },
        report: true,
        reportDir: 'coverage',
    },
};
