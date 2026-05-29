module.exports = {
  extends: ["next/core-web-vitals"],
  plugins: ["sonarjs"],
  rules: {
    "sonarjs/no-duplicate-string": "error",
  },
};
