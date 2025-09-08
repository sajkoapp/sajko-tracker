import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

interface DoctorOptions {
  fix?: boolean;
}

interface Issue {
  type: 'error' | 'warning' | 'info';
  message: string;
  fix?: () => Promise<void>;
}

export async function doctor(options: DoctorOptions) {
  console.log(chalk.cyan('\n👨‍⚕️ SAJKO Doctor - Checking your setup\n'));

  const issues: Issue[] = [];
  const spinner = ora('Running diagnostics...').start();

  try {
    // Check 1: Configuration file
    spinner.text = 'Checking configuration...';
    await checkConfiguration(issues);

    // Check 2: Dependencies
    spinner.text = 'Checking dependencies...';
    await checkDependencies(issues);

    // Check 3: TypeScript setup
    spinner.text = 'Checking TypeScript setup...';
    await checkTypeScript(issues);

    // Check 4: Environment variables
    spinner.text = 'Checking environment...';
    await checkEnvironment(issues);

    // Check 5: Framework integration
    spinner.text = 'Checking framework integration...';
    await checkFrameworkIntegration(issues);

    // Check 6: Build setup
    spinner.text = 'Checking build setup...';
    await checkBuildSetup(issues);

    // Check 7: Common mistakes
    spinner.text = 'Checking for common issues...';
    await checkCommonMistakes(issues);

    spinner.stop();

    // Display results
    if (issues.length === 0) {
      console.log(chalk.green('\n✅ No issues found! Your SAJKO setup looks good.\n'));
      return;
    }

    // Group issues by type
    const errors = issues.filter(i => i.type === 'error');
    const warnings = issues.filter(i => i.type === 'warning');
    const info = issues.filter(i => i.type === 'info');

    console.log(chalk.cyan('\n📋 Diagnostic Results:\n'));

    if (errors.length > 0) {
      console.log(chalk.red(`❌ ${errors.length} Error${errors.length > 1 ? 's' : ''}:`));
      errors.forEach(issue => {
        console.log(chalk.red(`   • ${issue.message}`));
      });
      console.log();
    }

    if (warnings.length > 0) {
      console.log(chalk.yellow(`⚠️  ${warnings.length} Warning${warnings.length > 1 ? 's' : ''}:`));
      warnings.forEach(issue => {
        console.log(chalk.yellow(`   • ${issue.message}`));
      });
      console.log();
    }

    if (info.length > 0) {
      console.log(chalk.blue(`ℹ️  ${info.length} Suggestion${info.length > 1 ? 's' : ''}:`));
      info.forEach(issue => {
        console.log(chalk.blue(`   • ${issue.message}`));
      });
      console.log();
    }

    // Attempt fixes if requested
    if (options.fix) {
      const fixableIssues = issues.filter(i => i.fix);
      
      if (fixableIssues.length > 0) {
        console.log(chalk.cyan(`\n🔧 Attempting to fix ${fixableIssues.length} issue${fixableIssues.length > 1 ? 's' : ''}...\n`));
        
        for (const issue of fixableIssues) {
          const fixSpinner = ora(`Fixing: ${issue.message}`).start();
          try {
            await issue.fix!();
            fixSpinner.succeed(chalk.green(`Fixed: ${issue.message}`));
          } catch (error) {
            fixSpinner.fail(chalk.red(`Failed to fix: ${issue.message}`));
          }
        }
      } else {
        console.log(chalk.yellow('\n⚠️  No auto-fixable issues found.'));
        console.log(chalk.gray('Please fix the issues manually.'));
      }
    } else if (issues.some(i => i.fix)) {
      console.log(chalk.gray('\n💡 Run with --fix to attempt automatic fixes'));
    }

  } catch (error) {
    spinner.fail(chalk.red('Doctor check failed'));
    console.error(error);
    process.exit(1);
  }
}

