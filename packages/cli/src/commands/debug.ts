import chalk from 'chalk';
import ora from 'ora';
import http from 'http';
import WebSocket from 'ws';
import fs from 'fs-extra';

interface DebugOptions {
  websiteId?: string;
  port?: string;
  verbose?: boolean;
}

interface Event {
  type: string;
  name?: string;
  timestamp: number;
  properties?: any;
  sessionId?: string;
  userId?: string;
}

export async function debug(options: DebugOptions) {
  console.log(chalk.cyan('\n🔍 SAJKO Debug Mode\n'));

  const port = parseInt(options.port || '9090');
  const verbose = options.verbose || false;

  // Load config
  const config = await loadConfig();
  const websiteId = options.websiteId || config.websiteId;

  if (!websiteId) {
    console.error(chalk.red('No website ID found'));
    console.log(chalk.gray('Run "sajko init" first or provide --website-id'));
    process.exit(1);
  }

  console.log(chalk.gray(`Website ID: ${websiteId}`));
  console.log(chalk.gray(`Debug server: http://localhost:${port}`));
  console.log(chalk.gray(`Verbose mode: ${verbose ? 'ON' : 'OFF'}`));
  console.log();

  // Create HTTP server
  const server = http.createServer((req, res) => {
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(getDebugHTML(websiteId, port));
    } else if (req.url === '/health') {
      res.writeHead(200);
      res.end('OK');
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  // Create WebSocket server
  const wss = new WebSocket.Server({ server });
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(chalk.green('✓ Client connected'));

    ws.on('message', (message) => {
      try {
        const event = JSON.parse(message.toString());
        handleEvent(event, verbose);
        
        // Broadcast to all clients
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(event));
          }
        });
      } catch (error) {
        console.error(chalk.red('Invalid event:'), error);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log(chalk.yellow('✗ Client disconnected'));
    });
  });

  // Start server
  server.listen(port, () => {
    console.log(chalk.green(`\n✅ Debug server running at http://localhost:${port}\n`));
    console.log(chalk.cyan('Monitoring events... (Press Ctrl+C to stop)\n'));
    
    // Show instructions
    console.log(chalk.gray('Add this to your application to send events here:'));
    console.log(chalk.white(`
  window.sajkoConfig = {
    websiteId: '${websiteId}',
    apiEndpoint: 'http://localhost:${port}',
    debug: true
  };
    `));
    console.log(chalk.gray('\nOr open http://localhost:' + port + ' in your browser\n'));
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\nShutting down debug server...'));
    server.close();
    process.exit(0);
  });
}

function handleEvent(event: Event, verbose: boolean) {
  const time = new Date().toLocaleTimeString();
  const type = event.type || 'unknown';
  const name = event.name || '-';
  
  // Format event for display
  let output = `[${chalk.gray(time)}] `;
  
  // Color-code by type
  switch (type) {
    case 'page_view':
      output += chalk.blue('📄 PAGE');
      break;
    case 'click':
      output += chalk.green('🖱️  CLICK');
      break;
    case 'custom':
      output += chalk.magenta('⚡ CUSTOM');
      break;
    case 'identify':
      output += chalk.cyan('👤 IDENTIFY');
      break;
    case 'error':
      output += chalk.red('❌ ERROR');
      break;
    default:
      output += chalk.gray('📊 ' + type.toUpperCase());
  }
  
  output += ` ${chalk.white(name)}`;
  
  if (event.sessionId) {
    output += chalk.gray(` [${event.sessionId.slice(0, 8)}...]`);
  }
  
  console.log(output);
  
  if (verbose && event.properties) {
    console.log(chalk.gray('  Properties:'), event.properties);
  }
}

async function loadConfig() {
  try {
    // Try to load from various config files
    const configFiles = ['sajko.config.js', 'sajko.config.ts', '.sajkorc.json'];
    
    for (const file of configFiles) {
      if (await fs.pathExists(file)) {
        if (file.endsWith('.json')) {
          return await fs.readJson(file);
        } else {
          // Simplified - in real implementation would need to handle TS/JS properly
          const content = await fs.readFile(file, 'utf-8');
          const match = content.match(/websiteId:\s*['"]([^'"]+)['"]/);
          if (match) {
            return { websiteId: match[1] };
          }
        }
      }
    }
  } catch {
    // Ignore errors
  }
  
  return {};
}

