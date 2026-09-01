import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspacesApi, membersApi } from "@/lib/trpc";
import { Shield, Crown, UserMinus, Mail, X, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import "./Team.css";

type Role = "owner" | "admin" | "member" | "viewer";

interface Member {
  userId: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
  isActive: boolean;
  joinedAt: string;
}

const ROLE_COLORS: Record<Role, { bg: string; fg: string }> = {
  owner: { bg: "#FEF3C7", fg: "#B45309" },
  admin: { bg: "#EEF2FF", fg: "#4F46E5" },
  member: { bg: "#ECFDF5", fg: "#059669" },
  viewer: { bg: "#F3F4F6", fg: "#6B7280" },
};

export default function Team() {
  const { user, workspaceId } = useAuth();
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("member");

  const { data: members, isLoading } = useQuery({
    queryKey: ["workspaces.members", workspaceId],
    queryFn: () => workspacesApi.members({ workspaceId: workspaceId! }) as Promise<Member[]>,
    enabled: !!workspaceId,
  });

  const inviteMember = useMutation({
    mutationFn: membersApi.invite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces.members"] });
      setShowInvite(false);
      setInviteEmail("");
      setInviteRole("member");
      toast.success("Member invited");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to invite member"),
  });

  const changeRole = useMutation({
    mutationFn: membersApi.updateRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces.members"] });
      toast.success("Role updated");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update role"),
  });

  const removeMember = useMutation({
    mutationFn: membersApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces.members"] });
      toast.success("Member removed");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to remove member"),
  });

  if (!workspaceId) {
    return (
      <div className="team-page">
        <div className="loading-spinner" />
      </div>
    );
  }

  const memberList: Member[] = Array.isArray(members) ? (members as Member[]) : [];

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMember.mutate({ workspaceId, email: inviteEmail, role: inviteRole });
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  };

  return (
    <div className="team-page">
      <header className="page-header">
        <div>
          <h1>Team</h1>
          <p>Manage workspace members and their roles</p>
        </div>
        <button className="btn-primary" onClick={() => setShowInvite(true)}>
          <Mail size={16} />
          Invite Member
        </button>
      </header>

      {isLoading ? (
        <div className="loading-spinner" />
      ) : memberList.length === 0 ? (
        <div className="team-empty">
          <UsersIcon size={48} />
          <p>No members yet</p>
          <span>Invite your first team member to get started.</span>
        </div>
      ) : (
        <div className="team-grid">
          {memberList.map((m) => {
            const isOwner = m.role === "owner";
            const isSelf = m.userId === user?.id;
            const rc = ROLE_COLORS[m.role];
            return (
              <div className="team-card" key={m.userId}>
                <div className="team-card-header">
                  <div className="team-avatar" style={{ background: rc.bg, color: rc.fg }}>
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt={m.name} />
                    ) : (
                      getInitials(m.name)
                    )}
                  </div>
                  <div className="team-card-info">
                    <h3>
                      {m.name}
                      {isSelf && <span className="team-you-badge">(you)</span>}
                    </h3>
                    <p>{m.email}</p>
                  </div>
                </div>

                <div className="team-card-meta">
                  <span className="team-role-badge" style={{ background: rc.bg, color: rc.fg }}>
                    {isOwner && <Crown size={12} />}
                    {!isOwner && m.role === "admin" && <Shield size={12} />}
                    {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                  </span>
                  <span className="team-joined">Joined {formatDate(m.joinedAt)}</span>
                </div>

                {!isOwner && !isSelf && (
                  <div className="team-card-actions">
                    <select
                      className="team-role-select"
                      value={m.role}
                      onChange={(e) =>
                        changeRole.mutate({ workspaceId, userId: m.userId, role: e.target.value as Role })
                      }
                      disabled={changeRole.isPending}
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      className="btn-remove-member"
                      onClick={() => removeMember.mutate({ workspaceId, userId: m.userId })}
                      disabled={removeMember.isPending}
                    >
                      <UserMinus size={14} />
                      Remove
                    </button>
                  </div>
                )}
                {isOwner && (
                  <div className="team-card-actions">
                    <span className="team-owner-label">
                      <Crown size={12} />
                      Workspace owner
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showInvite && (
        <div className="modal-overlay" onClick={() => setShowInvite(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invite Member</h2>
              <button className="modal-close" onClick={() => setShowInvite(false)}>
                <X size={16} />
              </button>
            </div>
            <p className="modal-subtitle">Send an invitation to join this workspace.</p>
            <form onSubmit={handleInvite}>
              <label>
                Email address
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                />
              </label>
              <label>
                Role
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)}>
                  <option value="viewer">Viewer</option>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowInvite(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={inviteMember.isPending}>
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
