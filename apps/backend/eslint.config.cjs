const eslintPluginTs = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    linterOptions: {
      reportUnusedDisableDirectives: true
    },
    plugins: {
      '@typescript-eslint': eslintPluginTs
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off'
    }
  }
];
