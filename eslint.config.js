import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        chrome: 'readonly',
        browser: 'readonly',
        console: 'readonly',
        fetch: 'readonly'
      }
    },
    rules: {
      // Code quality
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      
      // Formatting (handled by prettier, but good to have as backup)
      'indent': ['error', 2],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      
      // Browser extension specific
      'no-undef': 'error',
      'no-global-assign': 'error',
      
      // Modern JavaScript
      'arrow-spacing': 'error',
      'template-curly-spacing': 'error',
      'object-curly-spacing': ['error', 'always']
    }
  }
]; 