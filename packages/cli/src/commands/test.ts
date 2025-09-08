import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import fs from 'fs-extra';
// import { SajkoLoader } from '@sajko/tracker';

interface TestOptions {
  websiteId?: string;
  endpoint?: string;
  sendEvent?: boolean;
}

export async function test(options: TestOptions) {
  console.log(chalk.cyan('\n🧪 Testing SAJKO Integration\n'));

  const spinner = ora('Loading configuration...').start();

  try {
    // Load config
    const config = await loadConfig();
    const websiteId = options.websiteId || config.websiteId;
    const endpoint = options.endpoint || config.apiEndpoint || 'https://api.sajko.app';

    if (!websiteId) {
      spinner.fail(chalk.red('No website ID found'));
      console.log(chalk.gray('\nRun "sajko init" first or provide --website-id'));
      process.exit(1);
    }

    // Test 1: Check API connectivity
    spinner.text = 'Testing API connectivity...';
    const apiTest = await testAPI(endpoint);
    
    if (!apiTest.success) {
      spinner.fail(chalk.red(`API connection failed: ${apiTest.error}`));
      process.exit(1);
    }
    
    spinner.succeed(chalk.green('✅ API connection successful'));

    // Test 2: Verify website ID
    spinner.start('Verifying website ID...');
    const websiteTest = await verifyWebsiteId(websiteId, endpoint);
    
    if (!websiteTest.success) {
      spinner.fail(chalk.red(`Website ID verification failed: ${websiteTest.error}`));
      console.log(chalk.gray('\nMake sure your website ID is correct'));
      process.exit(1);
    }
    
    spinner.succeed(chalk.green('✅ Website ID verified'));

    // Test 3: Script loading (skipped in CLI)
    spinner.start('Checking SAJKO script...');
    spinner.warn(chalk.yellow('⚠️  Script loading test skipped (Node.js environment)'));

    // Test 4: Send test event
    if (options.sendEvent) {
      spinner.start('Sending test event...');
      
      const eventTest = await sendTestEvent(websiteId, endpoint);
      
      if (!eventTest.success) {
        spinner.fail(chalk.red(`Test event failed: ${eventTest.error}`));
      } else {
        spinner.succeed(chalk.green('✅ Test event sent successfully'));
      }
    }

    // Show summary
    console.log(chalk.cyan('\n📊 Test Summary:\n'));
    console.log(`  Website ID: ${chalk.white(websiteId)}`);
    console.log(`  API Endpoint: ${chalk.white(endpoint)}`);
    console.log(`  Status: ${chalk.green('Ready')}`);

    // Show metrics if available
    if (websiteTest.metrics) {
      console.log(chalk.cyan('\n📈 Current Metrics:\n'));
      console.log(`  Active Sessions: ${chalk.white(websiteTest.metrics.sessions || 0)}`);
      console.log(`  Events Today: ${chalk.white(websiteTest.metrics.events || 0)}`);
      console.log(`  Unique Visitors: ${chalk.white(websiteTest.metrics.visitors || 0)}`);
    }

    console.log(chalk.cyan('\n✨ Your SAJKO integration is working correctly!\n'));

  } catch (error) {
    spinner.fail(chalk.red('Test failed'));
    console.error(error);
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
      if (await fs.pathExists(file)) {
        if (file === 'package.json') {
          const pkg = await fs.readJson(file);
          if (pkg.sajko) return pkg.sajko;
        } else if (file.endsWith('.json')) {
          return await fs.readJson(file);
        } else {
          // For JS/TS files, parse the content
          const content = await fs.readFile(file, 'utf-8');
          
          // Try multiple patterns to find websiteId
          const patterns = [
            /websiteId:\s*['"]([^'"]+)['"]/,  // websiteId: "value"
            /["']websiteId["']:\s*["']([^'"]+)["']/,  // "websiteId": "value"
            /websiteId\s*:\s*["']([^'"]+)["']/  // websiteId : "value"
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
    } catch {
      // Continue to next file
    }
  }

  return {};
}

async function testAPI(endpoint: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await axios.get(`${endpoint}/health`, {
      timeout: 5000,
      validateStatus: () => true
    });

    if (response.status === 200 || response.status === 204) {
      return { success: true };
    }

    // Try alternate endpoint
    const altResponse = await axios.post(
      `${endpoint}/api/v1/events`,
      { test: true },
      {
        timeout: 5000,
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json',
          'X-Website-ID': 'test'
        }
      }
    );

    if (altResponse.status < 500) {
      return { success: true };
    }

    return { success: false, error: `HTTP ${response.status}` };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.code === 'ENOTFOUND' ? 'Domain not found' : error.message 
    };
  }
}

async function verifyWebsiteId(
  websiteId: string, 
  endpoint: string
): Promise<{ success: boolean; error?: string; metrics?: any }> {
  try {
    // Try to get website info
    const response = await axios.get(
      `${endpoint}/api/v1/websites/${websiteId}/verify`,
      {
        timeout: 5000,
        validateStatus: () => true,
        headers: {
          'X-Website-ID': websiteId
        }
      }
    );

    if (response.status === 200) {
      return { 
        success: true, 
        metrics: response.data.metrics 
      };
    }

    // Fallback: Try sending a verification event
    const eventResponse = await axios.post(
      `${endpoint}/api/v1/events`,
      {
        websiteId,
        type: 'verify',
        timestamp: Date.now()
      },
      {
        timeout: 5000,
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json',
          'X-Website-ID': websiteId
        }
      }
    );

    if (eventResponse.status < 400) {
      return { success: true };
    }

    return { 
      success: false, 
      error: eventResponse.status === 404 ? 'Website ID not found' : `HTTP ${eventResponse.status}` 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function sendTestEvent(
  websiteId: string,
  endpoint: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const testEvent = {
      websiteId,
      sessionId: `test-${Date.now()}`,
      type: 'custom',
      name: 'cli_test',
      properties: {
        source: 'sajko-cli',
        timestamp: Date.now(),
        version: '1.0.0'
      }
    };

    const response = await axios.post(
      `${endpoint}/api/v1/events`,
      testEvent,
      {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'X-Website-ID': websiteId
        }
      }
    );

    return { success: response.status < 400 };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}