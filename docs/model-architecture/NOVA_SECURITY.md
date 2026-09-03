# NOVA Security

**Date:** 2026-09-03
**Status:** ACTIVE

---

## Overview

NOVA inherits SOPRANOVA's security model and adds model-specific security:
1. Tenant isolation
2. Tool permissions
3. Prompt injection protection
4. Secret protection
5. Action authorization
6. Data leakage prevention
7. Model abuse prevention

---

## Security Layers

### 1. Tenant Isolation

**Purpose:** Ensure agents can only access their own data.

**Implementation:**
```typescript
// Every NOVA request includes workspace context
interface NovaContext {
  workspaceId: string;
  agentId: string;
  userId: string;
  permissions: string[];
}

// All database queries are workspace-scoped
const results = await db.query(`
  SELECT * FROM data 
  WHERE workspace_id = $1
`, [context.workspaceId]);
```

**Enforcement:**
- All API endpoints validate workspace membership
- Database queries include workspace_id filter
- File storage is workspace-namespaced
- Model inference includes workspace context

---

### 2. Tool Permissions

**Purpose:** Control which tools agents can use.

**Implementation:**
```typescript
interface ToolPermission {
  toolName: string;
  workspaceId: string;
  allowed: boolean;
  conditions?: Record<string, any>;
}

// Check tool permission before execution
function checkToolPermission(
  context: NovaContext,
  toolName: string
): boolean {
  const permission = permissions.find(
    p => p.toolName === toolName && 
         p.workspaceId === context.workspaceId
  );
  return permission?.allowed ?? false;
}
```

**Permission Levels:**
| Level | Description | Example |
|-------|-------------|---------|
| Deny | Tool not allowed | `sql_query` for workspace |
| Allow | Tool allowed unconditionally | `get_current_date` |
| Conditional | Tool allowed with conditions | `web_search` with URL whitelist |

---

### 3. Prompt Injection Protection

**Purpose:** Prevent malicious prompts from hijacking agent behavior.

**Detection Methods:**
| Method | Description | Implementation |
|--------|-------------|----------------|
| Pattern Matching | Detect known injection patterns | Regex patterns |
| Semantic Analysis | Analyze prompt meaning | LLM-based detection |
| Input Validation | Validate input structure | Schema validation |
| Output Filtering | Filter suspicious outputs | Content filtering |

**Implementation:**
```typescript
function detectPromptInjection(input: string): {
  detected: boolean;
  confidence: number;
  reason?: string;
} {
  // Pattern matching
  const patterns = [
    /ignore previous instructions/i,
    /you are now/i,
    /disregard.*instructions/i,
    /new instructions/i,
  ];
  
  for (const pattern of patterns) {
    if (pattern.test(input)) {
      return {
        detected: true,
        confidence: 0.9,
        reason: `Matched pattern: ${pattern.source}`
      };
    }
  }
  
  return { detected: false, confidence: 0 };
}
```

---

### 4. Secret Protection

**Purpose:** Prevent secrets from being exposed in model interactions.

**Implementation:**
```typescript
// Detect and redact secrets before sending to model
function redactSecrets(input: string): {
  redacted: string;
  secretsFound: string[];
} {
  const secretPatterns = [
    { name: 'API Key', pattern: /sk_[a-zA-Z0-9]{32}/g },
    { name: 'AWS Key', pattern: /AKIA[A-Z0-9]{16}/g },
    { name: 'Password', pattern: /password\s*[:=]\s*\S+/gi },
  ];
  
  let redacted = input;
  const secretsFound: string[] = [];
  
  for (const { name, pattern } of secretPatterns) {
    const matches = input.match(pattern);
    if (matches) {
      secretsFound.push(...matches.map(m => name));
      redacted = redacted.replace(pattern, '[REDACTED]');
    }
  }
  
  return { redacted, secretsFound };
}
```

---

### 5. Action Authorization

**Purpose:** Ensure model-generated actions are authorized.

