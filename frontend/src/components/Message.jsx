import React from 'react';
import HighlightedText from './HighlightedText';
import './Message.css';

const Message = ({ message }) => {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`message ${message.sender === 'user' ? 'user-message' : 'ai-message'}`}>
      <div className="message-content">
        <div className="message-avatar">
          {message.sender === 'user' ? (
            'U'
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <div className="message-body">
          <div className="message-text">
            {message.sender === 'ai' && message.highlightWords ? (
              <HighlightedText 
                text={message.text} 
                highlightWords={message.highlightWords} 
              />
            ) : (
              message.text
            )}
          </div>
          <div className="message-time">
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Message;