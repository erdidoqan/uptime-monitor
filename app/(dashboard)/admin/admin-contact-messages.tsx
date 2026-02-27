'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mail, MailOpen, Trash2, Loader2, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: number;
  created_at: number;
}

export function AdminContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const data = await api.get<{ messages: ContactMessage[] }>('/admin/contact-messages');
      setMessages(data.messages || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  async function toggleRead(msg: ContactMessage) {
    const newRead = msg.is_read ? 0 : 1;
    await api.patch('/admin/contact-messages', { id: msg.id, is_read: newRead });
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, is_read: newRead } : m))
    );
  }

  async function deleteMessage(id: string) {
    await api.delete(`/admin/contact-messages?id=${id}`);
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  function formatDate(ts: number) {
    return new Date(ts * 1000).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Inbox className="h-12 w-12 mb-3" />
        <p>Henüz iletişim mesajı yok.</p>
      </div>
    );
  }

  const unreadCount = messages.filter((m) => !m.is_read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Toplam {messages.length} mesaj{unreadCount > 0 && `, ${unreadCount} okunmamış`}
        </p>
      </div>

      <div className="space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-lg border p-4 transition-colors ${
              msg.is_read ? 'bg-background' : 'bg-primary/5 border-primary/20'
            }`}
          >
            <div
              className="flex items-start justify-between gap-4 cursor-pointer"
              onClick={() => {
                setExpandedId(expandedId === msg.id ? null : msg.id);
                if (!msg.is_read) toggleRead(msg);
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {!msg.is_read && (
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  )}
                  <span className="font-medium truncate">{msg.subject}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="truncate">{msg.name}</span>
                  <span>·</span>
                  <span className="truncate">{msg.email}</span>
                  <span>·</span>
                  <span className="whitespace-nowrap">{formatDate(msg.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRead(msg);
                  }}
                  title={msg.is_read ? 'Okunmadı olarak işaretle' : 'Okundu olarak işaretle'}
                >
                  {msg.is_read ? (
                    <MailOpen className="h-4 w-4" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMessage(msg.id);
                  }}
                  title="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {expandedId === msg.id && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`mailto:${msg.email}?subject=Re: ${msg.subject}`, '_blank')}
                  >
                    <Mail className="h-3.5 w-3.5 mr-1.5" />
                    Yanıtla
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
