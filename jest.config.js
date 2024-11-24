/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  projects: [
    // Server tests configuration
    {
      displayName: 'server',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/test/server/**/*.test.ts',
        '<rootDir>/src/shared/dtos/**/*.spec.ts',
        '<rootDir>/src/shared/dtos/**/*.benchmark.ts'
      ],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.server.json',
          isolatedModules: true,
        }],
      },
      moduleFileExtensions: ['ts', 'js', 'json', 'node'],
      moduleNameMapper: {
        '^src/(.*)$': '<rootDir>/src/$1'
      },
      setupFilesAfterEnv: ['<rootDir>/test/setupServerTests.ts'],
      moduleDirectories: ['node_modules', 'src'],
      roots: ['<rootDir>'],
    },
    // Client tests configuration
    {
      displayName: 'client',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/test/client/**/*.test.{ts,tsx}'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
          isolatedModules: true,
        }],
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      moduleNameMapper: {
        '^src/(.*)$': '<rootDir>/src/$1'
      },
      setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
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
    '!src/**/index.{ts,tsx}'
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
