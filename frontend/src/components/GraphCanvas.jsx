import React, { useEffect, useState, useCallback } from 'react';
import './GraphCanvas.css';

const GraphCanvas = ({
    layers,
    positions,
    setPositions,
    onNodeClick,
    now,
    containerRef,
    hasNodeDetail = false,
    isArticleMode = false
}) => {
    const [transform, setTransform] = useState({ scale: 1, translateX: 0, translateY: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [lastTransform, setLastTransform] = useState({ translateX: 0, translateY: 0 });
    const [canvasSize, setCanvasSize] = useState({ width: 1000, height: 600 });
    const canvasRef = React.useRef(null);

    // 监听容器尺寸变化
    useEffect(() => {
        const updateCanvasSize = () => {
            if (canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                setCanvasSize({
                    width: rect.width || 1000,
                    height: rect.height || 600
                });
            }
        };

        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
        
        // 使用ResizeObserver监听容器尺寸变化
        const resizeObserver = new ResizeObserver(updateCanvasSize);
        if (canvasRef.current) {
            resizeObserver.observe(canvasRef.current);
        }

        return () => {
            window.removeEventListener('resize', updateCanvasSize);
            resizeObserver.disconnect();
        };
    }, []);

    useEffect(() => {
        // 计算节点的基础位置（整体长宽比优化）
        const newPositions = {};
        const canvasWidth = canvasSize.width;
        const canvasHeight = canvasSize.height;
        const targetAspectRatio = 1.0; // 目标长宽比 1:1

        // 布局参数 - 保持合理的depth间距
        const startY = 80;
        const depthSpacing = 100; // 保持depth之间的间距
        const layerSpacing = 25; // 同一depth内层间距
        const nodeWidth = 60;
        const nodeHeight = 60;
        const horizontalSpacing = 80; // 节点间水平间距
        const verticalSpacing = 50; // 同层内换行的垂直间距

        // 按深度分组层并收集所有信息
        const depthGroups = {};
        let totalNodes = 0;

        layers.forEach((layer, layerIndex) => {
            const nodeCount = Object.keys(layer).length;
            if (nodeCount === 0) return;

            totalNodes += nodeCount;
            const depth = layerIndex;
            if (!depthGroups[depth]) {
                depthGroups[depth] = [];
            }
            depthGroups[depth].push({ layer, layerIndex, nodeCount });
        });

        const depthKeys = Object.keys(depthGroups).sort((a, b) => parseInt(a) - parseInt(b));
        const totalDepths = depthKeys.length;

        if (totalDepths === 0) return;

        // 使用二分搜索找到最优的统一每行最大点数
        const findOptimalMaxNodesPerRow = () => {
            // 计算给定每行最大点数下的布局尺寸
            const calculateLayoutSize = (maxNodesPerRow) => {
                let totalHeight = startY;
                let maxWidth = 0;

                depthKeys.forEach((depth, depthIndex) => {
                    const depthLayers = depthGroups[depth];
                    let depthHeight = 0;

                    depthLayers.forEach(({ nodeCount }) => {
                        const nodesPerRow = Math.min(maxNodesPerRow, nodeCount);
                        const rowCount = Math.ceil(nodeCount / nodesPerRow);
                        const layerHeight = (rowCount - 1) * (nodeHeight + verticalSpacing) + nodeHeight;
                        const layerWidth = (nodesPerRow - 1) * (nodeWidth + horizontalSpacing) + nodeWidth;

                        depthHeight = Math.max(depthHeight, layerHeight);
                        maxWidth = Math.max(maxWidth, layerWidth);
                    });

                    totalHeight += depthHeight;
                    if (depthIndex < totalDepths - 1) {
                        totalHeight += depthSpacing;
                    }
                });

                return { totalWidth: maxWidth, totalHeight, aspectRatio: maxWidth / totalHeight };
            };

            // 确定搜索范围 - 扩大上限
            const minNodesPerRow = 2;
            // 大幅增加搜索上限，不严格限制在画布宽度内
            const maxNodesPerRow = Math.max(20, Math.floor((canvasWidth * 1.5) / (nodeWidth + horizontalSpacing)));

            let bestConfig = null;
            let bestScore = -1;

            // 二分搜索找到最接近1:1长宽比的配置
            let left = minNodesPerRow;
            let right = maxNodesPerRow;

            // 搜索所有配置，强烈偏向宽度≥高度的布局
            for (let i = left; i <= right; i++) {
                const layout = calculateLayoutSize(i);

                // 修改评分函数：强烈偏向宽度≥高度
                let score;
                if (layout.aspectRatio >= 1.0) {
                    // 宽度≥高度：正常评分
                    score = 1 / (1 + Math.abs(layout.aspectRatio - targetAspectRatio));
                } else {
                    // 高度>宽度：严重惩罚
                    score = 0.1 / (1 + Math.abs(layout.aspectRatio - targetAspectRatio));
                }

                // 额外奖励更宽的布局
                const widthBonus = Math.min(1.5, layout.totalWidth / 600);
                score *= widthBonus;

                if (score > bestScore) {
                    bestScore = score;
                    bestConfig = { maxNodesPerRow: i, ...layout, score };
                }
            }

            return bestConfig;
        };

        const optimalConfig = findOptimalMaxNodesPerRow();

        // 所有depths统一使用相同的每行最大点数
        const getNodesPerRow = (nodeCount) => {
            return Math.min(optimalConfig.maxNodesPerRow, nodeCount);
        };

        // 应用最优配置进行布局
        let currentY = startY;

        depthKeys.forEach((depth, depthIndex) => {
            const depthLayers = depthGroups[depth];
            const depthStartY = currentY;

            depthLayers.forEach(({ layer, layerIndex, nodeCount }, depthLayerIndex) => {
                const nodeEntries = Object.entries(layer);

                // 使用统一的每行节点数
                const nodesPerRow = getNodesPerRow(nodeCount);

                // 计算这一层需要多少行
                const rowCount = Math.ceil(nodeCount / nodesPerRow);
                const layerStartY = depthStartY + depthLayerIndex * layerSpacing;

                nodeEntries.forEach(([label], nodeIndex) => {
                    const rowIndex = Math.floor(nodeIndex / nodesPerRow);
                    const colIndex = nodeIndex % nodesPerRow;
                    const nodesInThisRow = Math.min(nodesPerRow, nodeCount - rowIndex * nodesPerRow);

                    // 计算这一行的起始X位置（居中）
                    const totalRowWidth = (nodesInThisRow - 1) * (nodeWidth + horizontalSpacing);
                    const rowStartX = (canvasWidth - totalRowWidth) / 2;

                    const nodeX = rowStartX + colIndex * (nodeWidth + horizontalSpacing);
                    const nodeY = layerStartY + rowIndex * (nodeHeight + verticalSpacing);

                    const key = `${layerIndex}-${label}`;
                    newPositions[key] = {
                        x: nodeX,
                        y: nodeY,
                    };
                });

                // 更新当前深度的最大Y位置
                const layerHeight = (rowCount - 1) * (nodeHeight + verticalSpacing) + nodeHeight;
                currentY = Math.max(currentY, layerStartY + layerHeight);
            });

            // 为下一个深度添加间距
            currentY += depthSpacing;
        });

        setPositions(newPositions);
    }, [layers, setPositions, canvasSize]);

    const getRetentionColor = (decay, ease, last) => {
        const retention = Math.exp(-decay / ease * (now - last));
        const clamped = Math.max(0, Math.min(1, retention));
        const r = Math.round(255 * (1 - clamped));
        const g = Math.round(200 * clamped);
        return `rgb(${r},${g},0)`;
    };

    // 正确的围绕鼠标光标缩放 - 考虑CSS变换顺序
    const handleWheel = useCallback((e) => {
        e.preventDefault();

        // 缩放因子 - 更慢的缩放速度
        const scaleFactor = e.deltaY > 0 ? 0.95 : 1.05;
        const newScale = Math.max(0.1, Math.min(3, transform.scale * scaleFactor));

        if (newScale === transform.scale) return; // 只有当缩放值完全相同时才返回

        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 经典的缩放算法 - 最简单最可靠的方法
        const scaleChange = newScale / transform.scale;

        // 计算新的平移量，使鼠标位置保持不变
        const newTranslateX = mouseX - (mouseX - transform.translateX) * scaleChange;
        const newTranslateY = mouseY - (mouseY - transform.translateY) * scaleChange;

        setTransform({
            scale: newScale,
            translateX: newTranslateX,
            translateY: newTranslateY
        });
    }, [transform, containerRef]);

    // 处理鼠标拖拽开始
    const handleMouseDown = useCallback((e) => {
        if (e.target.classList.contains('graph-node')) return; // 不在节点上拖拽
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        setLastTransform({ translateX: transform.translateX, translateY: transform.translateY });
    }, [transform]);

    // 处理鼠标拖拽
    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;

        const newTranslateX = lastTransform.translateX + deltaX;
        const newTranslateY = lastTransform.translateY + deltaY;

        setTransform(prev => ({
            ...prev,
            translateX: newTranslateX,
            translateY: newTranslateY
        }));
    }, [isDragging, dragStart, lastTransform]);

    // 处理鼠标拖拽结束
    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // 添加事件监听器
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('wheel', handleWheel, { passive: false });
        container.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            container.removeEventListener('wheel', handleWheel);
            container.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleWheel, handleMouseDown, handleMouseMove, handleMouseUp]);

    const renderLines = () => {
        const lines = [];
        
        
        try {
            layers.forEach((layer, layerIndex) => {
                if (!layer || typeof layer !== 'object') return;

                Object.entries(layer).forEach(([label, node]) => {
                    if (!node || typeof node !== 'object') return;

                    const fromKey = `${layerIndex}-${label}`;

                    if (!node.next || !Array.isArray(node.next)) return;

                    node.next.forEach((nextItem, index) => {
                        if (!Array.isArray(nextItem) || nextItem.length < 2) return;
                        if (!Array.isArray(nextItem[0]) || nextItem[0].length < 2) return;

                        const [[targetLabel, targetDepth], targetWeight] = nextItem;
                        const toKey = `${targetDepth}-${targetLabel}`;

                        const from = positions[fromKey];
                        const to = positions[toKey];

                        if (from && to) {
                            lines.push(
                                <line
                                    key={`${fromKey}->${toKey}`}
                                    x1={from.x}
                                    y1={from.y}
                                    x2={to.x}
                                    y2={to.y}
                                    stroke="#94a3b8"
                                    strokeWidth={2 / transform.scale}
                                />
                            );
                        }
                    });
                });
            });

        } catch (error) {
            console.error('Error rendering lines:', error);
            return [];
        }
        
        console.log(`renderLines: Generated ${lines.length} lines`);
        return lines;
    };

    return (
        <div
            className="graph-canvas"
            ref={(el) => {
                canvasRef.current = el;
                if (containerRef) {
                    containerRef.current = el;
                }
            }}
            style={{
                cursor: isDragging ? 'grabbing' : 'grab',
                backgroundPosition: `${transform.translateX}px ${transform.translateY}px`,
                backgroundSize: `${40 * transform.scale}px ${40 * transform.scale}px`
            }}
        >
            <div className={`canvas-layer-labels-inside ${hasNodeDetail ? 'with-detail-panel' : ''}`}>
                {isArticleMode ? (
                    <>
                        <div>第1层：文章层</div>
                        <div>第2层：章节层</div>
                        <div>第3层：概念层</div>
                        <div>第4层：细节层</div>
                    </>
                ) : (
                    <>
                        <div>第1层：输入层</div>
                        <div>第2层：单词层</div>
                        <div>第3层：词素层</div>
                        <div>第4层：字母层</div>
                    </>
                )}
            </div>

            <div
                className="graph-viewport"
                style={{
                    transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`
                }}
            >
                <svg
                    className="graph-svg"
                    style={{
                        width: '2000px',
                        height: '2000px',
                        position: 'absolute',
                        top: '0px',
                        left: '0px'
                    }}
                >
                    {renderLines()}
                </svg>
                <div className="graph-container">
                    {layers && Array.isArray(layers) && layers.map((layer, layerIndex) => {
                        // 确保layer存在且为对象
                        if (!layer || typeof layer !== 'object') return null;
                        
                        return (
                            <div className="graph-layer" key={layerIndex}>
                                {Object.entries(layer).map(([label, node]) => {
                                    // 确保node存在且有必要的属性
                                    if (!node || typeof node !== 'object' || 
                                        typeof node.decay_factor !== 'number' ||
                                        typeof node.ease_factor !== 'number' ||
                                        typeof node.time_last !== 'number') {
                                        return null;
                                    }
                                    
                                    const retention = Math.exp(-node.decay_factor / node.ease_factor * (now - node.time_last));
                                    const showGrayRing = retention < 0.6;
                                    const position = positions[`${layerIndex}-${label}`];

                                    return (
                                        <div
                                            key={label}
                                            style={{
                                                position: 'absolute',
                                                left: (position?.x || 0) - 36,
                                                top: (position?.y || 0) - 36,
                                                width: 72,
                                                height: 72,
                                                zIndex: 10,
                                            }}
                                        >
                                            {showGrayRing && (
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        width: 72,
                                                        height: 72,
                                                        borderRadius: '50%',
                                                        border: '2px solid #94a3b8',
                                                        boxSizing: 'border-box',
                                                        pointerEvents: 'none',
                                                        zIndex: 9,
                                                    }}
                                                />
                                            )}

                                            <div
                                                className="graph-node-wrapper"
                                                style={{
                                                    position: 'absolute',
                                                    top: '50%',
                                                    left: '50%',
                                                    transform: 'translate(-50%, -50%)',
                                                    zIndex: 10,
                                                }}
                                            >
                                                <div
                                                    className="graph-node"
                                                    id={`node-${layerIndex}-${label}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (onNodeClick && typeof onNodeClick === 'function') {
                                                            onNodeClick(label, node);
                                                        }
                                                    }}
                                                    style={{
                                                        backgroundColor: getRetentionColor(
                                                            node.decay_factor,
                                                            node.ease_factor,
                                                            node.time_last
                                                        ),
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    {label}
                                                </div>
                                            </div>
                                        </div>
                                    );



                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 缩放控制按钮 */}
            <div className={`zoom-controls ${hasNodeDetail ? 'with-detail-panel' : ''}`}>
                <button
                    className="zoom-btn"
                    onClick={() => {
                        const newScale = Math.min(3, transform.scale * 1.1);
                        setTransform(prev => ({ ...prev, scale: newScale }));
                    }}
                >
                    +
                </button>
                <span className="zoom-level">{Math.round(transform.scale * 100)}%</span>
                <button
                    className="zoom-btn"
                    onClick={() => {
                        const newScale = Math.max(0.1, transform.scale * 0.9);
                        setTransform(prev => ({ ...prev, scale: newScale }));
                    }}
                >
                    -
                </button>
                <button
                    className="zoom-btn reset-btn"
                    onClick={() => setTransform({ scale: 1, translateX: 0, translateY: 0 })}
                >
                    重置
                </button>
            </div>
        </div>
    );
};

export default GraphCanvas;