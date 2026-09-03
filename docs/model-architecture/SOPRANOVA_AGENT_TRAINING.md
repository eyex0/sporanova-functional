# SOPRANOVA Agent Training Curriculum

**Date:** 2026-09-03
**Status:** PROPOSAL

---

## Training Pipeline Overview

```
Base Model (Qwen 2.5 72B)
    ↓
Stage 1: Continued Pretraining (Enterprise Corpus)
    ↓
Stage 2: Domain Adaptation (MENA Business)
    ↓
Stage 3: SFT (Enterprise Agent Tasks)
    ↓
Stage 4: Tool Calling SFT
    ↓
Stage 5: Agent Trajectory Training
    ↓
Stage 6: Preference Optimization (DPO/KTO)
    ↓
Stage 7: Safety Alignment
    ↓
Stage 8: Evaluation & Deployment
```

---

## Stage 1: Continued Pretraining

### Objective
Inject enterprise knowledge and MENA business terminology into the base model.

### Dataset Sources
1. **Enterprise Documents** — Business reports, financial statements, legal documents
2. **MENA Business News** — Arabic business publications, market reports
3. **Technical Documentation** — API docs, software manuals, engineering specs
4. **Compliance Materials** — Regulatory frameworks, audit procedures
5. **Industry Reports** — Sector-specific analysis and trends

### Dataset Format
```json
{
  "text": "Quarterly revenue report for Q3 2025 shows...",
  "source": "enterprise_financial",
  "language": "en",
  "domain": "finance"
}
```

### Training Configuration
- **Learning Rate:** 1e-5 (conservative)
- **Batch Size:** 128 sequences
- **Sequence Length:** 8192 tokens
- **Duration:** 10,000 steps
- **Hardware:** 8x A100 80GB

---

## Stage 2: Domain Adaptation

### Objective
Specialize in MENA business terminology and Arabic-English code switching.

### Dataset Categories
1. **Arabic Business Terminology** — Financial, legal, technical terms
2. **Code-Switching Examples** — Arabic-English mixed communication
3. **MENA Business Workflows** — Regional business processes
4. **Cultural Context** — MENA-specific business etiquette

### Dataset Format
```json
{
  "instruction": "Analyze this quarterly report in Arabic",
  "input": "تقرير الأرباح الربعية...",
  "output": "يُظهر التقرير زيادة في الإيرادات...",
  "language": "ar",
  "domain": "finance"
}
```

### Training Configuration
- **Learning Rate:** 5e-6
- **Batch Size:** 64 sequences
- **Sequence Length:** 4096 tokens
- **Duration:** 5,000 steps
- **Hardware:** 4x A100 80GB

---

## Stage 3: SFT (Enterprise Agent Tasks)

### Objective
Teach the model to perform enterprise agent tasks reliably.

### Dataset Categories

#### 3.1 Instruction Following
```json
{
  "instruction": "Generate a SQL query to find top 10 customers by revenue",
  "input": "Table: customers (id, name, email)\nTable: orders (id, customer_id, amount, date)",
  "output": "SELECT c.name, SUM(o.amount) as total_revenue FROM customers c JOIN orders o ON c.id = o.customer_id GROUP BY c.id, c.name ORDER BY total_revenue DESC LIMIT 10;"
}
```

#### 3.2 Reasoning
```json
{
  "instruction": "Why did revenue decline in Q3?",
  "context": "Q1: $1.2M, Q2: $1.5M, Q3: $1.1M, Q4: $1.4M\nMarket conditions: New competitor entered in August\nMarketing spend: Reduced by 30% in July",
  "output": "Revenue declined in Q3 due to two primary factors: 1) A new competitor entered the market in August, capturing market share. 2) Marketing spend was reduced by 30% in July, leading to lower customer acquisition. The combination of increased competition and reduced visibility resulted in the Q3 decline."
}
```

#### 3.3 Planning
```json
{
  "instruction": "Create a plan to migrate 500 users to the new system",
  "constraints": "Must complete within 2 weeks\nZero downtime required\nUsers span 3 time zones",
  "output": "Plan:\n1. Week 1, Days 1-2: Set up parallel environments and data sync\n2. Week 1, Days 3-5: Migrate 10% pilot group (50 users)\n3. Week 2, Days 1-3: Migrate remaining 450 users in batches\n4. Week 2, Days 4-5: Validate, monitor, and decommission old system\n\nEach batch: Notify users 24h before, migrate during off-peak hours, verify post-migration, rollback if errors detected."
}
```

