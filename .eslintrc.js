module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    webextensions: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  globals: {
    chrome: 'readonly',
    browser: 'readonly'
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
  },
  overrides: [
    {
      files: ['tests/**/*.js'],
      env: {
        jest: true
      }
    }
  ]
}; 