**Implementation:**
```typescript
interface NovaAction {
  type: 'tool_call' | 'api_call' | 'file_operation';
  name: string;
  arguments: Record<string, any>;
  context: NovaContext;
}

function authorizeAction(action: NovaAction): {
  authorized: boolean;
  reason?: string;
} {
  // Check tool permission
  if (action.type === 'tool_call') {
    if (!checkToolPermission(action.context, action.name)) {
      return {
        authorized: false,
        reason: `Tool ${action.name} not authorized for workspace`
      };
    }
  }
  
  // Check API permission
  if (action.type === 'api_call') {
    if (!checkApiPermission(action.context, action.name)) {
      return {
        authorized: false,
        reason: `API ${action.name} not authorized`
      };
    }
  }
  
  // Check file permission
  if (action.type === 'file_operation') {
    if (!checkFilePermission(action.context, action.arguments.path)) {
      return {
        authorized: false,
        reason: `File path not authorized`
      };
    }
  }
  
  return { authorized: true };
}
```

---

### 6. Data Leakage Prevention

**Purpose:** Prevent sensitive data from being exposed.

**Implementation:**
```typescript
// Filter sensitive data from model outputs
function filterSensitiveData(output: string): string {
  const sensitivePatterns = [
    { name: 'Email', pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
    { name: 'Phone', pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g },
    { name: 'SSN', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
    { name: 'Credit Card', pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g },
  ];
  
  let filtered = output;
  for (const { name, pattern } of sensitivePatterns) {
    filtered = filtered.replace(pattern, `[${name} REDACTED]`);
  }
  
  return filtered;
}
```

---

### 7. Model Abuse Prevention

**Purpose:** Prevent misuse of the model.

**Implementation:**
```typescript
// Rate limiting per workspace
const rateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  keyGenerator: (req) => req.context.workspaceId,
});

// Content filtering
function filterAbusiveContent(input: string): {
  allowed: boolean;
  reason?: string;
} {
  const abusePatterns = [
    { name: 'Hate Speech', pattern: /hate|racist|sexist/gi },
    { name: 'Violence', pattern: /kill|murder|attack/gi },
    { name: 'Illegal Activity', pattern: /hack|crack|steal/gi },
  ];
  
  for (const { name, pattern } of abusePatterns) {
    if (pattern.test(input)) {
      return {
        allowed: false,
        reason: `Potentially abusive content detected: ${name}`
      };
    }
  }
  
  return { allowed: true };
}
```

---

## Security Headers

### HTTP Security Headers
```typescript
// Add to all NOVA responses
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
```

---

## Audit Logging

### What to Log
| Event | Description | Level |
|-------|-------------|-------|
| Model Request | Incoming model request | INFO |
| Tool Execution | Tool call execution | INFO |
| Permission Check | Permission validation | DEBUG |
| Injection Detection | Prompt injection detected | WARN |
| Secret Detection | Secret detected | WARN |
| Abuse Detection | Abuse detected | WARN |
| Error | Model/execution error | ERROR |

### Log Format
```json
{
  "timestamp": "2026-09-03T12:00:00Z",
  "level": "INFO",
  "event": "model_request",
  "workspaceId": "ws_123",
  "agentId": "agent_456",
  "userId": "user_789",
  "model": "NOVA-v1.0",
  "provider": "nova",
  "latencyMs": 450,
  "tokens": {
    "input": 150,
    "output": 250
  },
  "toolCalls": 2,
  "status": "success"
}
```

---

## Compliance

### Data Privacy
- All data is workspace-isolated
- No cross-workspace data access
- Data retention policies enforced
- GDPR compliance support

### Model Privacy
- Model weights are not exposed
- Inference logs are workspace-scoped
- No training data leakage
- Secure model storage

---

## Security Testing

### Tests to Run
| Test | Description | Frequency |
|------|-------------|-----------|
| Penetration Testing | Security vulnerability assessment | Quarterly |
| Injection Testing | Prompt injection resistance | Monthly |
| Access Control Testing | Permission validation | Weekly |
| Data Leakage Testing | Sensitive data exposure | Weekly |

---

## Next Steps

1. **Q4 2026:** Implement prompt injection detection
2. **Q4 2026:** Implement secret protection
3. **Q1 2027:** Implement action authorization
4. **Q1 2027:** Implement audit logging
5. **Q2 2027:** Security testing