async function checkConfiguration(issues: Issue[]) {
  const configFiles = [
    'sajko.config.ts',
    'sajko.config.js',
    '.sajkorc.json'
  ];

  const found = [];
  for (const file of configFiles) {
    if (await fs.pathExists(file)) {
      found.push(file);
    }
  }

  if (found.length === 0) {
    issues.push({
      type: 'error',
      message: 'No SAJKO configuration file found',
      fix: async () => {
        // Create default config
        const config = {
          websiteId: 'YOUR_WEBSITE_ID',
          debug: true
        };
        await fs.writeJson('.sajkorc.json', config, { spaces: 2 });
      }
    });
  } else if (found.length > 1) {
    issues.push({
      type: 'warning',
      message: `Multiple config files found: ${found.join(', ')}`
    });
  } else {
    // Check config content
    try {
      const content = await fs.readFile(found[0], 'utf-8');
      
      if (!content.includes('websiteId')) {
        issues.push({
          type: 'error',
          message: 'Configuration missing websiteId'
        });
      }
      
      if (content.includes('YOUR_WEBSITE_ID')) {
        issues.push({
          type: 'error',
          message: 'Configuration contains placeholder website ID'
        });
      }
    } catch {
      // Ignore read errors
    }
  }
}

async function checkDependencies(issues: Issue[]) {
  const packageJson = await fs.pathExists('package.json') 
    ? await fs.readJson('package.json') 
    : null;

  if (!packageJson) {
    issues.push({
      type: 'error',
      message: 'No package.json found'
    });
    return;
  }

  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };

  // Check for SAJKO packages
  const sajkoPackages = [
    '@sajko/tracker',
    '@sajko/react',
    '@sajko/nextjs',
    '@sajko/vue'
  ];

  const installed = sajkoPackages.filter(pkg => deps[pkg]);
  
  if (installed.length === 0) {
    issues.push({
      type: 'error',
      message: 'No SAJKO package installed',
      fix: async () => {
        execSync('npm install @sajko/tracker', { stdio: 'pipe' });
      }
    });
  } else if (installed.length > 1) {
    // Check for framework mismatch
    if (deps['@sajko/react'] && !deps['react']) {
      issues.push({
        type: 'warning',
        message: '@sajko/react installed but React not found'
      });
    }
    if (deps['@sajko/vue'] && !deps['vue']) {
      issues.push({
        type: 'warning',
        message: '@sajko/vue installed but Vue not found'
      });
    }
  }

  // Check versions
  for (const pkg of installed) {
    const version = deps[pkg];
    if (version && !version.includes('1.')) {
      issues.push({
        type: 'warning',
        message: `${pkg} might be outdated (${version})`
      });
    }
  }
}

async function checkTypeScript(issues: Issue[]) {
  const hasTsConfig = await fs.pathExists('tsconfig.json');
  const hasTypeScript = await fs.pathExists('node_modules/typescript');
  
  if (hasTsConfig && !hasTypeScript) {
    issues.push({
      type: 'warning',
      message: 'TypeScript config found but TypeScript not installed',
      fix: async () => {
        execSync('npm install --save-dev typescript', { stdio: 'pipe' });
      }
    });
  }

  if (hasTsConfig) {
    try {
      const tsConfig = await fs.readJson('tsconfig.json');
      
      // Check for strict mode
      if (!tsConfig.compilerOptions?.strict) {
        issues.push({
          type: 'info',
          message: 'Consider enabling TypeScript strict mode for better type safety'
        });
      }
    } catch {
      // Ignore parse errors
    }
  }
}

async function checkEnvironment(issues: Issue[]) {
  // Check for environment files
  const envFiles = ['.env', '.env.local', '.env.development'];
  const hasEnv = await Promise.all(envFiles.map(f => fs.pathExists(f)));
  
  if (hasEnv.some(Boolean)) {
    // Check for SAJKO-related env vars
    for (let i = 0; i < envFiles.length; i++) {
      if (hasEnv[i]) {
        try {
          const content = await fs.readFile(envFiles[i], 'utf-8');
          
          if (content.includes('SAJKO_') || content.includes('NEXT_PUBLIC_SAJKO')) {
            // Good, has SAJKO config
            return;
          }
        } catch {
          // Ignore read errors
        }
      }
    }
    
    issues.push({
      type: 'info',
      message: 'Consider adding SAJKO configuration to environment variables'
    });
  }
}

