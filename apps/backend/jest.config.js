module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  moduleNameMapper: {
    '^@ventasve/database$': '<rootDir>/src/tests/prisma-mock.ts'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { diagnostics: false }]
  }
};
