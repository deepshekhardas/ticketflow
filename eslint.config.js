import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*']
  },
  {
    files: ['**/*.rules'],
    plugins: {
      'security-rules': firebaseRulesPlugin
    },
    languageOptions: {
        parser: firebaseRulesPlugin.parser,
    },
    rules: {
        ...firebaseRulesPlugin.configs.recommended.rules
    }
  }
];
