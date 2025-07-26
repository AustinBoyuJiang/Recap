import React, { useState, useEffect } from 'react';
import GraphView from './GraphView';
import './ArticleViewer.css';

const ArticleViewer = ({ articleData, onClose }) => {
    const [fontSize, setFontSize] = useState(16);
    const [summary, setSummary] = useState('');
    const [showSummary, setShowSummary] = useState(false);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);


    const handleFontSizeChange = (delta) => {
        setFontSize(prev => Math.max(12, Math.min(24, prev + delta)));
    };

    const generateSummary = async () => {
        if (summary) {
            setShowSummary(!showSummary);
            return;
        }

        setIsGeneratingSummary(true);
        try {
            const response = await fetch('http://localhost:8000/generate-summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: articleData.content,
                    title: articleData.title
                }),
            });

            if (!response.ok) {
                throw new Error('生成摘要失败');
            }

            const data = await response.json();
            setSummary(data.summary);
            setShowSummary(true);
        } catch (error) {
            console.error('生成摘要失败:', error);
            alert('生成摘要失败，请稍后重试');
        } finally {
            setIsGeneratingSummary(false);
        }
    };



    const formatContent = (content) => {
        const paragraphs = content.split('\n\n').map((paragraph, index) => (
            <p key={index} className="article-paragraph">
                {paragraph}
            </p>
        ));
        
        // 在文章末尾添加原文链接
        paragraphs.push(
            <div key="article-source" className="article-source-inline">
                <hr className="article-divider" />
                <div className="article-url-inline">
                    <span>原文链接: </span>
                    <a 
                        href={articleData.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="article-link"
                    >
                        {articleData.url}
                    </a>
                </div>
            </div>
        );
        
        return paragraphs;
    };

    if (!articleData) {
        return null;
    }

    return (
        <div className="article-viewer-overlay">
            <div className="article-viewer">
                {/* 头部工具栏 */}
                <div className="article-header">
                    <div className="article-info">
                        <h1 className="article-title">{articleData.title}</h1>
                        <div className="article-meta">
                            <span className="article-source">来源: {articleData.name}</span>
                            <span className="article-word-count">
                                约 {articleData.word_count} 词
                            </span>
                        </div>
                    </div>
                    
                    <div className="article-controls">
                        <div className="font-controls">
                            <button 
                                className="font-btn"
                                onClick={() => handleFontSizeChange(-2)}
                                title="减小字体"
                            >
                                A-
                            </button>
                            <span className="font-size-display">{fontSize}px</span>
                            <button 
                                className="font-btn"
                                onClick={() => handleFontSizeChange(2)}
                                title="增大字体"
                            >
                                A+
                            </button>
                        </div>
                        

                        
                        <button 
                            className="summary-btn"
                            onClick={generateSummary}
                            disabled={isGeneratingSummary}
                            title={summary ? (showSummary ? '隐藏摘要' : '显示摘要') : '生成摘要'}
                        >
                            {isGeneratingSummary ? '⏳ 生成中...' : 
                             summary ? (showSummary ? '📄 隐藏摘要' : '📄 显示摘要') : '📄 生成摘要'}
                        </button>
                        

                        

                    </div>
                </div>

                {/* 摘要区域 */}
                {showSummary && summary && (
                    <div className="article-summary">
                        <h3 className="summary-title">📄 文章摘要</h3>
                        <p className="summary-content">{summary}</p>
                    </div>
                )}

                {/* 文章内容 */}
                <div className="article-content" style={{ fontSize: `${fontSize}px` }}>
                    {formatContent(articleData.content)}
                </div>
            </div>


        </div>
    );
};

export default ArticleViewer;