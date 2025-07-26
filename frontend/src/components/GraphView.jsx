import React, { useRef, useEffect, useState } from 'react';
import GraphCanvas from './GraphCanvas';
import GraphControls from './GraphControls';
import RetentionGraph from './RetentionGraph';
import './GraphView.css';

const GraphView = ({ onClose, isArticleMode = false, articleData = null }) => {
    const containerRef = useRef(null);
    const [layers, setLayers] = useState([{}, {}, {}, {}]);
    const [positions, setPositions] = useState({});
    const [selectedNode, setSelectedNode] = useState(null);
    const [selectedLabel, setSelectedLabel] = useState(null);
    const [sentence, setSentence] = useState('');
    const [grade, setGrade] = useState('4');
    const [now, setNow] = useState(Date.now() / 1000);
    const [isLoadingArticleGraph, setIsLoadingArticleGraph] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(Date.now() / 1000);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (isArticleMode && articleData) {
            // 文章模式：创建文章知识图谱
            loadArticleKnowledgeGraph();
        } else {
            // 英语学习模式：加载英语记忆图谱
            loadEnglishMemoryGraph();
        }
    }, [isArticleMode, articleData]);

    // 英语学习模式的WebSocket连接
    useEffect(() => {
        if (!isArticleMode) {
            // 建立WebSocket连接用于英语学习模式的实时更新
            const ws = new WebSocket("ws://localhost:8000/ws");
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data && data.nodes && Array.isArray(data.nodes)) {
                    setLayers(data.nodes);
                    
                    // 如果有选中的节点，自动更新详情窗口
                    if (selectedLabel && typeof selectedLabel === 'string') {
                        const nodeToUpdate = data.nodes.find(
                            layer => layer && selectedLabel in layer
                        );
                        if (nodeToUpdate) {
                            setSelectedNode(nodeToUpdate[selectedLabel]);
                        }
                    }
                } else {
                    console.warn('Invalid WebSocket data structure:', data);
                }
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            
            ws.onclose = () => {
                console.log('WebSocket connection closed');
            };
            
            return () => ws.close();
        }
    }, [isArticleMode, selectedLabel]);

    const loadEnglishMemoryGraph = () => {
        // 首先调用query接口获取初始数据
        fetch('http://localhost:8000/query/')
            .then(res => res.json())
            .then(data => {
                if (data && data.nodes && Array.isArray(data.nodes)) {
                    setLayers(data.nodes);
                } else {
                    console.warn('Invalid initial data structure:', data);
                }
            })
            .catch(err => {
                console.error('Init fetch error:', err);
            });
    };

    const loadArticleKnowledgeGraph = async () => {
        setIsLoadingArticleGraph(true);
        try {
            // 首先创建知识图谱
            const createResponse = await fetch('http://localhost:8000/article/create-knowledge-graph', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: articleData.title,
                    content: articleData.content,
                    document_id: articleData.url
                })
            });

            if (!createResponse.ok) {
                throw new Error('创建知识图谱失败');
            }

            const data = await createResponse.json();
            if (data.knowledge_graph && data.knowledge_graph.nodes) {
                setLayers(data.knowledge_graph.nodes);
            }
        } catch (error) {
            console.error('加载文章知识图谱失败:', error);
            // 如果失败，显示空的图谱
            setLayers([{}, {}, {}, {}]);
        } finally {
            setIsLoadingArticleGraph(false);
        }
    };

    const handleNodeClick = (label, node) => {
        setSelectedNode(node);
        setSelectedLabel(label);
    };

    const handleClose = () => {
        setSelectedNode(null);
        setSelectedLabel(null);
    };

    const handleSubmit = () => {
        if (!sentence.trim()) return;

        if (isArticleMode && articleData) {
            // 文章模式：更新文章记忆
            fetch('http://localhost:8000/article/update-memory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    item: sentence, 
                    grade: parseInt(grade),
                    document_id: articleData.url
                })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.knowledge_graph && data.knowledge_graph.nodes) {
                        setLayers(data.knowledge_graph.nodes);
                    }
                })
                .catch(err => {
                    console.error('Submit error:', err);
                    alert('连接后端失败');
                });
        } else {
            // 英语学习模式：更新英语记忆
            fetch('http://localhost:8000/update/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sentence, grade: parseInt(grade) })
            })
                .catch(err => {
                    console.error('Submit error:', err);
                    alert('连接后端失败');
                });
        }
        
        // 清空输入框
        setSentence('');
    };

    const handleClear = () => {
        if (isArticleMode && articleData) {
            // 文章模式：重新创建知识图谱
            loadArticleKnowledgeGraph();
        } else {
            // 英语学习模式：清除英语记忆
            fetch('http://localhost:8000/init/', { method: 'POST' })
                .catch(err => {
                    console.error('Clear error:', err);
                });
        }
        
        // 清除右侧详情窗口
        setSelectedNode(null);
        setSelectedLabel(null);
    };


    return (
        <div className="graph-modal-overlay" onClick={onClose}>
            <div className="graph-modal" onClick={(e) => e.stopPropagation()}>
                {/* 标题栏 */}
                <div className="graph-modal-header">
                    <h1 className="graph-modal-title">
                        {isArticleMode ? '文章知识图谱' : '我的记忆衰退图谱'}
                    </h1>
                    {isLoadingArticleGraph ? (
                        <div className="graph-loading">
                            <span>⏳ 正在分析文章结构...</span>
                        </div>
                    ) : (
                        <div className="graph-modal-controls">
                            <GraphControls
                                sentence={sentence}
                                setSentence={setSentence}
                                grade={grade}
                                setGrade={setGrade}
                                onSubmit={handleSubmit}
                                onClear={handleClear}
                                inModal={true}
                                placeholder={isArticleMode ? "输入文章中的概念或章节..." : "输入英语句子..."}
                            />
                        </div>
                    )}
                    <button className="graph-modal-close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                {/* 内容区域 */}
                <div className="graph-modal-content">
                    <div className="graph-canvas-container">
                        <GraphCanvas
                            layers={layers}
                            positions={positions}
                            setPositions={setPositions}
                            onNodeClick={handleNodeClick}
                            now={now}
                            containerRef={containerRef}
                            hasNodeDetail={!!selectedNode}
                            isArticleMode={isArticleMode}
                        />
                    </div>

                    {/* 节点详情在canvas内部右侧 */}
                    {selectedNode && (
                        <div className="graph-node-detail">
                            <div className="node-detail-header">
                                <h3>节点详细信息</h3>
                                <button className="node-detail-close" onClick={handleClose}>
                                    ✕
                                </button>
                            </div>
                            <div className="node-detail-content">
                                <p><strong>记忆内容：</strong>"{selectedLabel}"</p>

                                <RetentionGraph node={selectedNode} label={selectedLabel} />

                                <div className="node-summary">
                                    <h4>当前记忆状态</h4>
                                    <ul>
                                        <li><strong>当前记忆保持率：</strong>{(Math.exp(-selectedNode.decay_factor / selectedNode.ease_factor * (now - selectedNode.time_last)) * 100).toFixed(1)}%</li>
                                        <li><strong>复习间隔：</strong>{selectedNode.review_interval.toFixed(1)} 秒</li>
                                        <li><strong>记忆衰退因子：</strong>{selectedNode.decay_factor.toFixed(3)} 每秒</li>
                                        <li><strong>难度因子：</strong>{(1/selectedNode.ease_factor).toFixed(1)} 倍</li>
                                        <li><strong>{selectedNode.time_next > now ? '距离下一次复习还有：' : '已晚复习：'}</strong>{selectedNode.time_next > now ? formatDuration(selectedNode.time_next - now) : formatDuration(now - selectedNode.time_next)}</li>
                                        <li><strong>上一次复习时间：</strong>{formatTimestamp(Object.keys(selectedNode.history || {}).map(Number).sort((a, b) => b - a)[0] || selectedNode.time_last)}</li>
                                    </ul>
                                </div>

                                <div className="node-summary">
                                    <h4>节点数据</h4>
                                    <div className="node-data-container">
                                        <pre>{JSON.stringify(selectedNode, null, 2)}</pre>
                                        <button 
                                            className="copy-data-btn"
                                            onClick={() => {
                                                navigator.clipboard.writeText(JSON.stringify(selectedNode, null, 2))
                                                    .then(() => {
                                                        // 可以添加一个临时的成功提示
                                                        const btn = document.querySelector('.copy-data-btn');
                                                        const originalText = btn.textContent;
                                                        btn.textContent = '✓';
                                                        setTimeout(() => {
                                                            btn.textContent = originalText;
                                                        }, 1000);
                                                    })
                                                    .catch(err => console.error('复制失败:', err));
                                            }}
                                            title="复制节点数据"
                                        >
                                            📋
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// 时间格式转换：秒 → 年/月/天/小时/分钟/秒（仅显示非零单位）
const formatDuration = (seconds) => {
    seconds = Math.floor(seconds);

    const units = [
        { label: ' 年', secs: 31536000 },
        { label: ' 月', secs: 2592000 },
        { label: ' 天', secs: 86400 },
        { label: ' 小时', secs: 3600 },
        { label: ' 分钟', secs: 60 },
        { label: ' 秒', secs: 1 }
    ];

    const parts = [];

    for (const { label, secs } of units) {
        const value = Math.floor(seconds / secs);
        if (value > 0) {
            parts.push(`${value}${label}`);
            seconds -= value * secs;
        }
    }

    return parts.length > 0 ? parts.join(' ') : '刚刚';
};

const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp * 1000);
    const pad = n => n.toString().padStart(2, '0');

    return `${date.getFullYear()} 年 ${pad(date.getMonth() + 1)} 月 ${pad(date.getDate())} 日 `
        + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

export default GraphView;