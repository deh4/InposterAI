/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jest-environment-node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
};

module.exports = config;
