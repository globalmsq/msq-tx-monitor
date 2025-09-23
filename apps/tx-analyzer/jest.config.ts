export default {
  displayName: 'tx-analyzer',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: '../../coverage/apps/tx-analyzer',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  testMatch: ['<rootDir>/src/**/*.(test|spec).ts'],
};