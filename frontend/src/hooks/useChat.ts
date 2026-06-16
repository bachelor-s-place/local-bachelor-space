import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { Message, GetMessagesResponse } from '@/types/chat';

interface UseChatProps {
  squadId: string;
}

export function useChat({ squadId }: UseChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Use refs to avoid dependency loops in intervals
  const nextCursorRef = useRef(nextCursor);
  const messagesRef = useRef(messages);
  
  useEffect(() => {
    nextCursorRef.current = nextCursor;
    messagesRef.current = messages;
  }, [nextCursor, messages]);

  const fetchMessages = useCallback(async (cursor?: string, isInitial = false) => {
    if (isInitial) setLoading(true);
    setError(null);

    try {
      let url = `/squads/${squadId}/messages?limit=30`;
      if (cursor) url += `&cursor=${cursor}`;

      const res = await apiFetch(url);
      const data = res.data as GetMessagesResponse;
      
      const newMessages = data.messages || [];
      const isPoll = !isInitial && !cursor;

      setMessages(prev => {
        const byId = new Map(prev.map(item => [item.id, item]));
        for (const m of newMessages) byId.set(m.id, m);

        // On a poll we fetch the latest window. Reconcile that window so messages
        // deleted server-side disappear instead of lingering forever. Only touch
        // messages inside the returned window's [oldest, newest] time range — anything
        // newer (e.g. a just-sent optimistic message not yet echoed) is preserved.
        if (isPoll && newMessages.length > 0) {
          const returnedIds = new Set(newMessages.map(m => m.id));
          const times = newMessages.map(m => new Date(m.sent_at).getTime());
          const oldest = Math.min(...times);
          const newest = Math.max(...times);
          for (const m of prev) {
            const t = new Date(m.sent_at).getTime();
            if (t >= oldest && t <= newest && !returnedIds.has(m.id)) {
              byId.delete(m.id);
            }
          }
        }

        return Array.from(byId.values()).sort(
          (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
        );
      });

      // Pagination state (backward cursor + hasMore) must only change on the initial
      // load and on "load older". Polls fetch the newest page and would otherwise
      // clobber the backward cursor, silently breaking "load older".
      if (isInitial) {
        setNextCursor(data.next_cursor);
        setHasMore(!!data.next_cursor);
      } else if (cursor) {
        setNextCursor(data.next_cursor);
        setHasMore(!!data.next_cursor);
      }

    } catch (err: any) {
      if (!isInitial) console.error("Polling error:", err);
      else setError(err.message || 'Failed to load chat');
    } finally {
      if (isInitial) setLoading(false);
      setIsLoadingMore(false);
    }
  }, [squadId]);

  // Initial Fetch & Mark Read
  useEffect(() => {
    if (!squadId) return;
    
    fetchMessages(undefined, true);
    
    // Mark as read when entering chat
    apiFetch(`/squads/${squadId}/messages/read`, { method: 'PUT' }).catch(console.error);
    
  }, [squadId, fetchMessages]);

  // Polling Interval
  useEffect(() => {
    if (!squadId) return;

    const interval = setInterval(() => {
      // Poll for newest messages (no cursor)
      fetchMessages(undefined, false);
      
      // Also mark as read periodically while staying in chat
      apiFetch(`/squads/${squadId}/messages/read`, { method: 'PUT' }).catch(console.error);
    }, 3000);

    return () => clearInterval(interval);
  }, [squadId, fetchMessages]);

  const loadMore = async () => {
    if (!hasMore || isLoadingMore || !nextCursor) return;
    setIsLoadingMore(true);
    await fetchMessages(nextCursor, false);
  };

  const sendMessage = async (content: string) => {
    try {
      const res = await apiFetch(`/squads/${squadId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content, content_type: 'text' })
      });
      
      const newMsg = res.data.message as Message;
      
      // Optimistic append
      setMessages(prev => [...prev, newMsg]);
      return newMsg;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to send message');
    }
  };

  return {
    messages,
    loading,
    error,
    hasMore,
    isLoadingMore,
    loadMore,
    sendMessage
  };
}
