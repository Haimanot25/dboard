import { type ApiFormat, type ProviderDefinition } from "./providers";
import { callOpenAIChat } from "./formatters/openai";
import { callGeminiContent } from "./formatters/gemini";
import { callAnthropicMessages } from "./formatters/anthropic";
import type { IntrospectedSchema } from "@/types/schema";

export type GenerationType = "panel" | "dashboard" | "form" | "query";

export interface PanelConfig {
  title: string;
  table: string;
  description?: string;
  columns: string[];
  filters: string[];
  searchColumns: string[];
  actions: ("create" | "edit" | "delete")[];
  defaultSort: { column: string; direction: "asc" | "desc" };
  pageSize: number;
}

export interface ChartConfig {
  title: string;
  type: "bar" | "pie" | "line" | "table";
  query: string;
  width: number;
  height: number;
}

export interface DashboardConfig {
  title: string;
  description: string;
  charts: ChartConfig[];
}

export interface FormFieldConfig {
  name: string;
  label: string;
  type: "text" | "email" | "number" | "select" | "boolean" | "date" | "textarea";
  required: boolean;
  options?: string[];
  placeholder?: string;
  defaultValue?: unknown;
}

export interface FormConfig {
  title: string;
  table: string;
  fields: FormFieldConfig[];
}

export type GenerationResult =
  | { type: "panel"; config: PanelConfig }
  | { type: "dashboard"; config: DashboardConfig }
  | { type: "form"; config: FormConfig }
  | { type: "query"; sql: string };

export function getSystemPrompt(type: GenerationType, schema: string): string {
  const base = `You are a database admin panel generator. Given a database schema and a natural language request, generate a structured configuration.

Schema:
${schema}

IMPORTANT: Return ONLY valid JSON. No markdown, no code fences, no explanations.`;

  switch (type) {
    case "panel":
      return `${base}

Generate a panel configuration with this exact JSON structure:
{
  "type": "panel",
  "config": {
    "title": "Human-readable panel title",
    "table": "the most relevant table name",
    "description": "Brief description of what this panel does",
    "columns": ["relevant column names to display"],
    "filters": ["column names suitable for filtering"],
    "searchColumns": ["column names to enable full-text search on"],
    "actions": ["create", "edit", "delete"],
    "defaultSort": { "column": "column_name", "direction": "desc" },
    "pageSize": 25
  }
}

Rules:
- Pick the SINGLE most relevant table from the schema based on the user's prompt
- Only include columns that exist in the chosen table — use EXACT column names from the schema
- Include all primary/foreign key columns needed for context
- For filters, choose columns with low cardinality (enums, status, type fields)
- For searchColumns, choose text/varchar columns suitable for search`;

    case "dashboard":
      return `${base}

Generate a dashboard configuration with this exact JSON structure:
{
  "type": "dashboard",
  "config": {
    "title": "Dashboard title",
    "description": "Dashboard description",
    "charts": [
      {
        "title": "Chart title",
        "type": "bar|pie|line|table",
        "query": "SQL query that returns label and value columns",
        "width": 1,
        "height": 1
      }
    ]
  }
}

Rules:
- Generate 2-4 charts that provide meaningful insights from the schema
- Use proper PostgreSQL syntax in queries
- Each query must return columns that map to chart data (first col = label, second col = value)
- Add LIMIT clauses to queries
- width can be 1 or 2 (2 for wide charts), height is always 1
- Choose chart types that match the data (bar for comparisons, pie for proportions, line for trends, table for details)
- PostgreSQL folds unquoted identifiers to lowercase. To preserve case, double-quote them: "companyName"
- Use the EXACT column names shown in the schema — do not invent column names`;

    case "form":
      return `${base}

Generate a form configuration with this exact JSON structure:
{
  "type": "form",
  "config": {
    "title": "Form title",
    "table": "the most relevant table name",
    "fields": [
      {
        "name": "column_name",
        "label": "Human-readable label",
        "type": "text|email|number|select|boolean|date|textarea",
        "required": true,
        "options": ["option1", "option2"],
        "placeholder": "Placeholder text",
        "defaultValue": null
      }
    ]
  }
}

Rules:
- Pick the SINGLE most relevant table
- Generate form fields for all editable columns (skip PKs and auto-generated timestamps)
- Set required=true for NOT NULL columns without defaults
- Use 'select' type for columns that likely have enum values
- Use 'boolean' for boolean/bit columns
- Use 'textarea' for text/blob columns
- Include appropriate placeholders
- Use EXACT column names from the schema — do not invent column names`;

    default:
      return base;
  }
}

