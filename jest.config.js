module.exports = {
  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // A list of paths to directories that Jest should use to search for files in
  roots: ["./test", "./src"],

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

  // Transform ES modules from node_modules - allow Jest to handle them
  transformIgnorePatterns: [
    "node_modules/(?!(@modelcontextprotocol|zod-to-json-schema)/)",
  ],

  // Run setup for all tests
  setupFiles: ["<rootDir>/test/_setup/init-env.ts"],

  // Map path aliases
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/src/$1",
  },

  // Coverage
  collectCoverage: true,
  coverageDirectory: ".coverage",
  collectCoverageFrom: ["src/**/*.ts"],
}