function getDebugHTML(websiteId: string, port: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>SAJKO Debug Console</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Monaco', 'Menlo', monospace;
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 20px;
    }
    h1 { color: #4ec9b0; margin-bottom: 20px; }
    .info {
      background: #2d2d30;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .controls {
      margin-bottom: 20px;
    }
    button {
      background: #007acc;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 3px;
      cursor: pointer;
      margin-right: 10px;
    }
    button:hover { background: #005a9e; }
    #events {
      background: #1e1e1e;
      border: 1px solid #3c3c3c;
      border-radius: 5px;
      padding: 15px;
      height: 400px;
      overflow-y: auto;
    }
    .event {
      padding: 8px;
      margin-bottom: 5px;
      background: #2d2d30;
      border-radius: 3px;
      font-size: 12px;
    }
    .event-time { color: #858585; }
    .event-type { font-weight: bold; }
    .event-page { color: #569cd6; }
    .event-click { color: #4ec9b0; }
    .event-custom { color: #c586c0; }
    .event-error { color: #f48771; }
    .status { margin-top: 20px; }
    .connected { color: #4ec9b0; }
    .disconnected { color: #f48771; }
  </style>
</head>
<body>
  <h1>🔍 SAJKO Debug Console</h1>
  
  <div class="info">
    <div>Website ID: <strong>${websiteId}</strong></div>
    <div>Debug Port: <strong>${port}</strong></div>
  </div>
  
  <div class="controls">
    <button onclick="sendTestEvent('page_view')">Send Page View</button>
    <button onclick="sendTestEvent('click')">Send Click</button>
    <button onclick="sendTestEvent('custom')">Send Custom</button>
    <button onclick="clearEvents()">Clear</button>
  </div>
  
  <div id="events"></div>
  
  <div class="status">
    Status: <span id="status" class="disconnected">Connecting...</span>
  </div>
  
  <script>
    // SAJKO config
    window.sajkoConfig = {
      websiteId: '${websiteId}',
      debug: true
    };
    
    // WebSocket connection
    const ws = new WebSocket('ws://localhost:${port}');
    const eventsDiv = document.getElementById('events');
    const statusSpan = document.getElementById('status');
    
    ws.onopen = () => {
      statusSpan.textContent = 'Connected';
      statusSpan.className = 'connected';
    };
    
    ws.onclose = () => {
      statusSpan.textContent = 'Disconnected';
      statusSpan.className = 'disconnected';
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      addEvent(data);
    };
    
    function addEvent(event) {
      const time = new Date().toLocaleTimeString();
      const div = document.createElement('div');
      div.className = 'event';
      
      const typeClass = 'event-' + (event.type || 'custom');
      div.innerHTML = 
        '<span class="event-time">' + time + '</span> ' +
        '<span class="event-type ' + typeClass + '">' + 
        (event.type || 'unknown').toUpperCase() + '</span> ' +
        (event.name || '') + ' ' +
        (event.properties ? JSON.stringify(event.properties) : '');
      
      eventsDiv.insertBefore(div, eventsDiv.firstChild);
      
      // Keep only last 100 events
      while (eventsDiv.children.length > 100) {
        eventsDiv.removeChild(eventsDiv.lastChild);
      }
    }
    
    function sendTestEvent(type) {
      const event = {
        type: type,
        name: type === 'page_view' ? '/debug' : type + '_test',
        timestamp: Date.now(),
        sessionId: 'debug-' + Date.now(),
        properties: {
          test: true,
          source: 'debug-console'
        }
      };
      
      ws.send(JSON.stringify(event));
      
      // Also track with SAJKO if loaded
      if (window.SajkoReplay?.trackEvent) {
        window.SajkoReplay.trackEvent(event.name, event.properties);
      }
    }
    
    function clearEvents() {
      eventsDiv.innerHTML = '';
    }
    
    // Load SAJKO script
    const script = document.createElement('script');
    script.src = 'https://cdn.sajko.app/v4/sajko-replay.js';
    script.async = true;
    document.head.appendChild(script);
  </script>
</body>
</html>`;
}