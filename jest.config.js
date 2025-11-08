module.exports = {
  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // A list of paths to directories that Jest should use to search for files in
  roots: ["./test"],

  // The test environment that will be used for testing
  testEnvironment: "node",

  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        isolatedModules: true,
      },
    ],
  },

  // Run setup for all tests
  setupFiles: ["<rootDir>/test/_setup/init-env.ts"],

  // Coverage
  collectCoverage: true,
  coverageDirectory: ".coverage",
  collectCoverageFrom: ["src/**/*.ts"],

  // Export test results fo SonarQube scanner to process test results
  testResultsProcessor: "jest-sonar-reporter",
}
