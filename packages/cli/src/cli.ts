#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { init } from './commands/init';
import { test } from './commands/test';
import { debug } from './commands/debug';
import { doctor } from './commands/doctor';
import { verify } from './commands/verify';

const program = new Command();

program
  .name('sajko')
  .description('CLI tool for SAJKO Analytics')
  .version('1.0.5');

program
  .command('init')
  .description('Initialize SAJKO in your project')
  .option('-f, --framework <framework>', 'Framework to use (react, nextjs, vue, vanilla)')
  .option('-p, --package-manager <pm>', 'Package manager (npm, yarn, pnpm, bun)')
  .option('--no-install', 'Skip dependency installation')
  .option('--local', 'Use local packages (for development)')
  .action(init);

program
  .command('test')
  .description('Test your SAJKO integration')
  .option('-w, --website-id <id>', 'Website ID to test')
  .option('-e, --endpoint <url>', 'API endpoint to test')
  .option('--send-event', 'Send a test event')
  .action(test);

program
  .command('verify')
  .description('Verify your SAJKO installation and configuration')
  .option('-w, --website-id <id>', 'Website ID to verify')
  .option('-e, --endpoint <url>', 'API endpoint')
  .action(verify);

program
  .command('debug')
  .description('Start debug mode to monitor events in real-time')
  .option('-w, --website-id <id>', 'Website ID to monitor')
  .option('-p, --port <port>', 'Local server port', '9090')
  .option('--verbose', 'Show detailed event data')
  .action(debug);

program
  .command('doctor')
  .description('Check your SAJKO setup for issues')
  .option('--fix', 'Attempt to fix issues automatically')
  .action(doctor);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  console.log(chalk.cyan('\n🎯 SAJKO Analytics CLI\n'));
  program.outputHelp();
}

program.parse(process.argv);