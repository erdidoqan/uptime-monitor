'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Pencil, 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  MessageSquare,
  RotateCcw,
  Send
} from 'lucide-react';
import type { IncidentEvent } from '@/shared/types';

// Format date for display
function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isThisYear = date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString('tr-TR', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  if (isThisYear) {
    return date.toLocaleDateString('tr-TR', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Get event icon based on type
function getEventIcon(type: string) {
  switch (type) {
    case 'started':
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case 'resolved':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'auto_resolved':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'comment':
      return <MessageSquare className="w-4 h-4 text-blue-500" />;
    default:
      return <RotateCcw className="w-4 h-4 text-muted-foreground" />;
  }
}

// Get event title
function getEventTitle(event: IncidentEvent): string {
  switch (event.event_type) {
    case 'started':
      if (event.content === 'Incident reopened') {
        return 'Olay yeniden açıldı';
      }
      return 'Olay başladı';
    case 'resolved':
      return 'Olay manuel olarak çözüldü';
    case 'auto_resolved':
      return 'Olay otomatik çözüldü';
    case 'comment':
      return event.user_name || event.user_email || 'Kullanıcı';
    default:
      return 'Olay';
  }
}

// Get icon background color
function getIconBgColor(type: string): string {
  switch (type) {
    case 'started':
      return 'bg-red-50 dark:bg-red-950';
    case 'resolved':
    case 'auto_resolved':
      return 'bg-green-50 dark:bg-green-950';
    case 'comment':
      return 'bg-blue-50 dark:bg-blue-950';
    default:
      return 'bg-muted';
  }
}

interface IncidentTimelineProps {
  incidentId: string;
  initialEvents: IncidentEvent[];
  isResolved: boolean;
}

export function IncidentTimeline({ incidentId, initialEvents, isResolved }: IncidentTimelineProps) {
  const { data: session } = useSession();
  const [events, setEvents] = useState(initialEvents);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Refresh events periodically for real-time updates
  useEffect(() => {
    const fetchEvents = async () => {
      if (!session?.user?.apiToken) return;
      
      try {
        const response = await fetch(`/api/incidents/${incidentId}/events`, {
          headers: {
            'Authorization': `Bearer ${session.user.apiToken}`,
          },
        });
        if (response.ok) {
          const updatedEvents: IncidentEvent[] = await response.json();
          setEvents(updatedEvents);
        }
      } catch (error) {
        console.error('Failed to refresh events:', error);
      }
    };

    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, [incidentId, session?.user?.apiToken]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting || !session?.user?.apiToken) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/incidents/${incidentId}/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.user.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      
      if (!response.ok) throw new Error('Failed to add comment');
      
      const event: IncidentEvent = await response.json();
      setEvents(prev => [event, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStart = (event: IncidentEvent) => {
    setEditingEventId(event.id);
    setEditContent(event.content || '');
  };

  const handleEditCancel = () => {
    setEditingEventId(null);
    setEditContent('');
  };

  const handleEditSave = async (eventId: string) => {
    if (!editContent.trim() || isUpdating || !session?.user?.apiToken) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/incidents/${incidentId}/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.user.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      
      if (!response.ok) throw new Error('Failed to update comment');
      
      const updated: IncidentEvent = await response.json();
      setEvents(prev => prev.map(e => e.id === eventId ? updated : e));
      setEditingEventId(null);
      setEditContent('');
    } catch (error) {
      console.error('Failed to update comment:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!session?.user?.apiToken) return;
    
    try {
      const response = await fetch(`/api/incidents/${incidentId}/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.user.apiToken}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to delete comment');
      
      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const userInitial = session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || 'U';
  const userImage = session?.user?.image;

  return (
    <Card className="border">
      <CardHeader className="px-6 py-5">
        <CardTitle className="text-lg font-semibold">Zaman Çizelgesi</CardTitle>
      </CardHeader>
      
      <CardContent className="px-6 pb-6 pt-0">
        {/* Comment form */}
        <form onSubmit={handleSubmitComment} className="flex gap-4 pb-6 mb-6 border-b">
          {/* User avatar */}
          <div className="flex-shrink-0">
            {userImage ? (
              <Image
                src={userImage}
                alt="Avatarınız"
                width={44}
                height={44}
                className="w-11 h-11 rounded-full object-cover"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                {userInitial.toUpperCase()}
              </div>
            )}
          </div>
          
          {/* Input area */}
          <div className="flex-1 relative">
            <Textarea
              placeholder="Yorum veya post-mortem bırakın. Burada markdown kullanabilirsiniz..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[100px] resize-none pr-20 text-sm"
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="absolute right-3 bottom-3"
              size="sm"
            >
              {isSubmitting ? (
                <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <>
                  Gönder
                  <Send className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Timeline events */}
        <div className="relative">
          {/* Vertical line */}
          {events.length > 1 && (
            <div 
              className="absolute left-[21px] top-[44px] bottom-4 w-px bg-border"
              style={{ height: `calc(100% - 60px)` }}
            />
          )}

          {/* Events list */}
          <div className="space-y-6">
            {events.map((event, index) => {
              const isComment = event.event_type === 'comment';
              const isEditing = editingEventId === event.id;

              return (
                <div key={event.id} className="flex gap-4">
                  {/* Icon/Avatar */}
                  <div className="flex-shrink-0 relative z-10">
                    {isComment && event.user_image ? (
                      <Image
                        src={event.user_image}
                        alt={event.user_name || 'Kullanıcı'}
                        width={44}
                        height={44}
                        className="w-11 h-11 rounded-full object-cover ring-4 ring-background"
                      />
                    ) : isComment ? (
                      <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center ring-4 ring-background">
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {(event.user_name || event.user_email || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    ) : (
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center ring-4 ring-background ${getIconBgColor(event.event_type)}`}>
                        {getEventIcon(event.event_type)}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-2">
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm">
                          {getEventTitle(event)}
                        </span>
                        {isComment && !isEditing && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditStart(event)}
                              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                            >
                              <Pencil className="w-3 h-3" />
                              Düzenle
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(event.id)}
                              className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Kaldır
                            </button>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDateTime(event.created_at)}
                        {event.updated_at && event.updated_at !== event.created_at && (
                          <span className="ml-1">(düzenlendi)</span>
                        )}
                      </span>
                    </div>

                    {/* Content body */}
                    {event.content && (
                      isEditing ? (
                        <div className="flex gap-3 mt-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[80px] resize-none flex-1 text-sm"
                            disabled={isUpdating}
                            autoFocus
                          />
                          <div className="flex flex-col gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleEditSave(event.id)}
                              disabled={!editContent.trim() || isUpdating}
                            >
                              {isUpdating ? (
                                <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                              ) : (
                                'Kaydet'
                              )}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleEditCancel}
                              disabled={isUpdating}
                            >
                              İptal
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className={`text-sm ${isComment ? 'text-foreground bg-muted/60 rounded-lg px-4 py-3 mt-2' : 'text-muted-foreground'}`}>
                          {event.content}
                        </p>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {events.length === 0 && (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Henüz zaman çizelgesi olayı yok</p>
              <p className="text-xs text-muted-foreground mt-1">Sohbeti başlatmak için bir yorum ekleyin</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
