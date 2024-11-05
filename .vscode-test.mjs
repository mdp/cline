// .vscode-test.js
const { defineConfig } = require('@vscode/test-cli');

module.exports = defineConfig([
  {
    label: 'unitTests',
    files: 'out/src/test/vscode/*.test.js',
    version: 'stable',
  }
  // you can specify additional test configurations, too
]);