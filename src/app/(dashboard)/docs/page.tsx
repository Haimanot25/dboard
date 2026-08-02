"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  BookOpen, Copy, Check, ExternalLink,
  Shield, Database, Key, Webhook, Brain, Layout,
  Terminal, Zap, Settings, Code, FileText,
} from "lucide-react";

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group my-3">
      <div className="flex items-center justify-between bg-muted/50 rounded-t-lg border border-b-0 border-border px-3 py-1.5">
        <span className="text-[10px] font-mono text-muted-foreground/60 uppercase">{language}</span>
        <button
          onClick={handleCopy}
          className="text-muted-foreground/40 hover:text-foreground transition-colors"
          title="Copy"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <pre className="bg-muted/30 border border-border rounded-b-lg p-3 overflow-x-auto text-xs font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-muted/50">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground/70 border-b border-border">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 font-mono text-[11px]">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const sections: DocSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: <Zap className="h-4 w-4" />,
    content: (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-2">Prerequisites</h3>
          <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
            <li>Node.js 20+</li>
            <li>npm, yarn, or pnpm</li>
            <li>Git</li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-2">Installation</h3>
          <CodeBlock code={`# Clone and install
git clone https://github.com/Haimanot25/dboard.git
cd dboard
npm install

# Setup environment
cp .env.example .env
# Generate secrets and paste into .env
openssl rand -base64 32

# Initialize database
npx prisma generate
npx prisma db push

# Start development server
npm run dev`} language="bash" />
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-2">Docker Quick Start</h3>
          <CodeBlock code={`export NEXTAUTH_SECRET=$(openssl rand -base64 32)
export ENCRYPTION_KEY=$(openssl rand -base64 32)
docker compose up -d`} language="bash" />
        </div>
      </div>
    ),
  },
  {
    id: "env-vars",
    title: "Environment Variables",
    icon: <Settings className="h-4 w-4" />,
    content: (
      <div className="space-y-3">
        <Table
          headers={["Variable", "Description", "Required"]}
          rows={[
            ["DATABASE_URL", "SQLite URL for Prisma (app metadata)", "Yes"],
            ["NEXTAUTH_SECRET", "Session encryption secret", "Yes"],
            ["NEXTAUTH_URL", "Canonical URL (e.g. production URL)", "Yes"],
            ["ENCRYPTION_KEY", "AES-256-GCM key for passwords/API keys", "Yes"],
            ["ALLOW_PRIVATE_DB_HOSTS", "Set to 1 for localhost connections (dev only)", "No"],
          ]}
        />
      </div>
    ),
  },
  {
    id: "security",
    title: "Security",
    icon: <Shield className="h-4 w-4" />,
    content: (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-1">SSRF Protection</h3>
          <p className="text-xs text-muted-foreground">All outbound connections validated against private IPs (10.x, 172.16-31.x, 192.168.x, 127.x). DNS resolved before connecting to prevent rebinding attacks.</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-1">Encryption</h3>
          <p className="text-xs text-muted-foreground">AES-256-GCM with random IV. Key derived via scryptSync. Used for database passwords and AI API keys.</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-1">Authentication</h3>
          <p className="text-xs text-muted-foreground">PBKDF2 password hashing (600K iterations, SHA-512, timing-safe comparison). JWT sessions with 24h expiry.</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-1">Rate Limiting</h3>
          <Table
            headers={["Track", "Max Attempts", "Window", "Lockout"]}
            rows={[
              ["Per-account (email)", "5", "15 min", "15 min"],
              ["Per-IP (login)", "30", "15 min", "15 min"],
              ["General API", "100", "60 sec", "429 response"],
            ]}
          />
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-1">Permissions</h3>
          <Table
            headers={["Role", "Level", "Access"]}
            rows={[
              ["viewer", "1", "Read-only data access"],
              ["editor", "2", "Read + write (default)"],
              ["admin", "3", "Full access including sharing"],
            ]}
          />
        </div>
      </div>
    ),
  },
  {
    id: "api-keys",
    title: "API Keys",
    icon: <Key className="h-4 w-4" />,
    content: (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">Generate scoped API keys for programmatic access. Each key is scoped to a single connection.</p>
        <CodeBlock code={`# Create an API key via the UI or API:
curl -X POST http://localhost:3000/api/api-keys \\
  -H "Content-Type: application/json" \\
  -d '{"name":"CI Pipeline","connectionId":"clx123...","permissions":"read"}'

# Use the key:
curl -H "X-API-Key: dbo_your_key_here" \\
  http://localhost:3000/api/data/clx123.../users`} language="bash" />
        <Table
          headers={["Permission", "Level", "Access"]}
          rows={[
            ["read", "1", "SELECT queries only"],
            ["write", "2", "SELECT + INSERT/UPDATE/DELETE"],
            ["admin", "3", "Full access + sharing"],
          ]}
        />
      </div>
    ),
  },
  {
    id: "databases",
    title: "Database Support",
    icon: <Database className="h-4 w-4" />,
    content: (
      <div className="space-y-3">
        <Table
          headers={["Database", "Port", "Adapter", "Notes"]}
          rows={[
            ["PostgreSQL", "5432", "SQL (Knex)", "Full support with pg_stat views"],
            ["MySQL", "3306", "SQL (Knex)", "Full support"],
            ["SQLite", "—", "SQL (Knex)", "File-based, no network config"],
            ["MongoDB", "27017", "Native", "Document introspection"],
            ["Supabase", "—", "REST API", "Uses Supabase JS client"],
            ["SQL Server", "1433", "SQL (Knex)", "Via mssql driver"],
          ]}
        />
        <div>
          <h3 className="text-sm font-semibold mb-1">Connection Fields</h3>
          <Table
            headers={["Field", "Type", "Default", "Description"]}
            rows={[
              ["name", "string", "—", "Display name"],
              ["type", "string", "postgresql", "Database type"],
              ["host", "string", "localhost", "Hostname or IP"],
              ["port", "number", "5432", "Port number"],
              ["database", "string", "—", "Database name"],
              ["username", "string", "—", "Username"],
              ["password", "string", "—", "Password (encrypted at rest)"],
              ["ssl", "boolean", "false", "Use SSL"],
              ["readOnly", "boolean", "false", "Read-only mode"],
            ]}
          />
        </div>
      </div>
    ),
  },
  {
    id: "dashboards",
    title: "Dashboards",
    icon: <Layout className="h-4 w-4" />,
    content: (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">Create custom dashboards with drag-and-drop chart widgets. Each chart runs a SQL query against a connected database.</p>
        <div>
          <h3 className="text-sm font-semibold mb-1">Chart Types</h3>
          <Table
            headers={["Type", "Description"]}
            rows={[
              ["bar", "Horizontal bar chart for comparing values"],
              ["line", "Line chart with data points"],
              ["pie", "Proportional pie chart with legend"],
              ["table", "Tabular data display"],
              ["sparkline", "Compact inline trend line"],
              ["heatmap", "Color-coded grid for density"],
            ]}
          />
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-1">Features</h3>
          <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
            <li>Drag-and-drop chart reordering</li>
            <li>Auto-refresh (30s, 1m, 5m, 15m intervals)</li>
            <li>Date range filtering (Last 24h, 7d, 30d, 90d)</li>
            <li>Export to PNG or PDF</li>
            <li>Share dashboards with team members</li>
            <li>Duplicate dashboards</li>
          </ul>
        </div>
        <CodeBlock code={`# Create a dashboard with charts:
curl -X POST http://localhost:3000/api/dashboards \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Sales Overview"}'

# Add a chart:
curl -X POST http://localhost:3000/api/dashboards/CLX_ID/charts \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Revenue","type":"bar","connectionId":"CLX_CONN","query":"SELECT date, SUM(amount) FROM sales GROUP BY date"}'`} language="bash" />
      </div>
    ),
  },
  {
    id: "query-editor",
    title: "Query Editor",
    icon: <Terminal className="h-4 w-4" />,
    content: (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">Execute raw SQL queries with syntax highlighting, format SQL, save queries, and view execution history.</p>
        <CodeBlock code={`# Execute a query:
curl -X POST http://localhost:3000/api/query/CLX_CONNECTION_ID \\
  -H "Content-Type: application/json" \\
  -d '{"sql":"SELECT * FROM users WHERE active = true LIMIT 10"}'

# Response:
{
  "columns": ["id", "name", "email"],
  "data": [{"id": 1, "name": "Alice", "email": "alice@example.com"}],
  "rowCount": 1,
  "durationMs": 12,
  "truncated": false
}`} language="bash" />
        <div>
          <h3 className="text-sm font-semibold mb-1">Features</h3>
          <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
            <li>Format SQL button (keyword-aware formatting)</li>
            <li>Saved queries (save/load/delete)</li>
            <li>Query execution history (last 200)</li>
            <li>AI-powered SQL generation from natural language</li>
            <li>Date range parameter injection</li>
            <li>Read-only connection enforcement</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "ai-integration",
    title: "AI Integration",
    icon: <Brain className="h-4 w-4" />,
    content: (
      <div className="space-y-3">
        <Table
          headers={["Provider", "Free Tier", "Models"]}
          rows={[
            ["OpenAI", "No", "GPT-4o, GPT-4o Mini, GPT-4 Turbo, o3-mini"],
            ["Groq", "Yes", "Llama 3 70B, Mixtral 8x7B, Gemma 2 9B"],
            ["Google Gemini", "Yes", "Gemini 2.0 Flash, Gemini 2.5 Pro"],
            ["Ollama", "Yes (local)", "Llama 3, Mistral, CodeLlama"],
            ["OpenRouter", "Varies", "Claude 3.5 Sonnet, DeepSeek Chat"],
          ]}
        />
        <div>
          <h3 className="text-sm font-semibold mb-1">Generation Types</h3>
          <Table
            headers={["Type", "Description"]}
            rows={[
              ["query", "Generate SQL from natural language"],
              ["dashboard", "Generate multi-chart dashboard"],
              ["panel", "Generate CRUD admin panel"],
              ["form", "Generate form fields from schema"],
            ]}
          />
        </div>
        <CodeBlock code={`# Generate SQL from natural language:
curl -X POST http://localhost:3000/api/query/CLX_ID/ai \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"Show active users who signed up this week","modelId":"gpt-4o-mini"}'

# Response:
{"sql":"SELECT * FROM users WHERE active = true AND created_at >= date('now','-7 days')"}`} language="bash" />
      </div>
    ),
  },
  {
    id: "webhooks",
    title: "Webhooks",
    icon: <Webhook className="h-4 w-4" />,
    content: (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">Send real-time notifications when data changes. All deliveries go through SSRF protection.</p>
        <Table
          headers={["Action", "Description"]}
          rows={[
            ["Slack", "Send messages to Slack via webhook URL"],
            ["Discord", "Send embeds to Discord channel"],
            ["PagerDuty", "Trigger PagerDuty incidents"],
            ["Custom HTTP", "POST to any URL with custom headers"],
          ]}
        />
        <div>
          <h3 className="text-sm font-semibold mb-1">Events</h3>
          <CodeBlock code="row.created, row.updated, row.deleted" />
        </div>
        <CodeBlock code={`# Create a webhook:
curl -X POST http://localhost:3000/api/webhooks \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Slack","url":"https://hooks.slack.com/...","events":"row.created,row.updated","connectionId":"CLX_ID"}'`} language="bash" />
      </div>
    ),
  },
  {
    id: "plugins",
    title: "Plugin System",
    icon: <Code className="h-4 w-4" />,
    content: (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">Extend DBoard with custom adapters, widgets, and webhook actions.</p>
        <div>
          <h3 className="text-sm font-semibold mb-1">Adapter Plugins</h3>
          <p className="text-xs text-muted-foreground mb-2">Connect to new database types. Implement the <code>DatabaseAdapter</code> interface.</p>
          <CodeBlock code={`// npm package: @dboard/adapter-clickhouse
interface DatabaseAdapter {
  connect(config: ConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  test(config: ConnectionConfig): Promise<boolean>;
  introspect(): Promise<SchemaResult>;
  executeRaw(query: string, params?: unknown[]): Promise<QueryResult>;
  list(table: string, options: ListOptions, columns: ColumnMeta[]): Promise<PaginatedResult>;
  get(table: string, pkValue: string, pkColumn: string): Promise<Record<string, unknown> | null>;
  create(table: string, data: Record<string, unknown>, columns: ColumnMeta[]): Promise<Record<string, unknown>>;
  update(table: string, pkValue: string, pkColumn: string, data: Record<string, unknown>, columns: ColumnMeta[]): Promise<Record<string, unknown>>;
  delete(table: string, pkValue: string, pkColumn: string): Promise<void>;
  bulkDelete(table: string, pkValues: string[], pkColumn: string): Promise<void>;
}`} language="typescript" />
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-1">Widget Plugins</h3>
          <p className="text-xs text-muted-foreground mb-2">Custom chart/visualization types for dashboards.</p>
          <CodeBlock code={`// npm package: @dboard/widget-gauge
interface WidgetDefinition {
  id: string;
  name: string;
  category: "chart" | "visualization" | "table" | "custom";
  renderer: ComponentType<WidgetRendererProps>;
  configSchema?: WidgetConfigField[];
}`} language="typescript" />
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-1">Webhook Plugins</h3>
          <p className="text-xs text-muted-foreground mb-2">Custom notification targets for data change events.</p>
          <CodeBlock code={`// npm package: @dboard/webhook-email
interface WebhookAction {
  id: string;
  name: string;
  deliver(url: string, payload: WebhookPayload, config: Record<string, unknown>): Promise<WebhookDeliveryResult>;
}`} language="typescript" />
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-1">NPM Naming</h3>
          <CodeBlock code="@dboard/adapter-<name>   # or dboard-adapter-<name>
@dboard/widget-<name>   # or dboard-widget-<name>
@dboard/webhook-<name>  # or dboard-webhook-<name>" />
        </div>
      </div>
    ),
  },
  {
    id: "export-import",
    title: "Export & Import",
    icon: <FileText className="h-4 w-4" />,
    content: (
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold mb-1">Export Formats</h3>
          <Table
            headers={["Format", "Content-Type", "Max Rows"]}
            rows={[
              ["csv", "text/csv", "100,000"],
              ["json", "application/json", "100,000"],
              ["jsonl", "application/jsonl", "100,000"],
              ["xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "100,000"],
              ["pdf", "application/pdf", "100,000"],
            ]}
          />
        </div>
        <CodeBlock code={`# Export to CSV:
curl -H "X-API-Key: dbo_KEY" \\
  "http://localhost:3000/api/export/CLX_ID/users?format=csv" \\
  --output users.csv

# Import from CSV:
curl -X POST http://localhost:3000/api/import/CLX_ID/users \\
  -F "file=@users.csv" -F "format=csv"

# Response: {"imported":500,"total":500,"truncated":false}`} language="bash" />
      </div>
    ),
  },
  {
    id: "deployment",
    title: "Deployment",
    icon: <ExternalLink className="h-4 w-4" />,
    content: (
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold mb-1">Docker</h3>
          <CodeBlock code={`docker build -t dboard .
docker run -p 3000:3000 \\
  -e NEXTAUTH_SECRET=$(openssl rand -base64 32) \\
  -e ENCRYPTION_KEY=$(openssl rand -base64 32) \\
  -e DATABASE_URL=file:/data/dboard.db \\
  -v dboard-data:/data \\
  dboard`} language="bash" />
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-1">Vercel</h3>
          <CodeBlock code={`npm i -g vercel
vercel
# Set env vars in Vercel dashboard
# Use external PostgreSQL for DATABASE_URL`} language="bash" />
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-1">PM2 (Self-Hosted)</h3>
          <CodeBlock code={`npm run build
pm2 start npm --name "dboard" -- start
pm2 save && pm2 startup`} language="bash" />
        </div>
      </div>
    ),
  },
  {
    id: "commands",
    title: "CLI Commands",
    icon: <Terminal className="h-4 w-4" />,
    content: (
      <div className="space-y-3">
        <Table
          headers={["Command", "Description"]}
          rows={[
            ["npm run dev", "Start development server"],
            ["npm run build", "Production build"],
            ["npm run start", "Start production server"],
            ["npm run lint", "Run ESLint"],
            ["npm run test", "Run unit tests (Vitest)"],
            ["npm run test:coverage", "Generate coverage report"],
            ["npm run test:e2e", "Run E2E tests (Playwright)"],
            ["npm run lint:security", "Security-focused linting"],
            ["npm run lint:dead", "Dead code detection (Knip)"],
            ["npm run format", "Format code with Prettier"],
            ["npm run seed", "Seed the database"],
          ]}
        />
      </div>
    ),
  },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("getting-started");
  const contentRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(`doc-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentation"
        description="Guides, API reference, and architecture documentation"
        icon={<BookOpen className="h-5 w-5" />}
      />

      <div className="flex gap-6 min-h-0">
        {/* Sidebar TOC */}
        <nav className="w-56 shrink-0 hidden lg:block">
          <div className="sticky top-20 space-y-0.5">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors text-left",
                  activeSection === s.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {s.icon}
                <span>{s.title}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div ref={contentRef} className="flex-1 min-w-0 space-y-8">
          {sections.map((s) => (
            <section key={s.id} id={`doc-${s.id}`} className="scroll-mt-20">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  {s.icon}
                </div>
                <h2 className="text-base font-semibold">{s.title}</h2>
              </div>
              {s.content}
            </section>
          ))}

          {/* Footer links */}
          <div className="border-t border-border pt-6 space-y-2">
            <h3 className="text-sm font-semibold">More Resources</h3>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li><a href="https://github.com/Haimanot25/dboard" target="_blank" rel="noopener noreferrer" className="hover:text-foreground inline-flex items-center gap-1">GitHub Repository <ExternalLink className="h-3 w-3" /></a></li>
              <li><a href="https://github.com/Haimanot25/dboard/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" className="hover:text-foreground inline-flex items-center gap-1">Contributing Guide <ExternalLink className="h-3 w-3" /></a></li>
              <li><a href="https://github.com/Haimanot25/dboard/blob/main/SECURITY.md" target="_blank" rel="noopener noreferrer" className="hover:text-foreground inline-flex items-center gap-1">Security Policy <ExternalLink className="h-3 w-3" /></a></li>
              <li><a href="https://github.com/Haimanot25/dboard/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer" className="hover:text-foreground inline-flex items-center gap-1">Changelog <ExternalLink className="h-3 w-3" /></a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
