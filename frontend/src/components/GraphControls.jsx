import React from 'react';
import CustomSelect from './CustomSelect';
import './GraphControls.css';

const GraphControls = ({ 
    sentence, 
    setSentence, 
    grade, 
    setGrade, 
    onSubmit, 
    onClear,
    inModal = false,
    placeholder = "输入句子"
}) => {
    return (
        <div className="graph-controls">
            <button className="graph-clear" onClick={onClear}>清空记忆</button>
            <input
                type="text"
                value={sentence}
                onChange={(e) => setSentence(e.target.value)}
                placeholder={placeholder}
            />
            <CustomSelect
                className="grade-select"
                options={[
                    { value: '1', label: '1' },
                    { value: '2', label: '2' },
                    { value: '3', label: '3' },
                    { value: '4', label: '4' },
                    { value: '5', label: '5' }
                ]}
                defaultValue={grade}
                onChange={(e) => setGrade(e.target.value)}
                usePortal={inModal}
            />
            <button className="graph-submit" onClick={onSubmit}>解析</button>
        </div>
    );
};

export default GraphControls;