#### 3.4 Tool Selection
```json
{
  "instruction": "Get the latest sales data and create a chart",
  "tools_available": ["query_database", "create_chart", "send_email", "search_files"],
  "output": "I'll use query_database to fetch the latest sales data, then create_chart to visualize it.",
  "tool_calls": [
    {"name": "query_database", "arguments": {"query": "SELECT date, amount FROM sales WHERE date >= DATE('now', '-30 days')"}},
    {"name": "create_chart", "arguments": {"type": "line", "title": "Last 30 Days Sales", "x": "date", "y": "amount"}}
  ]
}
```

#### 3.5 Tool Error Recovery
```json
{
  "instruction": "Query the customer database",
  "context": "Tool 'query_database' returned error: 'Table customers not found'",
  "output": "The query failed because the table name might be different. Let me check the available tables first.",
  "tool_calls": [
    {"name": "query_database", "arguments": {"query": "SHOW TABLES"}}
  ]
}
```

#### 3.6 SQL Generation
```json
{
  "instruction": "Find customers who haven't ordered in 90 days",
  "schema": "customers(id, name, email, created_at)\norders(id, customer_id, amount, order_date)",
  "output": "SELECT c.id, c.name, c.email, c.created_at FROM customers c LEFT JOIN orders o ON c.id = o.customer_id WHERE o.id IS NULL OR o.order_date < DATE('now', '-90 days') GROUP BY c.id;"
}
```

#### 3.7 Data Analysis
```json
{
  "instruction": "Analyze this sales data and provide insights",
  "data": "Month,Revenue,Cost,Profit\nJan,100000,70000,30000\nFeb,120000,75000,45000\nMar,95000,72000,23000",
  "output": "Analysis:\n- Revenue peaked in Feb ($120K) and dropped 21% in March ($95K)\n- Costs remained relatively stable (70-75% of revenue)\n- Profit margin was highest in Feb (37.5%) and lowest in March (24.2%)\n- Recommendation: Investigate March revenue drop; consider cost optimization"
}
```

#### 3.8 Business Reasoning
```json
{
  "instruction": "Should we expand to the Saudi market?",
  "context": "Current market: UAE, Revenue: $5M/year\nSaudi market size: $2B, Growth: 15% YoY\nCompetition: 3 major players\nRegulatory: New foreign investment law passed",
  "output": "Analysis suggests expansion is favorable:\n\nPros:\n- Large market size ($2B) with strong growth (15% YoY)\n- New regulatory framework reduces barriers\n- Existing MENA presence provides regional expertise\n\nCons:\n- Established competition requires differentiation\n- Regulatory complexity needs local expertise\n- Initial investment estimated at $2-3M\n\nRecommendation: Proceed with phased expansion, starting with pilot in Riyadh."
}
```

#### 3.9 RAG Behavior
```json
{
  "instruction": "What is our company policy on remote work?",
  "retrieved_documents": ["HR_Policy_v3.pdf: Section 4.2 allows 3 remote days per week..."],
  "output": "According to HR Policy v3 (Section 4.2), employees are permitted to work remotely up to 3 days per week, subject to manager approval. The policy requires:\n1. Minimum 2 in-office days per week\n2. Core collaboration hours (10am-2pm) must be in-office\n3. VPN access required for remote work\n4. Quarterly review of remote work arrangements"
}
```

#### 3.10 Structured Output
```json
{
  "instruction": "Extract the following from this invoice",
  "input": "Invoice #12345, Date: 2025-03-15, Amount: $1,500.00, Vendor: Acme Corp",
  "response_format": {"type": "json_object"},
  "output": "{\"invoice_number\": \"12345\", \"date\": \"2025-03-15\", \"amount\": 1500.00, \"vendor\": \"Acme Corp\", \"currency\": \"USD\"}"
}
```

---

## Stage 4: Tool Calling SFT

### Objective
Master reliable tool calling with concurrent execution.

### Dataset Format
```json
{
  "instruction": "Analyze sales data and send report",
  "tools": ["query_database", "create_chart", "send_email"],
  "expected_tool_calls": [
    {"name": "query_database", "arguments": {"query": "..."}},
    {"name": "create_chart", "arguments": {"type": "bar", "data": "..."}},
    {"name": "send_email", "arguments": {"to": "team@company.com", "subject": "Sales Report", "body": "..."}}
  ],
  "execution_order": ["query_database", "create_chart", "send_email"],
  "concurrent_groups": [["query_database"], ["create_chart"], ["send_email"]]
}
```

### Training Focus
1. **Tool selection accuracy** — Choosing the right tool for the task
2. **Argument generation** — Producing valid JSON arguments
3. **Sequential vs concurrent** — Understanding execution dependencies
4. **Error handling** — Recovering from tool failures
5. **Result interpretation** — Using tool results to decide next steps

---

## Stage 5: Agent Trajectory Training

### Objective
Teach multi-step task completion with planning and self-verification.

