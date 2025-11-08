module.exports = {
  extends: "@tomassabol/eslint-config-aws",
  settings: {
    "import/resolver": {
      typescript: {
        project: "./tsconfig.json",
      },
    },
  },
}
