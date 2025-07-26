import React, { useState } from 'react';
import ChatHistory from './ChatHistory';
import ChatInput from './ChatInput';
import WelcomeScreen from './WelcomeScreen';
import './ChatBot.css';

const ChatBot = ({ selectedSubject }) => {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // 从后端加载聊天历史记录
    const loadChatHistory = async () => {
        try {
            console.log('从后端加载聊天历史记录...');
            const response = await fetch('http://localhost:8000/chat/history');
            
            if (response.ok) {
                const data = await response.json();
                console.log('加载的历史记录:', data.history);
                
                // 将后端的历史记录转换为前端消息格式
                const formattedMessages = data.history.map((msg, index) => ({
                    id: Date.now() + index,
                    text: msg.content,
                    sender: msg.role === 'user' ? 'user' : 'ai',
                    timestamp: new Date(),
                    highlightWords: msg.role === 'assistant' ? [] : undefined // AI消息可能有高亮词汇
                }));
                
                setMessages(formattedMessages);
                return formattedMessages.length > 0;
            } else {
                console.error('加载历史记录失败:', response.status);
                return false;
            }
        } catch (error) {
            console.error('加载历史记录错误:', error);
            return false;
        }
    };

    // 清除聊天记录并开始新对话
    const clearChatHistory = async () => {
        try {
            console.log('清除后端聊天记录...');
            const response = await fetch('http://localhost:8000/chat/clear', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                console.log('后端聊天记录已清除');
                setMessages([]);
                
                // 开启新对话
                const connectionOk = await testConnection();
                if (connectionOk) {
                    setTimeout(() => {
                        startConversation();
                    }, 500);
                }
            } else {
                console.error('清除聊天记录失败:', response.status);
            }
        } catch (error) {
            console.error('清除聊天记录错误:', error);
        }
    };

    // 测试连接函数
    const testConnection = async () => {
        try {
            console.log('测试连接到后端...');

            const response = await fetch('http://localhost:8000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: "连接测试",
                    user_involved: false,  // 系统测试，用户未参与
                    reset_history: true    // 重置对话历史
                }),
            });

            console.log('连接测试响应状态:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('连接测试成功! 响应数据:', data);
                return true;
            } else {
                const errorText = await response.text();
                console.log('连接测试失败:', errorText);
                return false;
            }
        } catch (error) {
            console.error('连接测试失败:', error);
            return false;
        }
    };

    // AI主动开启对话
    const startConversation = async () => {
        setIsLoading(true);

        try {
            console.log('AI开启对话...');

            const response = await fetch('http://localhost:8000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: "SYSTEM: Start a new English learning conversation. You are an English tutor. Speak only in English. Keep responses under 20 words. Focus on vocabulary building. If user doesn't understand, use simpler words. Start with a friendly greeting.",
                    user_involved: false,  // AI主动开启，用户暂未参与
                    reset_history: true    // 重置对话历史
                }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log('AI开启对话成功:', data);

                // 添加AI的开场消息
                const aiMessage = {
                    id: Date.now(),
                    text: data.output || 'Hello! I\'m your AI language tutor. How can I help you practice English today?',
                    sender: 'ai',
                    timestamp: new Date(),
                    highlightWords: data.highlight_words || data.retention_queue || [] // 需要高亮的词汇
                };

                setMessages([aiMessage]);
            } else {
                console.error('AI开启对话失败');
            }
        } catch (error) {
            console.error('AI开启对话错误:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 组件加载时从后端加载聊天历史记录
    React.useEffect(() => {
        const initializeChat = async () => {
            console.log('初始化聊天，学科:', selectedSubject);
            
            // 先测试连接
            const connectionOk = await testConnection();
            if (!connectionOk) {
                console.error('后端连接失败');
                return;
            }

            // 从后端加载聊天历史记录
            const hasHistory = await loadChatHistory();
            
            // 如果没有历史记录，则开启新对话
            if (!hasHistory) {
                console.log('没有历史记录，开启新对话');
                setTimeout(() => {
                    startConversation();
                }, 1000);
            } else {
                console.log('已加载历史记录');
            }
        };

        initializeChat();
    }, [selectedSubject]); // 当学科改变时重新初始化

    const sendMessage = async (inputMessage) => {
        if (!inputMessage.trim()) return;

        // 添加用户消息到历史记录
        const userMessage = {
            id: Date.now(),
            text: inputMessage,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            console.log('发送请求:', { message: inputMessage });

            // 创建超时控制器
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                console.log('请求超时，正在取消...');
                controller.abort();
            }, 60000); // 60秒超时

            const response = await fetch('http://localhost:8000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: inputMessage,
                    user_involved: true  // 用户参与的对话
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            console.log('HTTP响应状态:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('HTTP错误响应:', errorText);
                throw new Error(`HTTP错误: ${response.status} ${response.statusText}\n${errorText}`);
            }

            const data = await response.json();
            console.log('收到数据:', data);

            // 添加AI回复到历史记录
            const aiMessage = {
                id: Date.now() + 1,
                text: data.output || '抱歉，我没有收到有效回复',
                sender: 'ai',
                timestamp: new Date(),
                highlightWords: data.highlight_words || data.retention_queue || [] // 需要高亮的词汇
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('发送消息失败:', error);

            let errorText = '抱歉，发送消息时出现错误，请稍后重试';

            if (error.name === 'AbortError') {
                errorText = '请求超时（60秒），AI可能正在处理复杂问题，请稍后重试';
            } else if (error.message.includes('Failed to fetch')) {
                errorText = `连接失败！可能的原因：
1. 后端服务未启动（请确认 http://localhost:8000 运行中）
2. CORS配置问题（请在后端添加CORS中间件）
3. 网络连接问题`;
            } else if (error.message.includes('HTTP错误: 500')) {
                errorText = `后端服务器内部错误（500）！请检查：
1. 后端代码是否有语法错误
2. API密钥是否正确配置
3. 查看后端控制台的错误日志`;
            } else if (error.message.includes('HTTP错误')) {
                errorText = `服务器错误: ${error.message}`;
            }

            // 添加错误消息
            const errorMessage = {
                id: Date.now() + 1,
                text: errorText,
                sender: 'ai',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="chatbot-container">
            {messages.length === 0 ? (
                <WelcomeScreen
                    onSendMessage={sendMessage}
                    isLoading={isLoading}
                    selectedSubject={selectedSubject}
                />
            ) : (
                <>
                    <ChatHistory 
                        messages={messages} 
                        isLoading={isLoading} 
                        onClearHistory={clearChatHistory}
                    />
                    <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
                </>
            )}
        </div>
    );
};

export default ChatBot;