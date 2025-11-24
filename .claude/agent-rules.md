# Agent Collaboration Rules

Coordination and collaboration guidelines for all agents in the MSQ Transaction Monitor project.

## Agent Ownership Matrix

### Leader Agent
**Owns:**
- Docker configuration (Dockerfile.packages, docker-compose*.yml)
- Nginx configuration (nginx/)
- CI/CD pipelines
- Infrastructure configuration
- Subgraph coordination
- Cross-service integration

**Never Modifies:**
- Application source code (apps/*/src/)
- Library implementations (libs/*/src/)

### API Agent
**Owns:**
- `apps/tx-api/` (complete NestJS application)
- `libs/database/` (Prisma schema and migrations)
- `libs/subgraph-client/` (GraphQL client)
- `libs/tx-types/` (TypeScript type definitions)
- `libs/chain-utils/` (blockchain utilities)
- `libs/msq-common/` (common utilities)

**Never Modifies:**
- `apps/chain-scanner/` (Blockchain Agent's area)
- `apps/tx-dashboard*/` (Frontend Agent's area)
- Docker/Nginx configuration (Leader's area)

### Blockchain Agent
**Owns:**
- `apps/chain-scanner/` (complete blockchain scanner)
- Block processing logic
- WebSocket server implementation
- RPC provider management
- Blockchain event broadcasting

**Never Modifies:**
- `apps/tx-api/` (API Agent's area)
- `apps/tx-dashboard*/` (Frontend Agent's area)
- `libs/` (API Agent's area, except reading)
- Docker/Nginx configuration (Leader's area)

### Frontend Agent
**Owns:**
- `apps/tx-dashboard/` (React 18 legacy dashboard)
- `apps/tx-dashboard-v2/` (Next.js new dashboard)
- UI components and layouts
- Frontend logic and state management
- Client-side API integration

**Never Modifies:**
- `apps/tx-api/` (API Agent's area)
- `apps/chain-scanner/` (Blockchain Agent's area)
- `libs/` (API Agent's area, except reading tx-types)
- Docker/Nginx configuration (Leader's area)

## Shared Resource Management

### libs/tx-types (Shared TypeScript Types)

**Primary Owner**: API Agent

**Collaboration Rules:**

1. **Adding New Types**
   ```
   API Agent:
   1. Add type definition to libs/tx-types/
   2. Export from index.ts
   3. Update version if breaking change
   4. Notify Frontend Agent via comment:
      "// @notify Frontend Agent: New TransactionDto type added"

   Frontend Agent:
   1. Wait for notification
   2. Import new types
   3. Update components to use new types
   ```

2. **Modifying Existing Types**
   ```
   API Agent:
   1. Assess breaking change impact
   2. If breaking: Notify Leader and Frontend Agent BEFORE making change
   3. Create migration guide in libs/tx-types/MIGRATION.md
   4. Make the change
   5. Update API implementation

   Frontend Agent:
   1. Review migration guide
   2. Update all affected components
   3. Test thoroughly
   4. Notify API Agent when complete
   ```

3. **Type Usage**
   ```
   Frontend Agent can:
   ✅ Import and use types from libs/tx-types
   ✅ Suggest new types (request to API Agent)

   Frontend Agent cannot:
   ❌ Modify libs/tx-types directly
   ❌ Add types without API Agent approval
   ```

## Notification Protocols

### When to Notify Other Agents

#### API Agent Must Notify When:
- ✅ Adding/removing endpoints (→ Frontend Agent)
- ✅ Changing API response structure (→ Frontend Agent)
- ✅ Modifying types in libs/tx-types (→ Frontend Agent)
- ✅ Database schema changes affecting multiple services (→ Leader)
- ✅ WebSocket event format changes (→ Blockchain Agent)

#### Blockchain Agent Must Notify When:
- ✅ Adding new WebSocket event types (→ API Agent, Frontend Agent)
- ✅ Changing WebSocket event format (→ API Agent, Frontend Agent)
- ✅ RPC provider issues (timeout rate > 10%) (→ Leader)
- ✅ Critical reorgs (depth > 6 blocks) (→ Leader)

#### Frontend Agent Must Notify When:
- ✅ New API endpoint needed (→ API Agent)
- ✅ WebSocket event format not working (→ Blockchain Agent)
- ✅ Type definitions missing (→ API Agent)

#### Leader Agent Must Notify When:
- ✅ Subgraph schema changes (→ API Agent)
- ✅ Docker configuration changes (→ All Agents)
- ✅ Infrastructure changes affecting services (→ Relevant Agents)

### Notification Format

Use comments in code or commit messages:
```typescript
// @notify [Agent Name]: [Brief description]
// Example:
// @notify Frontend Agent: TransactionDto now includes 'gasUsed' field
```

In commit messages:
```
feat: add gasUsed to transaction response

- Added gasUsed field to TransactionDto
- Updated API endpoint to include gas information

@notify Frontend Agent: New field 'gasUsed' available in transaction data
```

## Workflow Patterns

### Pattern 1: New Feature (Multi-Agent)

**Example**: Add transaction filtering by token type

```
1. Leader Agent:
   - Analyze request
   - Identify affected agents: API, Frontend
   - Plan sequence:
     a. API Agent: Add filter endpoint
     b. Frontend Agent: Add UI controls

2. API Agent:
   - Add FilterDto to libs/tx-types
   - Implement filter logic in service
   - Add REST endpoint
   - Notify Frontend Agent

3. Frontend Agent:
   - Wait for notification
   - Import FilterDto
   - Create filter UI component
   - Integrate with API
   - Test end-to-end

4. Leader Agent:
   - Verify integration
   - Test in Docker environment
   - Update documentation
```

### Pattern 2: API Contract Change

**Example**: Change transaction response structure

```
1. API Agent (Planning):
   - Document proposed changes
   - Create migration guide
   - Notify Leader and Frontend Agent
   - Wait for approval

2. Leader Agent:
   - Review impact
   - Approve or request changes
   - Coordinate timing

3. API Agent (Implementation):
   - Make changes to libs/tx-types
   - Update API implementation
   - Add version to endpoint if breaking
   - Update API documentation

4. Frontend Agent:
   - Follow migration guide
   - Update all affected components
   - Test thoroughly
   - Report completion

5. Leader Agent:
   - Verify integration
   - Deploy in sequence if needed
```

### Pattern 3: WebSocket Event Format Change

**Example**: Add new fields to transaction event

```
1. Blockchain Agent:
   - Propose changes to event format
   - Document new structure
   - Notify API Agent and Frontend Agent
   - Wait for approval

2. API Agent:
   - Update WebSocket listener
   - Update libs/tx-types if needed
   - Test event processing

3. Frontend Agent:
   - Update WebSocket hook
   - Update UI to display new fields
   - Test real-time updates

4. Blockchain Agent:
   - Deploy changes
   - Monitor for issues

5. Leader Agent:
   - Verify end-to-end flow
   - Monitor production
```

### Pattern 4: Database Schema Change

**Example**: Add new table for transaction analytics

```
1. API Agent:
   - Update libs/database/prisma/schema.prisma
   - Create migration
   - Notify Leader (multi-service impact)

2. Leader Agent:
   - Review migration
   - Check for breaking changes
   - Approve timing

3. API Agent:
   - Run migration in development
   - Generate Prisma client
   - Update affected services
   - Test locally

4. Leader Agent:
   - Test in Docker environment
   - Plan production migration
   - Execute migration
```

## Conflict Resolution

### Scenario 1: Overlapping Work Areas

**Problem**: Two agents need to modify related code simultaneously

**Resolution**:
```
1. First agent to start work: Notify Leader and other agent
2. Leader: Determine priority based on:
   - User request urgency
   - Complexity of changes
   - Dependencies between changes
3. Leader: Assign sequence or coordinate parallel work
4. Agents: Follow Leader's direction
```

### Scenario 2: Shared Library Modification

**Problem**: Frontend Agent needs type that doesn't exist

**Resolution**:
```
1. Frontend Agent: Request type from API Agent
   Format: "Need type definition for [purpose]"
2. API Agent: Review request
3. API Agent: Either:
   a. Add type if reasonable
   b. Suggest alternative approach
   c. Discuss with Leader if architectural impact
4. Frontend Agent: Wait for type addition
5. API Agent: Notify when ready
```

### Scenario 3: Breaking Change Disagreement

**Problem**: API Agent wants breaking change, Frontend Agent objects

**Resolution**:
```
1. Escalate to Leader Agent
2. Leader: Analyze impact
3. Leader: Consider options:
   a. API versioning (/api/v2/)
   b. Gradual migration
   c. Defer change
4. Leader: Make decision
5. Both agents: Follow decision
```

## Quality Gates

Before completing work, each agent must:

### API Agent Quality Gates
```
□ Types defined in libs/tx-types/
□ Prisma migrations created and tested
□ Tests written and passing
□ No TypeScript errors (pnpm run typecheck)
□ Linting passes (pnpm nx lint tx-api)
□ Build succeeds (pnpm nx build tx-api)
□ Frontend Agent notified if API contract changed
```

### Blockchain Agent Quality Gates
```
□ Code follows existing patterns
□ RPC failover tested
□ WebSocket events validated
□ Reorg handling tested (if applicable)
□ No JavaScript errors
□ Linting passes (pnpm nx lint chain-scanner)
□ Build succeeds (pnpm nx build chain-scanner)
□ API/Frontend Agents notified if events changed
```

### Frontend Agent Quality Gates
```
□ Types imported from libs/tx-types
□ No TypeScript errors (pnpm run typecheck)
□ Linting passes (pnpm nx lint tx-dashboard*)
□ Build succeeds (pnpm nx build tx-dashboard*)
□ Real-time updates tested
□ API integration verified
□ Responsive design tested
```

### Leader Agent Quality Gates
```
□ Docker builds succeed
□ All services start correctly
□ Service integration verified
□ Nginx routing tested
□ Environment variables documented
□ Documentation updated
```

## Emergency Protocols

### Production Issue

```
1. Leader Agent: Triage issue
2. Leader Agent: Identify responsible agent
3. Responsible Agent: Diagnose and fix
4. Leader Agent: Verify fix
5. Leader Agent: Deploy hotfix
6. All Agents: Post-mortem if major issue
```

### Rollback Required

```
1. Leader Agent: Identify scope
2. Leader Agent: Coordinate rollback
3. Affected Agents: Prepare rollback changes
4. Leader Agent: Execute in reverse dependency order
5. Leader Agent: Verify system stability
```

## Best Practices

### 1. Single Responsibility
- Each agent focuses on their domain
- Don't cross boundaries without notification
- Ask Leader when scope is unclear

### 2. Communication First
- Notify before making breaking changes
- Document architectural decisions
- Share lessons learned

### 3. Testing Integration
- Test at boundaries (API contracts, WebSocket events)
- Verify types match across services
- Test in Docker environment before finalizing

### 4. Documentation
- Update relevant documentation when making changes
- Include examples in notifications
- Maintain CHANGELOG entries

### 5. Git Workflow
- Create feature branches for significant work
- Reference agent in commit messages
- Coordinate merge timing with Leader

## Summary

These rules ensure:
- ✅ Clear ownership and boundaries
- ✅ Effective communication between agents
- ✅ Coordinated changes to shared resources
- ✅ Quality and integration verification
- ✅ Rapid issue resolution

All agents must follow these rules to maintain system integrity and development velocity.
