const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 8080;

// Endpoint MCP principal
app.all('/mcp/*', async (req, res) => {
  const mcpProcess = spawn('npx', ['@bilims/mcp-sqlserver'], {
    env: {
      ...process.env,
      SQLSERVER_HOST: process.env.SQLSERVER_HOST || 'Srvgva1-NOVARPT\\NOVAPNL',
      SQLSERVER_USER: process.env.SQLSERVER_USER || 'NovaClaude',
      SQLSERVER_PASSWORD: process.env.SQLSERVER_PASSWORD || 'pNc3%SAH45',
      SQLSERVER_DATABASE: process.env.SQLSERVER_DATABASE || 'Nova_Warehouse',
      SQLSERVER_ENCRYPT: 'true',
      SQLSERVER_TRUST_SERVER_CERTIFICATE: 'true'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let requestBody = '';
  req.on('data', chunk => requestBody += chunk);
  
  mcpProcess.stdin.write(requestBody + '\n');
  mcpProcess.stdout.pipe(res);
  
  mcpProcess.stderr.on('data', data => {
    console.error('MCP Error:', data.toString());
    res.status(500).send('MCP Error');
  });
});

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'Novarpt SQL MCP Ready ✅',
    database: process.env.SQLSERVER_DATABASE,
    tools: ['sql_query', 'sql_get_tables', 'sql_get_schema']
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Novarpt MCP SQL sur http://localhost:${PORT}`);
  console.log('Test: http://localhost:' + PORT);
});