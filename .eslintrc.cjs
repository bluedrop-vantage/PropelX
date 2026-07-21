module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  overrides: [
    {
      // Engine must be deterministic (spec §9.8) — forbid nondeterministic APIs.
      files: ['packages/engine/src/**/*.ts'],
      rules: {
        'no-restricted-globals': [
          'error',
          { name: 'Date', message: 'Engine must be deterministic — no Date.now() or new Date().' },
        ],
        'no-restricted-properties': [
          'error',
          { object: 'Math', property: 'random', message: 'Engine must be deterministic — no Math.random().' },
        ],
      },
    },
    {
      // Web bundle must not reference the Together.ai key.
      files: ['packages/web/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: "MemberExpression[object.name='import'][property.name='meta'] > Identifier[name=/^VITE_TOGETHER/]",
            message: 'Never expose the Together.ai key to the browser. Route calls through packages/proxy.',
          },
        ],
      },
    },
  ],
  ignorePatterns: ['dist', 'build', 'coverage', 'node_modules'],
};