export function getSqlSystemPrompt(schema: string): string {
  return `You are a SQL expert. Given a database schema and a natural language request, generate a syntactically correct SQL query.

Rules:
- Return ONLY the SQL query, no explanations or markdown formatting
- Use PostgreSQL syntax
- Never use SELECT * unless explicitly asked
- Use proper table/column aliases where helpful
- Add LIMIT 100 by default unless specified otherwise
- PostgreSQL folds unquoted identifiers to lowercase — double-quote CamelCase names: "companyName"
- Use the EXACT column names shown in the schema below — do not invent column names
- If the request cannot be fulfilled, return -- Unable to generate query: [reason]

Schema:
${schema}`;
}

export function parseGenerationResponse(
  text: string,
  type: GenerationType,
): GenerationResult {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    // eslint-disable-next-line security/detect-unsafe-regex
    cleaned = cleaned.replace(/```(\w+)?/g, "").trim();
  }

  const parsed = JSON.parse(cleaned);

  if (type === "query") {
    return { type: "query", sql: parsed.sql || parsed.query || parsed.config?.sql || cleaned };
  }

  const config = parsed.config || parsed;
  if (type === "panel") {
    return { type: "panel", config: config as PanelConfig };
  }
  if (type === "dashboard") {
    return { type: "dashboard", config: config as DashboardConfig };
  }
  if (type === "form") {
    return { type: "form", config: config as FormConfig };
  }

  throw new Error(`Unknown generation type: ${type}`);
}

const MAX_SCHEMA_CHARS = 8000;
const MAX_SCHEMA_TABLES = 50;

export function formatSchemaForPrompt(schema: IntrospectedSchema): string {
  const tables = schema.tables || [];

  const result = tables
    .filter((t) => !t.schema)
    .slice(0, MAX_SCHEMA_TABLES)
    .map((t) => {
      const cols = (t.columns || [])
        .map((c) => {
          const parts = [`  ${c.name} ${c.dataType}`];
          if (c.isPrimaryKey) parts.push("PK");
          if (c.isForeignKey) parts.push(`FK -> ${c.referencedTable}.${c.referencedColumn}`);
          if (!c.nullable) parts.push("NOT NULL");
          return parts.join(" ");
        })
        .join("\n");
      return `TABLE ${t.name} (\n${cols}\n)`;
    })
    .join("\n\n");

  if (result.length > MAX_SCHEMA_CHARS) {
    return result.slice(0, MAX_SCHEMA_CHARS) + "\n... (truncated)";
  }
  return result;
}

export function filterRelevantSchema(
  schema: IntrospectedSchema,
  prompt: string,
): IntrospectedSchema {
  const tables = schema.tables || [];
  const promptLower = prompt.toLowerCase();

  const relevant = tables.filter((t) => {
    const nameLower = t.name.toLowerCase();
    if (promptLower.includes(nameLower)) return true;
    const colNames = (t.columns || []).map((c) => c.name.toLowerCase());
    const hasMatch = colNames.some((cn) => promptLower.includes(cn));
    return hasMatch || tables.length <= 5;
  });

  const result = relevant.length > 0 ? relevant : tables;
  return { ...schema, tables: result.slice(0, MAX_SCHEMA_TABLES) };
}

async function callProviderApi(
  apiFormat: ApiFormat,
  baseUrl: string,
  model: string,
  apiKey: string | null,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  switch (apiFormat) {
    case "openai-chat":
      return callOpenAIChat(baseUrl, model, apiKey, systemPrompt, userPrompt);
    case "gemini-content":
      return callGeminiContent(baseUrl, model, apiKey, systemPrompt, userPrompt);
    case "anthropic-messages":
      return callAnthropicMessages(baseUrl, model, apiKey, systemPrompt, userPrompt);
    default:
      throw new Error(`Unsupported API format: ${apiFormat}`);
  }
}

export interface GenerateParams {
  prompt: string;
  schemaText: string;
  apiFormat: ApiFormat;
  baseUrl: string;
  model: string;
  apiKey: string | null;
  type: GenerationType;
}

export async function generateStructuredJson(params: GenerateParams): Promise<string> {
  const systemPrompt = getSystemPrompt(params.type, params.schemaText);
  const userPrompt = `Schema context is provided above. Based on this schema, fulfill this request: ${params.prompt}

Return ONLY valid JSON matching the structure specified in the system prompt.`;

  return callProviderApi(
    params.apiFormat,
    params.baseUrl,
    params.model,
    params.apiKey,
    systemPrompt,
    userPrompt,
  );
}

export async function generateSql(params: GenerateParams): Promise<string> {
  const systemPrompt = getSqlSystemPrompt(params.schemaText);

  return callProviderApi(
    params.apiFormat,
    params.baseUrl,
    params.model,
    params.apiKey,
    systemPrompt,
    params.prompt,
  );
}

export function getDefaultModelId(providerDef: ProviderDefinition): string {
  return providerDef.defaultModels[0]?.modelId ?? "";
}