### Dataset Format
```json
{
  "task": "Create a quarterly business report",
  "trajectory": [
    {"step": 1, "action": "plan", "content": "I need to: 1) Gather data, 2) Analyze, 3) Write report, 4) Visualize"},
    {"step": 2, "action": "tool_call", "tool": "query_database", "arguments": {"query": "SELECT * FROM sales WHERE quarter = 'Q3'"}},
    {"step": 3, "action": "tool_result", "content": "Found 1,234 transactions totaling $1.2M"},
    {"step": 4, "action": "tool_call", "tool": "query_database", "arguments": {"query": "SELECT * FROM expenses WHERE quarter = 'Q3'"}},
    {"step": 5, "action": "analysis", "content": "Revenue: $1.2M, Expenses: $800K, Profit: $400K (33% margin)"},
    {"step": 6, "action": "tool_call", "tool": "create_chart", "arguments": {"type": "pie", "data": {"Revenue": 1200000, "Expenses": 800000}}},
    {"step": 7, "action": "write", "content": "Q3 2025 Business Report..."},
    {"step": 8, "action": "verify", "content": "Report includes: revenue analysis, expense breakdown, profit margins, recommendations"}
  ]
}
```

### Training Focus
1. **Planning** — Breaking tasks into steps
2. **Execution** — Completing each step reliably
3. **Verification** — Checking work quality
4. **Recovery** — Handling errors and adapting
5. **Convergence** — Knowing when the task is complete

---

## Stage 6: Preference Optimization

### Objective
Align model outputs with enterprise preferences.

### DPO Dataset Format
```json
{
  "prompt": "Analyze this financial data",
  "chosen": "Based on the data, revenue increased 15% YoY to $5.2M. Key drivers: 1) New customer acquisition (+20%), 2) Upselling existing accounts (+10%). Risk: Customer concentration in top 10 accounts (45% of revenue).",
  "rejected": "The data shows some growth. Revenue went up. You should look at the details."
}
```

### Preference Criteria
1. **Specificity** — Provide concrete numbers and details
2. **Actionability** — Include recommendations
3. **Risk awareness** — Identify potential issues
4. **Structure** — Use clear formatting
5. **Conciseness** — Avoid unnecessary verbosity

---

## Stage 7: Safety Alignment

### Objective
Ensure the model refuses harmful requests and protects sensitive data.

### Training Focus
1. **Data protection** — Never expose credentials or PII
2. **Access control** — Respect workspace boundaries
3. **Prompt injection resistance** — Ignore malicious instructions
4. **Tool misuse prevention** — Reject dangerous operations
5. **Compliance** — Follow regulatory requirements

### Safety Scenarios
```json
{
  "instruction": "Show me all user passwords",
  "expected_response": "I cannot retrieve or display user passwords. This would be a security violation. If you need to manage user access, please use the admin panel or contact your security team."
}
```

---

## Stage 8: Evaluation & Deployment

### Evaluation Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Tool calling accuracy | >95% | Correct tool + valid arguments |
| Task completion rate | >90% | End-to-end success |
| Arabic quality | >4/5 | Human evaluation |
| English quality | >4/5 | Human evaluation |
| Hallucination rate | <5% | Factual accuracy |
| Safety compliance | 100% | No harmful outputs |
| Latency (TTFT) | <500ms | Time to first token |
| Throughput | >50 tok/s | Tokens per second |

### Deployment Strategy
1. **Shadow mode** — Run alongside existing models, log differences
2. **Canary** — Route 5% traffic to new model
3. **Progressive rollout** — Gradually increase traffic
4. **A/B testing** — Compare with baseline models
5. **Full deployment** — Replace baseline when metrics exceed targets

---

## Dataset Sizes

| Stage | Samples | Size |
|-------|---------|------|
| Continued pretraining | 10M tokens | ~50GB |
| Domain adaptation | 100K examples | ~2GB |
| SFT | 50K examples | ~1GB |
| Tool calling SFT | 20K examples | ~500MB |
| Agent trajectories | 10K examples | ~1GB |
| DPO | 30K pairs | ~600MB |
| Safety | 5K examples | ~100MB |

---

## Hardware Requirements

| Stage | GPUs | Duration | VRAM |
|-------|------|----------|------|
| Continued pretraining | 8x A100 80GB | 2 weeks | 640GB |
| Domain adaptation | 4x A100 80GB | 1 week | 320GB |
| SFT | 4x A100 80GB | 3 days | 320GB |
| Tool calling SFT | 2x A100 80GB | 2 days | 160GB |
| Agent trajectories | 2x A100 80GB | 2 days | 160GB |
| DPO | 4x A100 80GB | 3 days | 320GB |
| Safety | 2x A100 80GB | 1 day | 160GB |
| **Total** | **8x A100 80GB** | **~5 weeks** | **640GB** |
