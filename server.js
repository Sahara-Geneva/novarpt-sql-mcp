const express = require('express');
const sql = require('tedious');
const {
  McpServer
} = require('@modelcontextprotocol/sdk/server/mcp.js');
const {
  StreamableHTTPServerTransport
} = require('@modelcontextprotocol/sdk/server/streamableHttp.js');

const app = express();
app.use(express.json());

const server = new McpServer({
  name: 'novarpt-sql-mcp',
  version: '1.0.0'
});

function runQuery(query) {
  return new Promise((resolve, reject) => {
    const config = {
      server: process.env.SQLSERVER_HOST,
      authentication: {
        type: 'default',
        options: {
          userName: process.env.SQLSERVER_USER,
          password: process.env.SQLSERVER_PASSWORD
        }
      },
      options: {
        database: process.env.SQLSERVER_DATABASE,
        encrypt: true,
        trustServerCertificate: true
      }
    };

    const connection = new sql.Connection(config);
    const rows = [];

    connection.on('connect', err => {
      if (err) return reject(err);

      const request = new sql.Request(query, (err) => {
        if (err) reject(err);
        else resolve(rows);
        connection.close();
      });

      request.on('row', columns => {
        const row = {};
        columns.forEach(col => row[col.metadata.colName] = col.value);
        rows.push(row);
      });

      connection.execSql(request);
    });

    connection.connect();
  });
}

server.tool(
  'sql_query',
  { query: 'string' },
  async ({ query }) => {
    if (!/^select/i.test(query.trim())) {
      return { content: [{ type: 'text', text: 'Only SELECT queries are allowed.' }] };
    }
    const rows = await runQuery(query);
    return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
  }
);

server.tool(
  'sql_get_tables',
  {},
  async () => {
    const query = `
      SELECT TABLE_SCHEMA, TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `;
    const rows = await runQuery(query);
    return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
  }
);

server.tool(
  'sql_get_schema',
  { table: 'string' },
  async ({ table }) => {
    const query = `
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = '${table.replace(/'/g, "''")}'
      ORDER BY ORDINAL_POSITION
    `;
    const rows = await runQuery(query);
    return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
  }
);

app.get('/', (req, res) => {
  res.json({
    status: 'Novarpt SQL MCP Ready ✅',
    tools: ['sql_query', 'sql_get_tables', 'sql_get_schema']
  });
});

app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionId: undefined
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Running on ${PORT}`));