async function checkFrameworkIntegration(issues: Issue[]) {
  // Check Next.js
  if (await fs.pathExists('next.config.js') || await fs.pathExists('next.config.mjs')) {
    const hasNextPackage = await checkPackageInstalled('@sajko/nextjs');
    
    if (!hasNextPackage) {
      issues.push({
        type: 'warning',
        message: 'Next.js detected but @sajko/nextjs not installed',
        fix: async () => {
          execSync('npm install @sajko/nextjs', { stdio: 'pipe' });
        }
      });
    }
    
    // Check for _app or layout file
    const appFiles = [
      'pages/_app.tsx',
      'pages/_app.js',
      'app/layout.tsx',
      'app/layout.js'
    ];
    
    let hasIntegration = false;
    for (const file of appFiles) {
      if (await fs.pathExists(file)) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.includes('SajkoScript') || content.includes('@sajko')) {
          hasIntegration = true;
          break;
        }
      }
    }
    
    if (!hasIntegration && hasNextPackage) {
      issues.push({
        type: 'warning',
        message: '@sajko/nextjs installed but not integrated in _app or layout'
      });
    }
  }

  // Check React
  if (await checkPackageInstalled('react')) {
    const hasReactPackage = await checkPackageInstalled('@sajko/react');
    
    if (!hasReactPackage && !await checkPackageInstalled('@sajko/nextjs')) {
      issues.push({
        type: 'info',
        message: 'React detected - consider using @sajko/react for better integration'
      });
    }
  }

  // Check Vue
  if (await checkPackageInstalled('vue')) {
    const hasVuePackage = await checkPackageInstalled('@sajko/vue');
    
    if (!hasVuePackage) {
      issues.push({
        type: 'info',
        message: 'Vue detected - consider using @sajko/vue for better integration'
      });
    }
  }
}

async function checkBuildSetup(issues: Issue[]) {
  const packageJson = await fs.pathExists('package.json') 
    ? await fs.readJson('package.json') 
    : null;

  if (!packageJson?.scripts?.build) {
    return; // No build script, skip
  }

  // Check for common build tools
  const buildTools = ['vite', 'webpack', 'rollup', 'esbuild', 'parcel'];
  const hasBuildTool = buildTools.some(tool => 
    packageJson.devDependencies?.[tool] || 
    packageJson.dependencies?.[tool]
  );

  if (!hasBuildTool && !await fs.pathExists('next.config.js')) {
    issues.push({
      type: 'info',
      message: 'No recognized build tool found - make sure SAJKO is properly bundled'
    });
  }
}

async function checkCommonMistakes(issues: Issue[]) {
  // Check for multiple tracker scripts
  const htmlFiles = await findFiles('**/*.html', 10);
  
  for (const file of htmlFiles) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      
      // Check for multiple SAJKO scripts
      const scriptMatches = content.match(/sajko.*\.js/gi) || [];
      if (scriptMatches.length > 1) {
        issues.push({
          type: 'warning',
          message: `Multiple SAJKO scripts found in ${file}`
        });
      }
      
      // Check for incorrect script placement
      if (content.includes('sajko') && content.includes('</body>')) {
        const sajkoIndex = content.indexOf('sajko');
        const bodyIndex = content.indexOf('</body>');
        
        if (sajkoIndex > bodyIndex) {
          issues.push({
            type: 'warning',
            message: `SAJKO script placed after </body> in ${file}`
          });
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  // Check for console.log statements
  const jsFiles = await findFiles('**/*.{js,jsx,ts,tsx}', 20);
  
  for (const file of jsFiles) {
    if (file.includes('node_modules')) continue;
    
    try {
      const content = await fs.readFile(file, 'utf-8');
      
      if (content.includes('console.log') && content.includes('sajko')) {
        issues.push({
          type: 'info',
          message: `Remove console.log statements in ${file}`
        });
      }
    } catch {
      // Ignore read errors
    }
  }
}

async function checkPackageInstalled(packageName: string): Promise<boolean> {
  try {
    const packageJson = await fs.readJson('package.json');
    return !!(
      packageJson.dependencies?.[packageName] || 
      packageJson.devDependencies?.[packageName]
    );
  } catch {
    return false;
  }
}

async function findFiles(pattern: string, maxFiles: number): Promise<string[]> {
  // Simplified file finding - in real implementation would use glob
  const files: string[] = [];
  
  async function scan(dir: string, depth: number = 0) {
    if (depth > 3 || files.length >= maxFiles) return;
    
    try {
      const entries = await fs.readdir(dir);
      
      for (const entry of entries) {
        if (entry.startsWith('.') || entry === 'node_modules') continue;
        
        const fullPath = path.join(dir, entry);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          await scan(fullPath, depth + 1);
        } else if (entry.endsWith('.html') || entry.endsWith('.js') || entry.endsWith('.ts')) {
          files.push(fullPath);
        }
        
        if (files.length >= maxFiles) break;
      }
    } catch {
      // Ignore errors
    }
  }
  
  await scan('.');
  return files;
}