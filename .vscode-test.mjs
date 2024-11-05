import { defineConfig } from '@vscode/test-cli'

export default defineConfig([
  {
    label: 'unitTests',
    files: 'out/src/test/vscode/*.test.js',
    version: 'stable',
  }
]);