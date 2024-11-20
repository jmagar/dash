# Deprecated Files Tracking

The following files are deprecated and should be removed once their functionality has been fully migrated to the new services:

## Agent Management
- [ ] `/src/server/routes/hosts/agent-installer.ts`
  - Being replaced by: `/src/server/services/agent/agent.service.ts`
  - Migration status: In progress
  - Dependencies to update:
    - [ ] Update imports in `/src/server/routes/hosts/index.ts`
    - [ ] Update AgentInstaller references
    - [ ] Remove LinuxHandler and WindowsHandler

## Monitoring
- [ ] `/src/server/routes/hosts/monitoring.ts`
  - Being replaced by: `/src/server/services/metrics.service.ts`
  - Migration status: In progress
  - Dependencies to update:
    - [ ] Update route handlers to use MetricsService
    - [ ] Migrate any remaining monitoring logic

## Host Management
- [ ] `/src/server/routes/hosts/service.ts`
  - Being replaced by: `/src/server/services/host/host.service.ts`
  - Migration status: Not started
  - Dependencies to update:
    - [ ] Create new HostService
    - [ ] Migrate CRUD operations
    - [ ] Update route handlers

- [ ] `/src/server/routes/hosts/pool.ts`
  - Being replaced by: `/src/server/services/host/host.service.ts`
  - Migration status: Not started
  - Dependencies to update:
    - [ ] Migrate connection pooling to HostService
    - [ ] Update SSH connection management

## Migration Steps
1. Create new service implementations
2. Update route handlers to use new services
3. Run tests to ensure functionality is maintained
4. Remove deprecated files
5. Update documentation

## Progress Tracking
- [ ] All new services implemented
- [ ] Route handlers updated
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Old files removed
