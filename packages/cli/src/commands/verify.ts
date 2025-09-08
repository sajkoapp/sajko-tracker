import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';

interface VerifyOptions {
  websiteId?: string;
  endpoint?: string;
}

export async function verify(options: VerifyOptions = {}) {
  console.log(chalk.cyan('\n✅ Verifying SAJKO Installation\n'));

  const spinner = ora('Loading configuration...').start();

  try {
    // Load config from file
    const config = await loadConfig();
    const websiteId = options.websiteId || config.websiteId;
    const endpoint = options.endpoint || config.apiEndpoint || process.env.NEXT_PUBLIC_APP_URL || 'https://app.sajko.sk';

    if (!websiteId) {
      spinner.fail(chalk.red('No website ID found'));
      console.log(chalk.gray('\nPlease run "sajko init" first or provide --website-id'));
      process.exit(1);
    }

    spinner.text = 'Verifying website configuration...';

    // Call the verify endpoint
    try {
      const response = await axios.post(
        `${endpoint}/api/website/${websiteId}/verify`,
        {},
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.data.success) {
        spinner.succeed(chalk.green('✅ Verification successful!'));
        
        console.log(chalk.cyan('\n📊 Website Details:\n'));
        console.log(`  Website ID: ${chalk.white(response.data.websiteId)}`);
        console.log(`  Domain: ${chalk.white(response.data.domain)}`);
        console.log(`  Name: ${chalk.white(response.data.name)}`);
        console.log(`  Status: ${chalk.green(response.data.status)}`);
        console.log(`  Verified At: ${chalk.white(new Date(response.data.verifiedAt).toLocaleString())}`);
        
        console.log(chalk.cyan('\n✨ Your website is verified and ready!\n'));
        console.log(chalk.gray('You can now activate tracking in the dashboard.'));
        
        process.exit(0);
      } else {
        spinner.fail(chalk.red('Verification failed'));
        console.log(chalk.red(`\nError: ${response.data.message || 'Unknown error'}`));
        process.exit(1);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        spinner.fail(chalk.red('Website not found'));
        console.log(chalk.red(`\nWebsite with ID "${websiteId}" does not exist.`));
        console.log(chalk.gray('Please check your website ID and try again.'));
      } else if (error.code === 'ECONNREFUSED') {
        spinner.fail(chalk.red('Connection refused'));
        console.log(chalk.red(`\nCould not connect to ${endpoint}`));
        console.log(chalk.gray('Please check if the server is running.'));
      } else {
        spinner.fail(chalk.red('Verification failed'));
        console.log(chalk.red(`\nError: ${error.message}`));
      }
      process.exit(1);
    }

  } catch (error: any) {
    spinner.fail(chalk.red('Verification failed'));
    console.error(chalk.red('\nError:'), error.message);
    process.exit(1);
  }
}

async function loadConfig() {
  const configFiles = [
    'sajko.config.ts',
    'sajko.config.js',
    '.sajkorc.json',
    'package.json'
  ];

  for (const file of configFiles) {
    try {
      const filePath = path.join(process.cwd(), file);
      if (await fs.pathExists(filePath)) {
        if (file === 'package.json') {
          const pkg = await fs.readJson(filePath);
          if (pkg.sajko) {
            console.log(chalk.gray(`  Loading config from ${file}...`));
            return pkg.sajko;
          }
        } else if (file.endsWith('.json')) {
          console.log(chalk.gray(`  Loading config from ${file}...`));
          return await fs.readJson(filePath);
        } else {
          // For JS/TS files, parse the content
          const content = await fs.readFile(filePath, 'utf-8');
          console.log(chalk.gray(`  Loading config from ${file}...`));
          
          // Try multiple patterns to find websiteId
          const patterns = [
            /websiteId:\s*['"]([^'"]+)['"]/,
            /["']websiteId["']:\s*["']([^'"]+)["']/,
            /websiteId\s*:\s*["']([^'"]+)["']/
          ];
          
          for (const pattern of patterns) {
            const match = content.match(pattern);
            if (match) {
              // Also try to extract apiEndpoint if present
              const apiMatch = content.match(/apiEndpoint:\s*['"]([^'"]+)['"]/);
              return { 
                websiteId: match[1],
                apiEndpoint: apiMatch ? apiMatch[1] : undefined
              };
            }
          }
        }
      }
    } catch (error) {
      // Continue to next file
      continue;
    }
  }

  // If no config file found, check environment variables
  if (process.env.SAJKO_WEBSITE_ID) {
    console.log(chalk.gray('  Loading config from environment variables...'));
    return {
      websiteId: process.env.SAJKO_WEBSITE_ID,
      apiEndpoint: process.env.SAJKO_API_ENDPOINT
    };
  }

  return {};
}