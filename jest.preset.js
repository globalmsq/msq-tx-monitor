const { pathsToModuleNameMapper } = require('ts-jest');
const { createReadStream } = require('fs');
const { readFileSync } = require('fs');
const path = require('path');

// Read tsconfig.base.json to get path mappings
const tsconfig = JSON.parse(
  readFileSync(path.join(__dirname, 'tsconfig.base.json'), 'utf8')
);

module.exports = {
  testMatch: ['**/+(*.)+(spec|test).+(ts|js)?(x)'],
  transform: {
    '^.+\\.(ts|js|html)$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.base.json',
    }],
  },
  resolver: '@nx/jest/plugins/resolver',
  moduleFileExtensions: ['ts', 'js', 'html'],
  collectCoverageFrom: [
    '**/*.{ts,js}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**'
  ],
  coverageReporters: ['html', 'lcov', 'text-summary'],
  passWithNoTests: true,
  // Map tsconfig paths to Jest
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths || {}, {
    prefix: '<rootDir>/'
  }),
  setupFilesAfterEnv: [],
};