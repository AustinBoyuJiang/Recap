import React from 'react';
import ChatInput from './ChatInput';
import './WelcomeScreen.css';

const WelcomeScreen = ({ onSendMessage, isLoading, selectedSubject }) => {
  const getSubjectInfo = (subjectId) => {
    const subjects = {
      // 核心学科
      chinese: {
        name: '语文',
        icon: '📝',
        greeting: '欢迎来到语文学习！',
        description: '我是你的语文学习助手，可以帮助你提升阅读理解、写作技巧、古诗词鉴赏等能力。',
        suggestions: [
          "帮我分析一首古诗",
          "如何提高作文写作水平？",
          "解释这个文言文句子",
          "推荐一些经典文学作品"
        ]
      },
      math: {
        name: '数学',
        icon: '🔢',
        greeting: '数学世界欢迎你！',
        description: '我是你的数学学习助手，可以帮助你解决数学问题、理解数学概念、掌握解题技巧。',
        suggestions: [
          "解这道方程题",
          "解释微积分的基本概念",
          "如何学好几何证明？",
          "数学公式记忆技巧"
        ]
      },
      physics: {
        name: '物理',
        icon: '⚛️',
        greeting: '探索物理世界的奥秘！',
        description: '我是你的物理学习助手，可以帮助你理解物理概念、分析实验现象、解决物理问题。',
        suggestions: [
          "解释牛顿三大定律",
          "分析这个物理实验",
          "电磁学基础知识",
          "量子物理入门"
        ]
      },
      chemistry: {
        name: '化学',
        icon: '🧪',
        greeting: '化学反应的神奇世界！',
        description: '我是你的化学学习助手，可以帮助你理解化学反应、元素性质、实验操作等。',
        suggestions: [
          "解释这个化学反应",
          "元素周期表规律",
          "有机化学基础",
          "化学实验安全注意事项"
        ]
      },
      biology: {
        name: '生物',
        icon: '🧬',
        greeting: '生命科学的精彩世界！',
        description: '我是你的生物学习助手，可以帮助你了解生命现象、生物结构、生态系统等。',
        suggestions: [
          "细胞结构和功能",
          "DNA和遗传学基础",
          "生态系统的平衡",
          "人体生理系统"
        ]
      },
      // 外语学习
      english: {
        name: '英语',
        icon: '🇺🇸',
        greeting: 'Hello! Ready to practice English?',
        description: '我是你的英语学习助手，可以帮助你提升英语水平。我们可以进行对话练习、语法讲解、词汇学习等。',
        suggestions: [
          "Let's have a casual conversation in English",
          "Can you help me with English grammar?",
          "I want to practice business English",
          "Teach me some common English idioms"
        ]
      },
      french: {
        name: '法语',
        icon: '🇫🇷',
        greeting: 'Bonjour! Prêt à apprendre le français?',
        description: '我是你的法语学习助手，可以帮助你学习法语对话、语法和词汇。',
        suggestions: [
          "Commençons une conversation en français",
          "Aidez-moi avec la grammaire française",
          "Je veux apprendre les salutations",
          "Enseignez-moi des phrases utiles"
        ]
      },
      spanish: {
        name: '西班牙语',
        icon: '🇪🇸',
        greeting: '¡Hola! ¿Listo para aprender español?',
        description: '我是你的西班牙语学习助手，可以帮助你学习西班牙语对话、语法和词汇。',
        suggestions: [
          "Tengamos una conversación en español",
          "Ayúdame con la gramática española",
          "Quiero aprender saludos básicos",
          "Enséñame frases útiles"
        ]
      },
      japanese: {
        name: '日语',
        icon: '🇯🇵',
        greeting: 'こんにちは！日本語を学びましょう！',
        description: '我是你的日语学习助手，可以帮助你学习日语对话、假名和基础语法。',
        suggestions: [
          "日本語で会話しましょう",
          "ひらがなとカタカナを教えて",
          "基本的な挨拶を学びたい",
          "日本語の文法を説明して"
        ]
      },
      german: {
        name: '德语',
        icon: '🇩🇪',
        greeting: 'Hallo! Bereit Deutsch zu lernen?',
        description: '我是你的德语学习助手，可以帮助你学习德语对话、语法和词汇。',
        suggestions: [
          "Lass uns auf Deutsch sprechen",
          "Hilf mir mit deutscher Grammatik",
          "Ich möchte Grüße lernen",
          "Lehre mir nützliche Phrasen"
        ]
      }
    };
    return subjects[subjectId] || subjects.english;
  };

  const subjectInfo = getSubjectInfo(selectedSubject);

  if (isLoading) {
    return (
      <div className="welcome-screen">
        <div className="welcome-content">
          <div className="welcome-header">
            <div className="subject-logo">
              <span className="subject-icon">{subjectInfo.icon}</span>
            </div>
            <h1>正在连接AI导师...</h1>
            <div className="loading-dots">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="welcome-header">
          <div className="subject-logo">
            <span className="subject-icon">{subjectInfo.icon}</span>
          </div>
          <h1>{subjectInfo.greeting}</h1>
          <p>{subjectInfo.description}</p>
        </div>

        <div className="suggestions-grid">
          {subjectInfo.suggestions.map((suggestion, index) => (
            <button
              key={index}
              className="suggestion-card"
              onClick={() => onSendMessage(suggestion)}
              disabled={isLoading}
            >
              <div className="suggestion-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M8 12H16M12 8V16M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span>{suggestion}</span>
            </button>
          ))}
        </div>

        <div className="learning-tips">
          <div className="tip-title">💡 学习小贴士</div>
          <div className="tips-list">
            <div className="tip-item">• 积极与AI互动，提出具体问题</div>
            <div className="tip-item">• 不要害怕犯错，AI会耐心指导</div>
            <div className="tip-item">• 可以要求AI详细解释概念和方法</div>
          </div>
        </div>
      </div>

      <div className="welcome-input">
        <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default WelcomeScreen;