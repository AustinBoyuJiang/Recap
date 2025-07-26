import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ChatBot from './components/ChatBot';
import GraphView from './components/GraphView';
import ArticleViewer from './components/ArticleViewer';
import './App.css';
import './components/GraphView.css';
import './components/GraphCanvas.css';
import './components/GraphControls.css';
import './components/NodeDetailModal.css';
import './components/RetentionGraph.css';

function AppContent() {
  const [selectedSubject, setSelectedSubject] = useState('english');
  const [currentView, setCurrentView] = useState('chat'); // 'chat', 'graph', 'article'
  const [articleData, setArticleData] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  const [showGraphModal, setShowGraphModal] = useState(location.pathname === '/memory-graph');

  // 监听路由变化
  useEffect(() => {
    setShowGraphModal(location.pathname === '/memory-graph');
  }, [location.pathname]);

  const handleSubjectChange = (subjectId) => {
    setSelectedSubject(subjectId);
    
    // 检查是否是文档类型的科目
    const isDocumentSubject = subjectId && (subjectId.startsWith('url_') || subjectId.startsWith('doc_'));
    
    // 如果切换到非文档类型的科目，关闭文章视图
    if (currentView === 'article' && !isDocumentSubject) {
      setArticleData(null);
      setCurrentView('chat');
    }
  };

  const handleViewChange = (view) => {
    if (view === 'graph') {
      setShowGraphModal(true);
      navigate('/memory-graph');
    } else {
      setShowGraphModal(false);
      navigate('/');
    }
  };

  const handleCloseGraph = () => {
    setShowGraphModal(false);
    navigate('/');
  };

  const handleArticleView = (data) => {
    setArticleData(data);
    setCurrentView('article');
    setShowGraphModal(false);
    navigate('/');
  };

  const handleCloseArticle = () => {
    setArticleData(null);
    setCurrentView('chat');
  };

  const renderMainContent = () => {
    if (currentView === 'article' && articleData) {
      return (
        <div className="article-main-view">
          <ArticleViewer 
            articleData={articleData}
            onClose={handleCloseArticle}
          />
        </div>
      );
    }
    return <ChatBot selectedSubject={selectedSubject} />;
  };

  return (
    <div className="App">
      <Sidebar 
        selectedSubject={selectedSubject} 
        onSubjectChange={handleSubjectChange}
        currentView={showGraphModal ? 'graph' : currentView}
        onViewChange={handleViewChange}
        onArticleView={handleArticleView}
      />
      <Routes>
        <Route path="/" element={renderMainContent()} />
        <Route path="/memory-graph" element={renderMainContent()} />
      </Routes>
      
      {/* 悬浮的记忆图谱窗口 */}
      {showGraphModal && (
        <GraphView 
          onClose={handleCloseGraph} 
          isArticleMode={currentView === 'article'}
          articleData={articleData}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
