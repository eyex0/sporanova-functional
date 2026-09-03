# NOVA Dataset Specification

**Date:** 2026-09-03
**Status:** PLANNED

---

## Overview

The NOVA dataset is designed to train NOVA for enterprise agent tasks. It includes:
- Enterprise reasoning
- Tool calling
- Arabic enterprise tasks
- SQL/Python/Excel
- Workflow automation
- Multi-step agents
- Error recovery

---

## Dataset Categories

### 1. Enterprise Reasoning (30,000 examples)

**Subcategories:**
| Subcategory | Examples | Description |
|-------------|----------|-------------|
| Business Analysis | 5,000 | Analyze business data, trends, patterns |
| Financial Analysis | 5,000 | Financial statements, budgets, forecasts |
| Market Research | 5,000 | Market trends, competitor analysis |
| Risk Assessment | 5,000 | Identify and assess business risks |
| Strategic Planning | 5,000 | Long-term planning, goal setting |
| Decision Making | 5,000 | Data-driven decisions, trade-offs |

**Example:**
```json
{
  "category": "enterprise_reasoning",
  "subcategory": "business_analysis",
  "language": "en",
  "difficulty": "hard",
  "messages": [
    {
      "role": "user",
      "content": "Analyze Q1 sales data and identify growth opportunities."
    },
    {
      "role": "assistant",
      "content": "I'll analyze the Q1 sales data. Let me start by querying the database.",
      "tool_calls": [
        {
          "id": "call_1",
          "type": "function",
          "function": {
            "name": "sql_query",
            "arguments": "{\"query\": \"SELECT product_category, SUM(revenue) as total_revenue, COUNT(*) as total_sales FROM sales WHERE quarter = 'Q1' GROUP BY product_category ORDER BY total_revenue DESC\"}"
          }
        }
      ]
    }
  ]
}
```

---

### 2. Tool Calling (15,000 examples)

**Subcategories:**
| Subcategory | Examples | Description |
|-------------|----------|-------------|
| SQL Queries | 3,000 | Database queries |
| API Calls | 3,000 | External API integration |
| File Operations | 2,000 | File read/write/delete |
| Web Search | 2,000 | Internet search |
| Calculations | 2,000 | Mathematical operations |
| Data Transformation | 3,000 | Data processing |

**Example:**
```json
{
  "category": "tool_calling",
  "subcategory": "sql_queries",
  "language": "en",
  "difficulty": "medium",
  "messages": [
    {
      "role": "user",
      "content": "How many active customers do we have?"
    },
    {
      "role": "assistant",
      "content": "Let me query the database to find the number of active customers.",
      "tool_calls": [
        {
          "id": "call_1",
          "type": "function",
          "function": {
            "name": "sql_query",
            "arguments": "{\"query\": \"SELECT COUNT(*) as active_customers FROM customers WHERE status = 'active'\"}"
          }
        }
      ]
    },
    {
      "role": "tool",
      "content": "[[1234]]",
      "tool_call_id": "call_1"
    },
    {
      "role": "assistant",
      "content": "We have 1,234 active customers."
    }
  ]
}
```

---

### 3. Arabic Enterprise (15,000 examples)

**Subcategories:**
| Subcategory | Examples | Description |
|-------------|----------|-------------|
| Business Analysis (Arabic) | 3,000 | Arabic business analysis |
| Financial Analysis (Arabic) | 3,000 | Arabic financial analysis |
| Customer Support (Arabic) | 3,000 | Arabic customer support |
| Sales (Arabic) | 3,000 | Arabic sales conversations |
| Marketing (Arabic) | 3,000 | Arabic marketing content |

**Example (Arabic):**
```json
{
  "category": "arabic_enterprise",
  "subcategory": "business_analysis",
  "language": "ar",
  "difficulty": "medium",
  "messages": [
    {
      "role": "user",
      "content": "حلل مبيعات الربع الأول وقدم توصيات للتحسين"
    },
    {
      "role": "assistant",
      "content": "سأقوم بتحليل مبيعات الربع الأول. دعني أبدأ بالاستعلام عن قاعدة البيانات.",
      "tool_calls": [
        {
          "id": "call_1",
          "type": "function",
          "function": {
            "name": "sql_query",
            "arguments": "{\"query\": \"SELECT product_category, SUM(revenue) as total_revenue FROM sales WHERE quarter = 'Q1' GROUP BY product_category\"}"
          }
        }
      ]
    }
  ]
}
```

---

### 4. SQL/Python/Excel (15,000 examples)

**Subcategories:**
| Subcategory | Examples | Description |
|-------------|----------|-------------|
| SQL Queries | 5,000 | Complex SQL operations |
| Python Scripts | 5,000 | Python data analysis |
| Excel Operations | 5,000 | Excel-like operations |

**Example (SQL):**
```json
{
  "category": "code",
  "subcategory": "sql",
  "language": "en",
  "difficulty": "hard",
  "messages": [
    {
      "role": "user",
      "content": "Write a query to find the top 5 customers by revenue in each region."
    },
    {
      "role": "assistant",
      "content": "I'll write a window function query to find the top 5 customers by revenue in each region.",
      "tool_calls": [
        {
          "id": "call_1",
          "type": "function",
          "function": {
            "name": "sql_query",
            "arguments": "{\"query\": \"WITH ranked_customers AS (SELECT customer_name, region, revenue, ROW_NUMBER() OVER (PARTITION BY region ORDER BY revenue DESC) as rank FROM customer_revenue) SELECT customer_name, region, revenue FROM ranked_customers WHERE rank <= 5\"}"
          }
        }
      ]
    }
  ]
}
```

