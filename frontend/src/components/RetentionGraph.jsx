import React, { useEffect, useRef } from 'react';
import './RetentionGraph.css';

const RetentionGraph = ({ node, label }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!node || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        const renderCanvas = () => {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, width, height);

            drawGrid(ctx, width, height);
            drawRetentionCurve(ctx, width, height, node);
            drawCurrentPoint(ctx, width, height, node);
            drawLabels(ctx, width, height, node);
        };

        renderCanvas(); // 初始绘制

        const interval = setInterval(renderCanvas, 1000); // 每秒重绘

        return () => clearInterval(interval); // 卸载时清除定时器
    }, [node, label]);


    const drawGrid = (ctx, width, height) => {
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;

        for (let i = 0; i <= 10; i++) {
            const x = (width * i) / 10;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        for (let i = 0; i <= 10; i++) {
            const y = (height * i) / 10;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Y轴标签
        ctx.fillStyle = '#6b7280';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('100%', 395, height * 0.1 + 4);
        ctx.fillText('复习线 60%', 395, height * 0.42 - 5);
        ctx.fillText('0%', 395, height * 0.9 + 4);

        // 实线 60%
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, height * 0.42);
        ctx.lineTo(width, height * 0.42);
        ctx.stroke();

    };

    const drawRetentionCurve = (ctx, width, height, node) => {
        const { decay_factor, history } = node;
        const now = Date.now() / 1000;

        const timestamps = Object.keys(history)
            .map(t => parseFloat(t))
            .sort((a, b) => a - b);
        if (timestamps.length === 0) return;

        timestamps.push(now);
        const minTime = timestamps[0];
        const maxTime = timestamps[timestamps.length - 1];
        const totalDuration = maxTime - minTime;

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#3b82f6';
        ctx.beginPath();

        for (let i = 0; i < timestamps.length - 1; i++) {
            const tStart = timestamps[i];
            const tEnd = timestamps[i + 1];
            const ease = history[tStart]?.ease_factor || 2.5;
            const time_last = history[tStart]?.time_last || tStart;

            for (let j = 0; j <= 100; j++) {
                const t = tStart + (j / 100) * (tEnd - tStart);
                const R = Math.exp(-decay_factor / ease * (t - time_last));
                const x = ((t - minTime) / totalDuration) * width;
                const y = height - (R * height * 0.8) - height * 0.1;

                if (i === 0 && j === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
        }

        ctx.stroke();

        const nowX = ((now - minTime) / totalDuration) * width;
        ctx.strokeStyle = '#ef4444';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(nowX, 0);
        ctx.lineTo(nowX, height);
        ctx.stroke();
        ctx.setLineDash([]);
    };

    const drawCurrentPoint = (ctx, width, height, node) => {
        const { decay_factor, ease_factor, time_last, history } = node;
        const now = Date.now() / 1000;

        const timestamps = Object.keys(history)
            .map(t => parseFloat(t))
            .sort((a, b) => a - b);

        if (timestamps.length === 0) return;

        const minTime = timestamps[0];
        const totalDuration = now - minTime;

        const currentRetention = Math.exp(-decay_factor / ease_factor * (now - time_last));
        const x = width; // 现在就是最右边
        const y = height - (currentRetention * height * 0.8) - height * 0.1;

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#1f2937';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('当前保持率', x - 10, y - 20);
        ctx.fillText(`${(currentRetention * 100).toFixed(1)}%`, x - 10, y - 6);

        // 虚线：当前保持率水平线
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        ctx.setLineDash([]);

    };

    const drawLabels = (ctx, width, height, node) => {
        ctx.fillStyle = '#374151';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';

        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText('保持率 (%)', 0, 0);
        ctx.restore();

        ctx.textAlign = 'center';
        ctx.fillText('时间', width / 2, height - 5);
        ctx.textAlign = 'right';
        ctx.fillText('现在', width - 5, height - 5);

        const { decay_factor, ease_factor, time_last } = node;
        const now = Date.now() / 1000;
        const timeSinceLastReview = now - time_last;
        const currentRetention = Math.exp(-decay_factor / ease_factor * timeSinceLastReview);

        ctx.fillStyle = '#6b7280';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';

        const info = [
            `衰减因子: ${decay_factor.toFixed(3)}`,
            `难度因子: ${ease_factor.toFixed(2)}`,
            `当前保持率: ${(currentRetention * 100).toFixed(1)}%`,
            `距离上次: ${formatTime(timeSinceLastReview)}`
        ];

        info.forEach((text, index) => {
            ctx.fillText(text, 10, 20 + index * 16);
        });
    };

    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}天 ${hours % 24}小时`;
        } else if (hours > 0) {
            return `${hours}小时 ${minutes}分钟`;
        } else {
            return `${minutes}分钟`;
        }
    };

    if (!node) {
        return <div className="retention-graph-placeholder">选择一个节点查看保持率曲线</div>;
    }

    return (
        <div className="retention-graph">
            <h3 className="retention-graph-title">艾宾浩斯记忆遗忘曲线</h3>
            <canvas
                ref={canvasRef}
                width={400}
                height={300}
                className="retention-canvas"
            />
        </div>
    );
};

export default RetentionGraph;