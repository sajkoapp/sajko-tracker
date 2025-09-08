import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import * as detectPM from 'detect-package-manager';
import { FileInjector } from '../utils/file-injector';

interface InitOptions {
  framework?: string;
  packageManager?: string;
  install?: boolean;
  local?: boolean;
}

interface InitAnswers {
  framework: string;
  websiteId: string;
  apiEndpoint: string;
  packageManager: string;
  typescript: boolean;
  install: boolean;
  autoInject: boolean;
}

export async function init(options: InitOptions) {
  console.log(chalk.cyan('\n🎯 Initializing SAJKO Analytics\n'));

  // Detect current package manager
  const detectedPM = await (detectPM as any).detect().catch(() => 'npm');

  // Prompt for configuration
  const answers = await inquirer.prompt<InitAnswers>([
    {
      type: 'list',
      name: 'framework',
      message: 'Which framework are you using?',
      choices: [
        { name: 'React', value: 'react' },
        { name: 'Next.js', value: 'nextjs' },
        { name: 'Vue.js', value: 'vue' },
        { name: 'Vanilla JavaScript', value: 'vanilla' },
        { name: 'Other / Custom', value: 'custom' }
      ],
      default: options.framework
    },
    {
      type: 'input',
      name: 'websiteId',
      message: 'Enter your website ID:',
      validate: (input) => input.length > 0 || 'Website ID is required'
    },
    {
      type: 'input',
      name: 'apiEndpoint',
      message: 'API endpoint (leave empty for default):',
      default: 'https://api.sajko.app'
    },
    {
      type: 'list',
      name: 'packageManager',
      message: 'Which package manager to use?',
      choices: ['npm', 'yarn', 'pnpm', 'bun'],
      default: options.packageManager || detectedPM
    },
    {
      type: 'confirm',
      name: 'typescript',
      message: 'Are you using TypeScript?',
      default: fs.existsSync('tsconfig.json')
    },
    {
      type: 'confirm',
      name: 'install',
      message: 'Install dependencies now?',
      default: options.install !== false
    },
    {
      type: 'confirm',
      name: 'autoInject',
      message: 'Automatically integrate SAJKO into your project files?',
      default: true
    }
  ]);

  const spinner = ora('Setting up SAJKO...').start();

  try {
    // Determine package to install
    const packageName = getPackageName(answers.framework);
    
    // Install dependencies
    if (answers.install) {
      spinner.text = `Installing ${packageName}...`;
      const installResult = await installPackage(packageName, answers.packageManager, options.local);
      
      if (!installResult.success) {
        if (installResult.isNotFound) {
          console.log(chalk.yellow(`\n⚠️  Package ${packageName} not found on NPM.`));
          
          // Try local installation as fallback
          if (!options.local) {
            console.log(chalk.cyan('Attempting local package installation...'));
            const localResult = await installPackage(packageName, answers.packageManager, true);
            if (!localResult.success) {
              console.log(chalk.yellow(`\n⚠️  Could not install ${packageName}`));
              console.log(chalk.gray('The package will need to be installed manually.'));
            }
          }
        } else {
          console.log(chalk.yellow(`\n⚠️  Installation failed: ${installResult.error}`));
        }
      }
    }

    // Create configuration file
    spinner.text = 'Creating configuration...';
    await createConfig(answers);

    // Auto-inject into project files
    if (answers.autoInject) {
      spinner.text = 'Integrating SAJKO into your project...';
      const injectionResult = await injectIntoProject(answers);
      
      if (injectionResult.success) {
        console.log(chalk.green(`\n✅ Integrated SAJKO into ${injectionResult.filePath}`));
        
        if (injectionResult.diff) {
          console.log(chalk.cyan('\n📝 Changes made:'));
          console.log(injectionResult.diff);
        }
        
        if (injectionResult.backup) {
          console.log(chalk.gray(`\n💾 Backup created: ${injectionResult.backup}`));
        }
      } else {
        console.log(chalk.yellow(`\n⚠️  Could not auto-inject: ${injectionResult.error}`));
        console.log(chalk.gray('Please follow the manual integration steps below.'));
      }
    } else {
      // Create example implementation
      spinner.text = 'Creating example implementation...';
      await createExample(answers);
    }

    // Add to .gitignore
    await updateGitignore();

    spinner.succeed(chalk.green('✅ SAJKO initialized successfully!'));

    // Show next steps
    console.log(chalk.cyan('\n📋 Next steps:\n'));
    
    if (answers.autoInject) {
      console.log('1. SAJKO has been integrated into your project!');
      console.log('2. Test your integration:');
      console.log(chalk.gray('  npx sajko test'));
      console.log('\n3. Monitor events in debug mode:');
      console.log(chalk.gray('  npx sajko debug'));
    } else if (answers.framework === 'react') {
      console.log('1. Import and use SAJKO in your app:');
      console.log(chalk.gray(`
  import { useSajko } from '@sajko/react';
  
  const { track, identify } = useSajko({
    websiteId: '${answers.websiteId}'
  });`));
    } else if (answers.framework === 'nextjs') {
      console.log('1. Add SajkoScript to your _app or layout:');
      console.log(chalk.gray(`
  import { SajkoScript } from '@sajko/nextjs';
  
  <SajkoScript config={{ websiteId: '${answers.websiteId}' }} />`));
    } else if (answers.framework === 'vue') {
      console.log('1. Install the plugin in your main.js:');
      console.log(chalk.gray(`
  import { SajkoPlugin } from '@sajko/vue';
  
  app.use(SajkoPlugin, {
    websiteId: '${answers.websiteId}'
  });`));
    } else {
      console.log('1. Add the tracking script to your HTML:');
      console.log(chalk.gray(`
  <script>
    window.sajkoConfig = {
      websiteId: '${answers.websiteId}'
    };
  </script>
  <script src="https://cdn.sajko.app/v4/sajko-replay.js" async></script>`));
    }

    console.log('\n2. Test your integration:');
    console.log(chalk.gray('  npx sajko test'));
    
    console.log('\n3. Monitor events in debug mode:');
    console.log(chalk.gray('  npx sajko debug'));

  } catch (error) {
    spinner.fail(chalk.red('Failed to initialize SAJKO'));
    console.error(error);
    process.exit(1);
  }
}

