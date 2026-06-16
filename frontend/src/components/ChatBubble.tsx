import React from 'react';
import styles from './ChatBubble.module.css';
import { Message } from '@/types/chat';

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
}

export default function ChatBubble({ message, isOwn }: ChatBubbleProps) {
  // Format the time as HH:MM AM/PM
  const timeString = new Date(message.sent_at).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className={`${styles.bubbleWrapper} ${isOwn ? styles.ownWrapper : styles.otherWrapper}`}>
      {!isOwn && (
        <div className={styles.avatar}>
          {message.sender_name ? message.sender_name.charAt(0).toUpperCase() : '?'}
        </div>
      )}
      
      <div className={`${styles.bubble} ${isOwn ? styles.ownBubble : styles.otherBubble}`}>
        {!isOwn && <div className={styles.senderName}>{message.sender_name}</div>}
        
        <div className={styles.content}>
          {message.content}
        </div>
        
        <div className={styles.meta}>
          <span className={styles.time}>{timeString}</span>
          {isOwn && (
            <span className={styles.readStatus}>
              {message.read_by && message.read_by.length > 0 ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
