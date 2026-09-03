// NOVA Permissions
// SOPRANOVA Intelligence Platform

import { NovaContext } from './providers/base';

export interface ToolPermission {
  toolName: string;
  allowed: boolean;
  conditions?: Record<string, any>;
}

export class NovaPermissionChecker {
  private permissions: Map<string, ToolPermission[]> = new Map();

  setPermissions(workspaceId: string, permissions: ToolPermission[]): void {
    this.permissions.set(workspaceId, permissions);
  }

  check(context: NovaContext, toolName: string): { allowed: boolean; reason?: string } {
    const workspacePerms = this.permissions.get(context.workspaceId) || [];
    const toolPerm = workspacePerms.find(p => p.toolName === toolName);

    if (!toolPerm) {
      return { allowed: false, reason: `No permission defined for tool: ${toolName}` };
    }

    if (!toolPerm.allowed) {
      return { allowed: false, reason: `Tool ${toolName} is not allowed for this workspace` };
    }

    return { allowed: true };
  }

  isWorkspaceAdmin(context: NovaContext): boolean {
    return context.permissions.includes('admin');
  }

  hasPermission(context: NovaContext, permission: string): boolean {
    return context.permissions.includes(permission);
  }
}
