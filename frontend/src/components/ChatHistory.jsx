import React, { useEffect, useRef, useState } from 'react';
import Message from './Message';
import LoadingIndicator from './LoadingIndicator';
import './ChatHistory.css';

const ChatHistory = ({ messages, isLoading, onClearHistory }) => {
  const messagesEndRef = useRef(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="chat-history">
      {messages.length > 0 && onClearHistory && (
        <button
          className="clear-history-btn-fixed"
          onClick={() => setShowConfirmDialog(true)}
          title="清除聊天记录并开始新对话"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          新对话
        </button>
      )}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="welcome-message">
            <p>欢迎使用AI聊天助手！请输入您的问题开始对话。</p>
          </div>
        ) : (
          messages.map((message) => (
            <Message key={message.id} message={message} />
          ))
        )}
        {isLoading && <LoadingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* 确认弹窗 */}
      {showConfirmDialog && (
        <div className="confirm-overlay" onClick={() => setShowConfirmDialog(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-header">
              <h3>开始新对话</h3>
              <button
                className="confirm-close-btn"
                onClick={() => setShowConfirmDialog(false)}
              >
                ✕
              </button>
            </div>
            <div className="confirm-content">
              <p>确定要清除当前聊天记录并开始新对话吗？</p>
              <p className="confirm-warning">此操作无法撤销，所有聊天记录将被永久删除。</p>
            </div>
            <div className="confirm-actions">
              <button
                className="confirm-cancel-btn"
                onClick={() => setShowConfirmDialog(false)}
              >
                取消
              </button>
              <button
                className="confirm-ok-btn"
                onClick={() => {
                  setShowConfirmDialog(false);
                  onClearHistory();
                }}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHistory;