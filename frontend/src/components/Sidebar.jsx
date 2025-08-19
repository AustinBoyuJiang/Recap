import React, { useState } from 'react';
import CustomSelect from './CustomSelect';
import ArticleViewer from './ArticleViewer';
import './Sidebar.css';

const Sidebar = ({ selectedSubject, onSubjectChange, currentView, onViewChange, onArticleView }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(['languages']); // 默认展开外语类
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showUrlForm, setShowUrlForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('system');
  const [articleData, setArticleData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  // 初始化夜间模式
  React.useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
  }, []);

  // 从后端加载文档
  React.useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await fetch('https://recap.apps.austinjiang.com/documents');
        if (response.ok) {
          const data = await response.json();
          // 确保所有加载的文档都有available属性
          const documentsWithAvailable = (data.documents || []).map(doc => ({
            ...doc,
            available: doc.available !== undefined ? doc.available : true
          }));
          setUploadedDocuments(documentsWithAvailable);
        }
      } catch (error) {
        console.error('加载文档失败:', error);
      }
    };

    loadDocuments();
  }, []);



  const subjects = {
    core: {
      title: '核心学科',
      icon: '📚',
      subjects: [
        {
          id: 'chinese',
          name: '语文',
          icon: '📝',
          available: false,
          description: '语文阅读理解、写作指导'
        },
        {
          id: 'math',
          name: '数学',
          icon: '🔢',
          available: false,
          description: '数学解题、概念讲解'
        },
        {
          id: 'physics',
          name: '物理',
          icon: '⚛️',
          available: false,
          description: '物理概念、实验分析'
        },
        {
          id: 'chemistry',
          name: '化学',
          icon: '🧪',
          available: false,
          description: '化学反应、元素周期表'
        },
        {
          id: 'biology',
          name: '生物',
          icon: '🧬',
          available: false,
          description: '生物知识、生命科学'
        }
      ]
    },
    languages: {
      title: '外语学习',
      icon: '🌍',
      subjects: [
        {
          id: 'english',
          name: '英语',
          icon: '🇺🇸',
          available: true,
          description: '英语对话练习、语法学习'
        },
        {
          id: 'french',
          name: '法语',
          icon: '🇫🇷',
          available: false,
          description: '法语对话练习'
        },
        {
          id: 'spanish',
          name: '西班牙语',
          icon: '🇪🇸',
          available: false,
          description: '西班牙语对话练习'
        },
        {
          id: 'japanese',
          name: '日语',
          icon: '🇯🇵',
          available: false,
          description: '日语对话练习'
        },
        {
          id: 'german',
          name: '德语',
          icon: '🇩🇪',
          available: false,
          description: '德语对话练习'
        }
      ]
    },
    documents: {
      title: '自定义内容',
      icon: '📄',
      subjects: uploadedDocuments
    }
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getCurrentSubject = () => {
    for (const category of Object.values(subjects)) {
      const subject = category.subjects.find(s => s.id === selectedSubject);
      if (subject) return subject;
    }
    return null;
  };

  // 保存文档到后端
  const saveDocumentToBackend = async (document) => {
    try {
      const response = await fetch('https://recap.apps.austinjiang.com/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(document),
      });

      if (!response.ok) {
        throw new Error('保存文档失败');
      }
    } catch (error) {
      console.error('保存文档到后端失败:', error);
    }
  };

  // 处理文件上传
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      const newDocument = {
        id: `doc_${Date.now()}`,
        name: file.name.replace('.pdf', ''),
        icon: '📄',
        available: true,
        description: `PDF文档 - ${file.name}`,
        type: 'pdf'
      };

      // 保存到后端
      await saveDocumentToBackend(newDocument);

      // 更新前端状态
      setUploadedDocuments(prev => [...prev, newDocument]);
      setShowUploadForm(false);
      // 重置文件输入
      event.target.value = '';
    } else {
      alert('请上传PDF文件');
    }
  };

  // 处理网址添加
  const handleUrlSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const url = formData.get('url');

    if (url) {
      setIsLoading(true);

      try {
        const response = await fetch('https://recap.apps.austinjiang.com/scrape-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url, name: '' }), // name将由后端生成
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || '爬取失败');
        }

        const scrapedData = await response.json();

        // 添加到文档列表，使用后端生成的智能标题
        const newDocument = {
          id: `url_${Date.now()}`,
          name: scrapedData.name, // 使用LLM生成的标题
          icon: '🔗',
          available: true,
          description: `网址链接 - ${url}`,
          type: 'url',
          url: url,
          articleData: scrapedData // 保存文章数据
        };

        // 保存到后端
        await saveDocumentToBackend(newDocument);

        // 更新前端状态
        setUploadedDocuments(prev => [...prev, newDocument]);

        // 切换到主窗口显示内容，而不是悬浮窗
        if (onArticleView) {
          onArticleView(scrapedData);
        }

        // 关闭表单
        setShowUploadForm(false);
        setShowUrlForm(false);
        event.target.reset();

      } catch (error) {
        console.error('爬取网页失败:', error);
        alert(`爬取失败: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // 删除文档
  const handleDeleteDocument = async (docId) => {
    try {
      const response = await fetch(`https://recap.apps.austinjiang.com/documents/${docId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // 从前端状态中移除
        setUploadedDocuments(prev => prev.filter(doc => doc.id !== docId));
      } else {
        throw new Error('删除文档失败');
      }
    } catch (error) {
      console.error('删除文档失败:', error);
      alert('删除文档失败，请稍后重试');
    }
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="app-title" title="考前必备，因材施教。记忆规划，对症下药！">
          {!isCollapsed && (
            <>
              <div className="app-icon">🎓</div>
              <div className="app-info">
                <h2>Recap记忆规划</h2>
                <p>Memory Planning System</p>
              </div>
            </>
          )}
          <div className="app-slogan">
            考前必备，因材施教；<br />记忆规划，对症下药！
          </div>
        </div>

        <button
          className="collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="subjects-section">
            {Object.entries(subjects).map(([categoryId, category]) => (
              <div key={categoryId} className="subject-category">
                <div
                  className="category-header"
                  onClick={() => toggleCategory(categoryId)}
                >
                  <div className="category-info">
                    <span className="category-icon">{category.icon}</span>
                    <span className="category-title">{category.title}</span>
                  </div>
                  <div className={`expand-icon ${expandedCategories.includes(categoryId) ? 'expanded' : ''}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                {expandedCategories.includes(categoryId) && (
                  <div className="subjects-list">
                    {/* 如果是documents category，先显示上传按钮 */}
                    {categoryId === 'documents' && (
                      <div className="upload-section">
                        <button
                          className="upload-btn"
                          onClick={() => setShowUploadForm(!showUploadForm)}
                        >
                          <span className="upload-icon">➕</span>
                          <span>上传学习资料</span>
                        </button>

                        {showUploadForm && (
                          <div className="upload-form">
                            <div className="upload-options">
                              <label className="file-upload-btn">
                                <input
                                  type="file"
                                  accept=".pdf"
                                  onChange={handleFileUpload}
                                  style={{ display: 'none' }}
                                />
                                <span className="upload-icon">📄</span>
                                <span>上传PDF</span>
                              </label>

                              <div className="url-button-container">
                                <button
                                  className="url-link-btn"
                                  onClick={() => setShowUrlForm(!showUrlForm)}
                                >
                                  <span className="upload-icon">🔗</span>
                                  <span>添加网址链接</span>
                                </button>

                                {showUrlForm && (
                                  <div className="url-form-dropdown">
                                    <form onSubmit={handleUrlSubmit}>
                                      <input
                                        type="url"
                                        name="url"
                                        placeholder="输入网址链接"
                                        required
                                        className="url-input"
                                      />
                                      <button
                                        type="submit"
                                        className="url-submit-btn"
                                        disabled={isLoading}
                                      >
                                        <span className="upload-icon">
                                          {isLoading ? '⏳' : '🔗'}
                                        </span>
                                        <span>
                                          {isLoading ? '爬取中...' : '添加链接'}
                                        </span>
                                      </button>
                                    </form>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 渲染subjects */}
                    {category.subjects.map((subject) => (
                      <div
                        key={subject.id}
                        className={`subject-item ${selectedSubject === subject.id ? 'active' : ''} ${!subject.available ? 'disabled' : ''}`}
                        onClick={() => {
                          if (subject.available) {
                            // 如果是文档类型，显示文章内容
                            if (subject.type === 'url' && subject.articleData && onArticleView) {
                              onSubjectChange(subject.id); // 设置选中状态
                              onArticleView(subject.articleData);
                            } else {
                              onSubjectChange(subject.id);
                              // 如果当前在记忆图谱页面，切换到聊天学习
                              if (currentView === 'graph') {
                                onViewChange('chat');
                              }
                            }
                          }
                        }}
                      >
                        <div className="subject-icon">{subject.icon}</div>
                        <div className="subject-info">
                          <div className="subject-name">{subject.name}</div>
                          <div className="subject-description">{subject.description}</div>
                        </div>
                        {selectedSubject === subject.id && (
                          <div className="active-indicator">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                        {!subject.available && (
                          <div className="coming-soon">即将推出</div>
                        )}
                        {/* 为documents添加删除按钮 */}
                        {categoryId === 'documents' && (
                          <button
                            className="delete-doc-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDocument(subject.id);
                            }}
                            title="删除文档"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="sidebar-footer">
            <div className="view-switcher">
              {/* 当前视图显示 */}
              <div className="current-view">
                <span className="current-view-icon">
                  {currentView === 'chat' ? '💬' : '📊'}
                </span>
                <span className="current-view-name">
                  {currentView === 'chat' ? '聊天学习' : currentView === 'article' ? '阅读学习' : '记忆图谱'}
                </span>
                <span className="expand-indicator">⌃</span>
              </div>

              {/* 悬停时展开的选项 */}
              <div className="view-options">
                {currentView === 'article' ? (
                  // 在文章视图时显示记忆图谱选项
                  <button
                    className="view-option"
                    onClick={() => onViewChange('graph')}
                  >
                    <span className="view-icon">📊</span>
                    <span className="view-name">记忆图谱</span>
                  </button>
                ) : (
                  // 在聊天或图谱视图时显示切换选项
                  <button
                    className="view-option"
                    onClick={() => onViewChange(currentView === 'chat' ? 'graph' : 'chat')}
                  >
                    <span className="view-icon">
                      {currentView === 'chat' ? '📊' : '💬'}
                    </span>
                    <span className="view-name">
                      {currentView === 'chat' ? '记忆图谱' : '聊天学习'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* 用户区域 */}
            <div className="user-section">
              <div className="user-info">
                <div className="user-avatar">
                  <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=Nolan" alt="用户头像" />
                </div>
                <div className="user-details">
                  <div className="user-name">Austin Jiang</div>
                  <div className="user-status">在线</div>
                </div>
                <div className="user-menu-indicator">⋯</div>
              </div>

              {/* 悬停时展开的用户菜单 */}
              <div className="user-menu">
                <button
                  className="user-menu-item"
                  onClick={() => setShowSettings(true)}
                >
                  <span className="menu-icon">⚙️</span>
                  <span className="menu-text">设置</span>
                </button>
                <button
                  className="user-menu-item"
                  onClick={() => console.log('登出功能暂未实现')}
                >
                  <span className="menu-icon">🚪</span>
                  <span className="menu-text">Sign out</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 设置弹窗 */}
      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <h2>设置</h2>
              <button
                className="close-btn"
                onClick={() => setShowSettings(false)}
              >
                ✕
              </button>
            </div>

            <div className="settings-body">
              {/* 左侧导航栏 */}
              <div className="settings-sidebar">
                <div className="settings-nav">
                  <button
                    className={`nav-item ${settingsTab === 'system' ? 'active' : ''}`}
                    onClick={() => setSettingsTab('system')}
                  >
                    <span className="nav-icon">⚙️</span>
                    <span>系统设置</span>
                  </button>
                  <button
                    className={`nav-item ${settingsTab === 'account' ? 'active' : ''}`}
                    onClick={() => setSettingsTab('account')}
                  >
                    <span className="nav-icon">👤</span>
                    <span>账号设置</span>
                  </button>
                </div>
              </div>

              {/* 右侧内容区域 */}
              <div className="settings-content">
                {settingsTab === 'system' && (
                  <>
                    <div className="settings-section">
                      <h3>学习偏好</h3>
                      <div className="setting-item">
                        <label>
                          <input type="checkbox" defaultChecked />
                          <span>启用智能提醒</span>
                        </label>
                      </div>
                      <div className="setting-item">
                        <label>
                          <input type="checkbox" defaultChecked />
                          <span>自动保存学习进度</span>
                        </label>
                      </div>
                      <div className="setting-item">
                        <label>
                          <input
                            type="checkbox"
                            checked={isDarkMode}
                            onChange={(e) => {
                              const newDarkMode = e.target.checked;
                              setIsDarkMode(newDarkMode);
                              document.body.classList.toggle('dark-mode', newDarkMode);
                              localStorage.setItem('darkMode', newDarkMode.toString());
                            }}
                          />
                          <span>开启夜间模式</span>
                        </label>
                      </div>
                    </div>

                    <div className="settings-section">
                      <h3>语言设置</h3>
                      <div className="setting-item">
                        <label>界面语言</label>
                        <CustomSelect
                          options={[
                            { value: 'zh-CN', label: '简体中文' },
                            { value: 'en-US', label: 'English' },
                            { value: 'ja-JP', label: '日本語' }
                          ]}
                          defaultValue="zh-CN"
                          onChange={(e) => console.log('语言切换:', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="settings-section">
                      <h3>通知设置</h3>
                      <div className="setting-item">
                        <label>
                          <input type="checkbox" defaultChecked />
                          <span>学习提醒</span>
                        </label>
                      </div>
                      <div className="setting-item">
                        <label>
                          <input type="checkbox" />
                          <span>复习提醒</span>
                        </label>
                      </div>
                      <div className="setting-item">
                        <label>提醒时间</label>
                        <input type="time" defaultValue="09:00" />
                      </div>
                    </div>

                    <div className="settings-section">
                      <h3>数据管理</h3>
                      <div className="setting-item">
                        <button className="danger-btn">清除所有学习数据</button>
                      </div>
                      <div className="setting-item">
                        <button className="secondary-btn">导出学习报告</button>
                      </div>
                    </div>
                  </>
                )}

                {settingsTab === 'account' && (
                  <>
                    <div className="settings-section">
                      <h3>个人信息</h3>
                      <div className="setting-item">
                        <label>用户名</label>
                        <input type="text" defaultValue="Austin Jiang" />
                      </div>
                      <div className="setting-item">
                        <label>邮箱地址</label>
                        <input type="email" defaultValue="austin@example.com" />
                      </div>
                      <div className="setting-item">
                        <label>学习目标</label>
                        <CustomSelect
                          options={[
                            { value: 'beginner', label: '初学者' },
                            { value: 'intermediate', label: '中级' },
                            { value: 'advanced', label: '高级' }
                          ]}
                          defaultValue="intermediate"
                          onChange={(e) => console.log('学习目标切换:', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="settings-section">
                      <h3>安全设置</h3>
                      <div className="setting-item">
                        <button className="secondary-btn">修改密码</button>
                      </div>
                      <div className="setting-item">
                        <label>
                          <input type="checkbox" defaultChecked />
                          <span>启用两步验证</span>
                        </label>
                      </div>
                    </div>

                    <div className="settings-section">
                      <h3>隐私设置</h3>
                      <div className="setting-item">
                        <label>
                          <input type="checkbox" defaultChecked />
                          <span>允许数据分析</span>
                        </label>
                      </div>
                      <div className="setting-item">
                        <label>
                          <input type="checkbox" />
                          <span>接收营销邮件</span>
                        </label>
                      </div>
                    </div>

                    <div className="settings-section">
                      <h3>账号管理</h3>
                      <div className="setting-item">
                        <button className="danger-btn">删除账号</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="settings-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowSettings(false)}
              >
                取消
              </button>
              <button
                className="save-btn"
                onClick={() => {
                  console.log('保存设置（暂无效果）');
                  setShowSettings(false);
                }}
              >
                保存设置
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default Sidebar;