import React from 'react';
import RetentionGraph from './RetentionGraph';
import './NodeDetailModal.css';

const NodeDetailModal = ({ selectedNode, selectedLabel, onClose }) => {
    if (!selectedNode) return null;

    const now = Date.now() / 1000;
    const {
        decay_factor,
        ease_factor,
        time_last,
        time_next,
        review_interval
    } = selectedNode;

    const retention = Math.exp(-decay_factor / ease_factor * (now - time_last));
    const reviewStatus = time_next > now
        ? `距离下一次复习还有：`
        : `已晚复习：`;

    const reviewStatusValue = time_next > now
        ? `${formatDuration(time_next - now)}`
        : `${formatDuration(now - time_next)}`;

    // 提取最近复习时间
    const historyTimestamps = Object.keys(selectedNode.history || {}).map(Number).sort((a, b) => b - a);
    const lastReviewTime = historyTimestamps[0] || time_last;
    const lastReviewFormatted = formatTimestamp(lastReviewTime);


    return (
        <div className="graph-sidebar">
            <button className="close-button" onClick={onClose}>✕</button>
            <h2>节点详细信息</h2>
            <p><strong>记忆内容：</strong>"{selectedLabel}"</p>

            <div className="node-summary">
                <h3>当前记忆状态</h3>
                <ul>
                    <li><strong>当前记忆保持率：</strong>{(retention * 100).toFixed(1)}%</li>
                    <li><strong>复习间隔：</strong>{review_interval.toFixed(1)} 秒</li>
                    <li><strong>记忆衰退因子：</strong>{decay_factor.toFixed(3)} 每秒</li>
                    <li><strong>难度因子：</strong>{(1/ease_factor).toFixed(1)} 倍</li>
                    <li><strong>{reviewStatus}</strong>{reviewStatusValue}</li>
                    <li><strong>上一次复习时间：</strong>{lastReviewFormatted}</li>
                </ul>
            </div>

            <RetentionGraph node={selectedNode} label={selectedLabel} />

            <div className="node-summary">
                <h3>节点数据</h3>
                <pre>{JSON.stringify(selectedNode, null, 2)}</pre>
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


export default NodeDetailModal;