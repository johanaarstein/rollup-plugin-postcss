/** @type {import('ts-jest').JestConfigWithTsJest} * */
const jestConfig = {
  moduleNameMapper: { '@/(.*)': '<rootDir>/src/$1' },
  preset: 'ts-jest',
  // roots: ['<rootDir>/src'],
  testEnvironment: 'node',
  transform: {
    '^.+.tsx?$': ['ts-jest', {}],
  },
  transformIgnorePatterns: ['node_modules/(?!@ngrx|(?!deck.gl)|ng-dynamic)'],
  'ts-jest': {
    tsconfig: './tsconfig.test.json',
  },
}

export default jestConfig
