/** @type {import('ts-jest').JestConfigWithTsJest} * */
const jestConfig = {
  moduleNameMapper: { '@/(.*)': '<rootDir>/src/$1' },
  // roots: ['<rootDir>/src'],
  testEnvironment: 'node',
  transform: {
    '^.+.tsx?$': ['ts-jest', {}],
  },
  transformIgnorePatterns: ['node_modules/(?!@ngrx|(?!deck.gl)|ng-dynamic)'],
}

export default jestConfig
