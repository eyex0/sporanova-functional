import { registerBuiltinTool } from "./toolRegistry";

export function registerBuiltinTools(): void {
  registerBuiltinTool("web_search", async (args) => {
    const query = String(args.query ?? "").trim();
    if (!query) return { error: "No search query provided" };

    try {
      const apiKey = process.env.SERPAPI_KEY ?? process.env.GOOGLE_SEARCH_API_KEY;
      if (!apiKey) {
        return {
          results: [
            { title: "Search unavailable", snippet: "Web search API key not configured. Configure SERPAPI_KEY or GOOGLE_SEARCH_API_KEY.", url: "" }
          ],
          note: "Web search requires an API key. Set SERPAPI_KEY or GOOGLE_SEARCH_API_KEY environment variable."
        };
      }

      const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}&num=5`;
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error(`Search API returned ${response.status}`);

      const data = await response.json();
      const results = (data.organic_results ?? []).slice(0, 5).map((r: any) => ({
        title: r.title,
        snippet: r.snippet,
        url: r.link,
      }));

      return { query, results, totalResults: results.length };
    } catch (error) {
      return {
        query,
        results: [],
        error: error instanceof Error ? error.message : "Search failed",
      };
    }
  });

  registerBuiltinTool("calculator", async (args) => {
    const expression = String(args.expression ?? "").trim();
    if (!expression) return { error: "No expression provided" };

    try {
      const sanitized = expression.replace(/[^0-9+\-*/().%^\s]/g, "");
      if (sanitized !== expression) {
        return { error: "Expression contains invalid characters" };
      }

      const result = Function(`"use strict"; return (${sanitized})`)();
      return { expression, result: Number(result) };
    } catch {
      return { expression, error: "Invalid mathematical expression" };
    }
  });

  registerBuiltinTool("get_current_date", async () => {
    const now = new Date();
    return {
      date: now.toISOString().split("T")[0],
      time: now.toTimeString().split(" ")[0],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dayOfWeek: now.toLocaleDateString("en-US", { weekday: "long" }),
    };
  });

  registerBuiltinTool("format_text", async (args) => {
    const text = String(args.text ?? "");
    const format = String(args.format ?? "plain");

    switch (format) {
      case "uppercase":
        return { result: text.toUpperCase() };
      case "lowercase":
        return { result: text.toLowerCase() };
      case "title":
        return { result: text.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) };
      case "truncate": {
        const maxLen = Number(args.maxLength ?? 200);
        return { result: text.length > maxLen ? text.slice(0, maxLen) + "..." : text };
      }
      case "word_count": {
        const words = text.trim().split(/\s+/).filter(Boolean);
        return { wordCount: words.length, charCount: text.length };
      }
      default:
        return { result: text };
    }
  });

  registerBuiltinTool("json_query", async (args) => {
    const data = args.data;
    const path = String(args.path ?? "");

    if (!path) return { error: "No JSON path provided" };

    try {
      const parts = path.split(".").filter(Boolean);
      let current: any = data;
      for (const part of parts) {
        if (current == null) return { error: `Path "${path}" not found` };
        current = current[part];
      }
      return { path, result: current };
    } catch {
      return { path, error: "Failed to traverse JSON path" };
    }
  });
}