function getPackageName(framework: string): string {
  switch (framework) {
    case 'react': return '@sajko/react';
    case 'nextjs': return '@sajko/nextjs';
    case 'vue': return '@sajko/vue';
    default: return '@sajko/tracker';
  }
}

async function installPackage(
  packageName: string, 
  pm: string, 
  useLocal?: boolean
): Promise<{ success: boolean; error?: string; isNotFound?: boolean }> {
  try {
    if (useLocal) {
      // Check if we're in or near the sajko-tracker directory
      const possiblePaths = [
        path.join(process.cwd(), 'packages'),
        path.join(process.cwd(), '../sajko-tracker/packages'),
        path.join(process.cwd(), '../../sajko-tracker/packages'),
        path.join(__dirname, '../../../packages')
      ];
      
      let packagePath: string | null = null;
      const packageDir = packageName.replace('@sajko/', '');
      
      for (const basePath of possiblePaths) {
        const fullPath = path.join(basePath, packageDir === 'tracker' ? 'core' : packageDir);
        if (await fs.pathExists(fullPath)) {
          packagePath = fullPath;
          break;
        }
      }
      
      if (packagePath) {
        // Use local package
        const commands: Record<string, string> = {
          npm: `npm install file:${packagePath}`,
          yarn: `yarn add file:${packagePath}`,
          pnpm: `pnpm add file:${packagePath}`,
          bun: `bun add file:${packagePath}`
        };
        
        execSync(commands[pm], { stdio: 'pipe' });
        console.log(chalk.green(`\n✅ Installed ${packageName} from local packages`));
        return { success: true };
      } else {
        return { 
          success: false, 
          error: 'Local packages not found. Make sure you are near the sajko-tracker directory.' 
        };
      }
    } else {
      // Check if package exists on NPM first
      try {
        execSync(`npm view ${packageName} version`, { stdio: 'pipe' });
      } catch {
        return { success: false, isNotFound: true };
      }
      
      // Install from NPM
      const commands: Record<string, string> = {
        npm: `npm install ${packageName}`,
        yarn: `yarn add ${packageName}`,
        pnpm: `pnpm add ${packageName}`,
        bun: `bun add ${packageName}`
      };
      
      execSync(commands[pm], { stdio: 'pipe' });
      console.log(chalk.green(`\n✅ Installed ${packageName} from NPM`));
      return { success: true };
    }
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Installation failed' 
    };
  }
}

