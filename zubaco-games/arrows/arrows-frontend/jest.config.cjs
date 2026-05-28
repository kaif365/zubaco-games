/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  transform: {
    "^.+\\.(ts|tsx)$": "<rootDir>/src/test/jestImportMetaTransformer.cjs",
  },
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(gif|ttf|eot|svg|png|jpg|jpeg|webp)$": "<rootDir>/src/test/fileMock.ts",
    "^@/constants/api$": "<rootDir>/src/test/mocks/apiConstants.ts",
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@app/config/appConfig$": "<rootDir>/src/test/mocks/appConfig.ts",
    "^@app/(.*)$": "<rootDir>/src/app/$1",
    "^@components/(.*)$": "<rootDir>/src/components/$1",
    "^@pages/(.*)$": "<rootDir>/src/pages/$1",
    "^@lib/(.*)$": "<rootDir>/src/lib/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@hooks/(.*)$": "<rootDir>/src/hooks/$1",
    "^@features/(.*)$": "<rootDir>/src/features/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
    "^@types/(.*)$": "<rootDir>/src/types/$1",
    "^@micro-screens/(.*)$": "<rootDir>/micro-screens/$1",
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
};
