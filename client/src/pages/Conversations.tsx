import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient, infiniteQueryOptions } from "@tanstack/react-query";
import { conversationsApi, intelligenceApi } from "@/lib/trpc";
import {
  MessageSquare,
  Plus,
  Send,
  Search,
  Trash2,
  Edit3,
  Clock,
  Bot,
  User,
} from "lucide-react";
import { toast } from "sonner";
import "./Conversations.css";

const PAGE_SIZE = 30;

export default function Conversations() {
  const { workspaceId } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["conversations.list", workspaceId, page],
    queryFn: () => conversationsApi.list({ workspaceId: workspaceId!, limit: PAGE_SIZE, offset: page * PAGE_SIZE }) as Promise<{ items: Array<{ id: number; title: string; createdAt: string }>; hasMore: boolean }>,
    enabled: !!workspaceId,
  });

  const conversations = data?.items ?? [];
  const hasMore = data?.hasMore ?? false;

  const createConversation = useMutation({
    mutationFn: conversationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations.list"] });
      setPage(0);
    },
  });

  const deleteConversation = useMutation({
    mutationFn: conversationsApi.delete,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversations.list"] });
      if (selectedId === variables.conversationId) setSelectedId(null);
      toast.success("Conversation deleted");
    },
    onError: () => toast.error("Failed to delete conversation"),
  });

  const { data: messages } = useQuery({
    queryKey: ["conversations.messages", selectedId],
    queryFn: () =>
      conversationsApi.messages({
        workspaceId: workspaceId!,
        conversationId: selectedId!,
      }),
    enabled: !!selectedId,
  });

  const ask = useMutation({
    mutationFn: intelligenceApi.ask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations.messages", selectedId] });
    },
  });

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.title?.toLowerCase().includes(search.toLowerCase())
  );

  const msgList: Array<{ role: string; content: string }> =
    messages ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgList.length]);

  const handleCreate = () => {
    if (!workspaceId) return;
    createConversation.mutate({
      workspaceId,
      title: `New Conversation`,
    });
  };

  const handleAsk = () => {
    if (!question.trim() || !workspaceId || !selectedId) return;
    const q = question.trim();
    setQuestion("");
    ask.mutate({
      workspaceId,
      conversationId: selectedId,
      question: q,
    });
  };

  return (
    <div className="conversations-page">
      <aside className="conv-sidebar">
        <div className="conv-sidebar-header">
          <h2>Conversations</h2>
          <button className="conv-new-btn" onClick={handleCreate}>
            <Plus size={16} /> New
          </button>
        </div>

        <div className="conv-search">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="conv-list">
          {isLoading ? (
            <div className="conv-loading">Loading...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="conv-empty-list">No conversations found</div>
          ) : (
            <>
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  className={`conv-item ${selectedId === conv.id ? "active" : ""}`}
                  onClick={() => setSelectedId(conv.id)}
                >
                  <MessageSquare size={16} className="conv-item-icon" />
                  <div className="conv-item-text">
                    <span className="conv-title">{conv.title}</span>
                    <span className="conv-date">
                      {new Date(conv.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    className="conv-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation.mutate({
                        workspaceId,
                        conversationId: conv.id,
                      });
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </button>
              ))}
              {hasMore && (
                <button className="conv-load-more" onClick={() => setPage(p => p + 1)}>
                  Load more
                </button>
              )}
            </>
          )}
        </div>
      </aside>

      <main className="conv-main">
        {selectedId ? (
          <>
            <div className="conv-messages">
              {msgList.map((msg, i) => (
                <div key={i} className={`msg ${msg.role}`}>
                  <div className="msg-avatar">
                    {msg.role === "user" ? (
                      <User size={16} />
                    ) : (
                      <Bot size={16} />
                    )}
                  </div>
                  <div className="msg-content">{msg.content}</div>
                </div>
              ))}
              {ask.isPending && (
                <div className="msg assistant">
                  <div className="msg-avatar">
                    <Bot size={16} />
                  </div>
                  <div className="msg-content msg-thinking">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="conv-input">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question..."
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              />
              <button
                onClick={handleAsk}
                disabled={!question.trim() || ask.isPending}
              >
                <Send size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="conv-empty">
            <MessageSquare size={48} />
            <h2>Select a conversation</h2>
            <p>Choose from the sidebar or create a new one</p>
          </div>
        )}
      </main>
    </div>
  );
}
