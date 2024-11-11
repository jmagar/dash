/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  projects: [
    // Server tests configuration
    {
      displayName: 'server',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/server/**/*.test.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.server.json',
          isolatedModules: true,
        }],
      },
      moduleFileExtensions: ['ts', 'js', 'json', 'node'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      setupFilesAfterEnv: ['<rootDir>/src/setupServerTests.ts'],
      moduleDirectories: ['node_modules', 'src'],
    },
    // Client tests configuration
    {
      displayName: 'client',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/client/**/*.test.{ts,tsx}'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
          isolatedModules: true,
        }],
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
      moduleDirectories: ['node_modules', 'src'],
      testEnvironmentOptions: {
        url: 'http://localhost'
      }
    },
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**/*',
    '!src/**/index.{ts,tsx}',
    '!src/setupTests.ts',
    '!src/setupServerTests.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
