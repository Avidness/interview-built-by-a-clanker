/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true, tsconfig: "tsconfig.test.json" }],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@acme/shared$": "<rootDir>/../../packages/shared/src/index.ts",
  },
  setupFiles: ["<rootDir>/test/setup-env.ts"],
  clearMocks: true,
};
