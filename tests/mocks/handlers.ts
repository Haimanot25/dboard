import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/auth/session", () => {
    return HttpResponse.json({
      user: { id: "test-user-1", name: "Test User", email: "test@test.com", role: "admin" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
  }),

  http.get("/api/connections", () => {
    return HttpResponse.json([
      {
        id: "conn-1",
        name: "Test PostgreSQL",
        type: "postgresql",
        host: "localhost",
        port: 5432,
        database: "testdb",
        username: "testuser",
        userId: "test-user-1",
        readOnly: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
  }),

  http.post("/api/connections", () => {
    return HttpResponse.json(
      { id: "conn-new", name: "New Connection", type: "postgresql" },
      { status: 201 },
    );
  }),

  http.get("/api/connections/:id", ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: "Test Connection",
      type: "postgresql",
      host: "localhost",
      port: 5432,
      database: "testdb",
      userId: "test-user-1",
      readOnly: false,
    });
  }),

  http.delete("/api/connections/:id", () => {
    return HttpResponse.json({ success: true });
  }),

  http.post("/api/connections/test", () => {
    return HttpResponse.json({ success: true, message: "Connection successful" });
  }),

  http.get("/api/dashboards", () => {
    return HttpResponse.json([]);
  }),

  http.post("/api/dashboards", () => {
    return HttpResponse.json({ id: "dash-new", title: "New Dashboard" }, { status: 201 });
  }),

  http.get("/api/dashboards/:id", ({ params }) => {
    return HttpResponse.json({ id: params.id, title: "Test Dashboard", charts: [] });
  }),

  http.delete("/api/dashboards/:id", () => {
    return HttpResponse.json({ success: true });
  }),

  http.get("/api/webhooks", () => {
    return HttpResponse.json([]);
  }),

  http.post("/api/webhooks", () => {
    return HttpResponse.json({ id: "wh-new" }, { status: 201 });
  }),

  http.get("/api/shares", () => {
    return HttpResponse.json([]);
  }),

  http.get("/api/api-keys", () => {
    return HttpResponse.json([]);
  }),

  http.get("/api/ai/providers", () => {
    return HttpResponse.json([]);
  }),

  http.get("/api/alerts", () => {
    return HttpResponse.json([]);
  }),

  http.get("/api/admin-pages", () => {
    return HttpResponse.json([]);
  }),
];
