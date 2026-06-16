'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './page.module.css';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/hooks/useChat';
import ChatBubble from '@/components/ChatBubble';

export default function SquadChatPage() {
  const params = useParams();
  const router = useRouter();
  const squadId = params.id as string;
  const { user } = useAuth();
  
  const { messages, loading, error, hasMore, isLoadingMore, loadMore, sendMessage } = useChat({ squadId });
  const [inputText, setInputText] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive (only if already near bottom)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Scroll to bottom on initial load or when a new message arrives
    if (!loading && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, loading]);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    
    // If scrolled to top, trigger loadMore
    if (chatContainerRef.current.scrollTop === 0 && hasMore && !isLoadingMore) {
      loadMore();
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const currentText = inputText;
    setInputText(''); // optimistic clear
    
    try {
      await sendMessage(currentText);
      scrollToBottom();
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
      setInputText(currentText); // restore if failed
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className={styles.centerState}>
        <div className={styles.spinner}></div>
        <p>Loading squad chat...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centerState}>
        <div className={styles.errorIcon}>⚠️</div>
        <h2>Access Denied</h2>
        <p>{error}</p>
        <button className={styles.backBtn} onClick={() => router.push(`/squad/${squadId}`)}>
          Back to Squad
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push(`/squad/${squadId}`)}>
          ← Back
        </button>
        <h1 className={styles.title}>Squad Chat</h1>
        <div className={styles.liveIndicator}>
          <span className={styles.pulse}></span>
          Live
        </div>
      </header>

      <div className={styles.chatArea} ref={chatContainerRef} onScroll={handleScroll}>
        {isLoadingMore && (
          <div className={styles.loadingMore}>Loading older messages...</div>
        )}
        
        {messages.length === 0 ? (
          <div className={styles.emptyChat}>
            <span className={styles.emptyIcon}>💬</span>
            <p>No messages yet.</p>
            <span>Say hello to your squad!</span>
          </div>
        ) : (
          <div className={styles.messageList}>
            {messages.map(msg => (
              <ChatBubble 
                key={msg.id} 
                message={msg} 
                isOwn={msg.sender_id === user?.id} 
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className={styles.inputArea}>
        <form onSubmit={handleSend} className={styles.inputForm}>
          <input 
            type="text" 
            className={styles.textInput}
            placeholder="Type your message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            maxLength={1000}
          />
          <button 
            type="submit" 
            className={styles.sendBtn}
            disabled={!inputText.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