---

### 5. Workflow Automation (15,000 examples)

**Subcategories:**
| Subcategory | Examples | Description |
|-------------|----------|-------------|
| Simple Workflows | 3,000 | 2-3 step workflows |
| Complex Workflows | 3,000 | 5+ step workflows |
| Conditional Logic | 3,000 | If/else branching |
| Error Handling | 3,000 | Retry, fallback, recovery |
| Parallel Execution | 3,000 | Concurrent operations |

**Example:**
```json
{
  "category": "workflow_automation",
  "subcategory": "complex_workflow",
  "language": "en",
  "difficulty": "hard",
  "messages": [
    {
      "role": "user",
      "content": "Create a workflow to process new leads: qualify, assign to sales rep, send welcome email, and schedule follow-up."
    },
    {
      "role": "assistant",
      "content": "I'll create a multi-step workflow for lead processing. Here's the plan:\n\n1. Qualify lead using scoring criteria\n2. Assign to appropriate sales rep based on territory\n3. Send personalized welcome email\n4. Schedule follow-up task\n\nLet me start by qualifying the lead.",
      "tool_calls": [
        {
          "id": "call_1",
          "type": "function",
          "function": {
            "name": "qualification_score",
            "arguments": "{\"lead_id\": \"lead_123\", \"criteria\": [\"company_size\", \"budget\", \"timeline\"]}"
          }
        }
      ]
    }
  ]
}
```

---

### 6. Multi-Step Agents (10,000 examples)

**Subcategories:**
| Subcategory | Examples | Description |
|-------------|----------|-------------|
| Research Agents | 2,000 | Multi-source research |
| Analysis Agents | 2,000 | Complex analysis tasks |
| Creative Agents | 2,000 | Content creation |
| Planning Agents | 2,000 | Task planning |
| Execution Agents | 2,000 | Complex task execution |

**Example:**
```json
{
  "category": "multi_step_agent",
  "subcategory": "research_agent",
  "language": "en",
  "difficulty": "hard",
  "messages": [
    {
      "role": "user",
      "content": "Research our top 3 competitors and create a competitive analysis report."
    },
    {
      "role": "assistant",
      "content": "I'll research our top competitors and create a comprehensive analysis. Let me start by gathering information about each competitor.",
      "tool_calls": [
        {
          "id": "call_1",
          "type": "function",
          "function": {
            "name": "web_search",
            "arguments": "{\"query\": \"top competitors in our industry\"}"
          }
        }
      ]
    }
  ]
}
```

---

### 7. Error Recovery (5,000 examples)

**Subcategories:**
| Subcategory | Examples | Description |
|-------------|----------|-------------|
| Tool Failures | 1,000 | Handle tool errors |
| API Errors | 1,000 | Handle API failures |
| Data Errors | 1,000 | Handle data issues |
| Timeout Handling | 1,000 | Handle timeouts |
| Fallback Logic | 1,000 | Alternative approaches |

**Example:**
```json
{
  "category": "error_recovery",
  "subcategory": "tool_failures",
  "language": "en",
  "difficulty": "hard",
  "messages": [
    {
      "role": "user",
      "content": "Get the latest sales data from the database."
    },
    {
      "role": "assistant",
      "content": "Let me query the database for the latest sales data.",
      "tool_calls": [
        {
          "id": "call_1",
          "type": "function",
          "function": {
            "name": "sql_query",
            "arguments": "{\"query\": \"SELECT * FROM sales ORDER BY date DESC LIMIT 100\"}"
          }
        }
      ]
    },
    {
      "role": "tool",
      "content": "Error: Database connection timeout",
      "tool_call_id": "call_1"
    },
    {
      "role": "assistant",
      "content": "The database connection timed out. Let me try an alternative approach by checking the cached data instead.",
      "tool_calls": [
        {
          "id": "call_2",
          "type": "function",
          "function": {
            "name": "get_cached_data",
            "arguments": "{\"key\": \"latest_sales\", \"max_age\": \"1h\"}"
          }
        }
      ]
    }
  ]
}
```

---

## Dataset Quality Requirements

### Quality Scores
| Score | Description | Action |
|-------|-------------|--------|
| 0.9-1.0 | Excellent | Use for training |
| 0.7-0.9 | Good | Use with review |
| 0.5-0.7 | Fair | Improve before use |
| 0.0-0.5 | Poor | Discard |

### Quality Criteria
1. **Accuracy:** Information must be factually correct
2. **Relevance:** Responses must address the user's request
3. **Completeness:** Responses must be complete and thorough
4. **Clarity:** Responses must be clear and easy to understand
5. **Safety:** Responses must be safe and appropriate
6. **Language:** Grammar and spelling must be correct

---

## Dataset Generation Pipeline

### 1. Synthetic Generation
- Use GPT-4o to generate examples
- Validate with automated checks
- Review with human annotators

### 2. Real Data Collection
- Collect from production agents
- Anonymize sensitive data
- Validate quality

### 3. Human Annotation
- Annotate with human feedback
- Rate quality and accuracy
- Flag issues

### 4. Quality Assurance
- Automated validation
- Human review
- Fix issues

---

## Data Storage

### Database Schema
```sql
CREATE TABLE nova_training_data (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  language TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  messages JSONB NOT NULL,
  metadata JSONB,
  quality_score FLOAT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### File Storage
```
data/
├── nova-training/
│   ├── enterprise_reasoning/
│   ├── tool_calling/
│   ├── arabic_enterprise/
│   ├── code/
│   ├── workflow_automation/
│   ├── multi_step_agent/
│   └── error_recovery/
```
