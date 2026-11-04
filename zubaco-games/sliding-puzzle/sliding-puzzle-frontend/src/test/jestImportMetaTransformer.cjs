const { TsJestTransformer } = require('ts-jest');

const transformer = new TsJestTransformer({
  tsconfig: '<rootDir>/tsconfig.jest.json',
  diagnostics: false,
});

module.exports = {
  process(sourceText, sourcePath, options) {
    const patched = sourceText.replace(/import\.meta\.env/g, 'process.env');
    return transformer.process(patched, sourcePath, options);
  },
  getCacheKey(sourceText, sourcePath, options) {
    const patched = sourceText.replace(/import\.meta\.env/g, 'process.env');
    return transformer.getCacheKey(patched, sourcePath, options);
  },
};
