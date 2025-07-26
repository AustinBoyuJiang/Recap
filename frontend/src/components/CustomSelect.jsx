import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import './CustomSelect.css';

const CustomSelect = ({ options, defaultValue, onChange, className = '', usePortal = false, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(defaultValue);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const selectRef = React.useRef(null);
  
  const handleSelect = (value, label) => {
    setSelectedValue(value);
    setIsOpen(false);
    if (onChange) {
      onChange({ target: { value } });
    }
  };

  // 计算下拉框位置
  const updateDropdownPosition = () => {
    if (selectRef.current && usePortal) {
      const rect = selectRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  };

  // 点击外部关闭下拉框
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 监听滚动和窗口大小变化
  React.useEffect(() => {
    if (isOpen && usePortal) {
      updateDropdownPosition();
      
      const handleScroll = () => updateDropdownPosition();
      const handleResize = () => updateDropdownPosition();
      
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen, usePortal]);

  const selectedOption = options.find(opt => opt.value === selectedValue);

  const handleTriggerClick = () => {
    if (!isOpen && usePortal) {
      updateDropdownPosition();
    }
    setIsOpen(!isOpen);
  };

  const renderDropdown = () => {
    if (!isOpen) return null;

    const dropdown = (
      <div 
        className={`custom-select-options ${usePortal ? 'portal-dropdown' : ''}`}
        style={usePortal ? {
          position: 'fixed',
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
          zIndex: 99999
        } : {}}
      >
        {options.map((option) => (
          <div
            key={option.value}
            className={`custom-select-option ${selectedValue === option.value ? 'selected' : ''}`}
            onClick={() => handleSelect(option.value, option.label)}
          >
            {option.label}
          </div>
        ))}
      </div>
    );

    return usePortal ? createPortal(dropdown, document.body) : dropdown;
  };

  return (
    <div className={`custom-select ${className}`} ref={selectRef} {...props}>
      <div 
        className="custom-select-trigger"
        onClick={handleTriggerClick}
      >
        <span>{selectedOption?.label || '请选择'}</span>
        <span className={`custom-select-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </div>
      {renderDropdown()}
    </div>
  );
};

export default CustomSelect;