async function createConfig(answers: InitAnswers) {
  const configContent = {
    websiteId: answers.websiteId,
    apiEndpoint: answers.apiEndpoint || undefined,
    debug: process.env.NODE_ENV === 'development',
    privacy: {
      maskEmails: true,
      maskPhones: true
    },
    performance: {
      throttleMs: 50,
      maxEventsPerBatch: 50
    }
  };

  const filename = answers.typescript ? 'sajko.config.ts' : 'sajko.config.js';
  const content = answers.typescript
    ? `import type { SajkoConfig } from '@sajko/tracker';

const config: SajkoConfig = ${JSON.stringify(configContent, null, 2)};

export default config;`
    : `module.exports = ${JSON.stringify(configContent, null, 2)};`;

  await fs.writeFile(filename, content);
}

async function createExample(answers: InitAnswers) {
  const exampleDir = path.join(process.cwd(), 'src', 'sajko-example');
  await fs.ensureDir(exampleDir);

  if (answers.framework === 'react') {
    const content = `import React from 'react';
import { useSajko, usePageView } from '@sajko/react';

export function SajkoExample() {
  const { track, identify, getSessionId } = useSajko();
  
  // Track page views automatically
  usePageView();
  
  const handleClick = () => {
    track('button_click', {
      button: 'example',
      timestamp: Date.now()
    });
  };
  
  const handleLogin = (userId: string) => {
    identify(userId, {
      email: 'user@example.com',
      plan: 'premium'
    });
  };
  
  return (
    <div>
      <p>Session ID: {getSessionId()}</p>
      <button onClick={handleClick}>Track Click</button>
    </div>
  );
}`;
    await fs.writeFile(
      path.join(exampleDir, answers.typescript ? 'Example.tsx' : 'Example.jsx'),
      content
    );
  } else if (answers.framework === 'nextjs') {
    const content = `import { useTracker, usePageView } from '@sajko/nextjs';

export default function Example() {
  const track = useTracker();
  
  // Auto-track page views
  usePageView();
  
  return (
    <button onClick={() => track('click', { page: 'example' })}>
      Track Event
    </button>
  );
}`;
    await fs.writeFile(
      path.join(exampleDir, answers.typescript ? 'example.tsx' : 'example.jsx'),
      content
    );
  } else if (answers.framework === 'vue') {
    const content = `<template>
  <div>
    <p>Session: {{ sessionId }}</p>
    <button @click="trackClick">Track Click</button>
  </div>
</template>

<script setup>
import { useSajko, usePageView } from '@sajko/vue';

const { track, getSessionId } = useSajko();
const sessionId = getSessionId();

// Auto-track page views
usePageView();

const trackClick = () => {
  track('button_click', { 
    button: 'example',
    timestamp: Date.now()
  });
};
</script>`;
    await fs.writeFile(path.join(exampleDir, 'Example.vue'), content);
  }
}

async function updateGitignore() {
  const gitignorePath = '.gitignore';
  const sajkoIgnores = '\n# SAJKO Analytics\nsajko.config.js\nsajko.config.ts\n.sajko-cache/\n';

  try {
    if (await fs.pathExists(gitignorePath)) {
      const content = await fs.readFile(gitignorePath, 'utf-8');
      if (!content.includes('# SAJKO Analytics')) {
        await fs.appendFile(gitignorePath, sajkoIgnores);
      }
    }
  } catch {
    // Ignore errors
  }
}

async function injectIntoProject(answers: InitAnswers) {
  const injector = new FileInjector();
  const projectRoot = process.cwd();

  switch (answers.framework) {
    case 'nextjs':
      // Try App Router first, then Pages Router
      let result = await injector.injectNextAppRouter(
        projectRoot,
        answers.websiteId,
        answers.typescript
      );
      
      if (!result.success) {
        result = await injector.injectNextPagesRouter(
          projectRoot,
          answers.websiteId,
          answers.typescript
        );
      }
      
      return result;

    case 'react':
      return injector.injectReact(
        projectRoot,
        answers.websiteId,
        answers.typescript
      );

    case 'vue':
      return injector.injectVue(
        projectRoot,
        answers.websiteId,
        answers.typescript
      );

    case 'vanilla':
      return injector.injectVanilla(projectRoot, answers.websiteId);

    default:
      return {
        success: false,
        error: 'Framework not supported for auto-injection'
      };
  }
}