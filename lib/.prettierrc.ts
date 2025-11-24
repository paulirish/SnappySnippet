// https://prettier.io/docs/en/options.html

import {type Config} from 'prettier';

// If you change anything here, you probably have to reload vscode windows to pick it up.
const config: Config = {
  printWidth: 160,
  tabWidth: 2,
  singleQuote: true,
  trailingComma: 'es5',
  bracketSpacing: false,
  arrowParens: 'avoid',
};

export default config;
