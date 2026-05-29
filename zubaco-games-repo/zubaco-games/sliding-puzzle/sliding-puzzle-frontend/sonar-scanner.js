process.env.SONAR_SCANNER_SKIP_JRE_PROVISIONING = 'true';
import { scan } from 'sonarqube-scanner';

const token =
  process.argv.find((arg) => arg.includes('sonar.token='))?.split('=')[1] ||
  process.env.SONAR_TOKEN ||
  process.env['npm_config_dsonar.token'] ||
  process.env['npm_config_sonar.token'];

if (!token) {
  console.error(
    'Error: Please provide a sonar token using -Dsonar.token=... or SONAR_TOKEN env var'
  );
  process.exit(1);
}

console.log('Sonar token detected. Starting scan...');

scan(
  {
    serverUrl: 'http://localhost:9000',
    options: {
      'sonar.projectBaseDir': process.cwd(),
      'sonar.token': token,
      'sonar.projectKey': 'ZUBACO-games-base',
      'sonar.projectName': 'ZUBACO Games Base',
      'sonar.projectVersion': '1.0.0',
      'sonar.sources': 'src',
      'sonar.tests': 'src',
      'sonar.test.inclusions': 'src/test/**/*.{ts,tsx},src/**/*.{test,spec}.{ts,tsx}',
      'sonar.exclusions':
        'src/test/**,src/**/*.test.tsx,src/**/*.test.ts,src/**/*.spec.ts,src/**/*.d.ts,node_modules/**,dist/**',
      'sonar.coverage.exclusions':
        'src/test/**,src/**/*.test.tsx,src/**/*.test.ts,src/**/*.spec.ts,src/main.tsx,src/vite-env.d.ts,src/app/config/**,src/app/providers/**,src/types/**',
      'sonar.scm.disabled': 'true',
      'sonar.typescript.tsconfigPath': 'tsconfig.app.json',
      'sonar.javascript.lcov.reportPaths': 'coverage/lcov.info',
      'sonar.sourceEncoding': 'UTF-8',
    },
  },
  () => process.exit()
);
