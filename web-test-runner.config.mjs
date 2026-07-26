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
        report: true,
        reportDir: 'coverage',
    },
};
