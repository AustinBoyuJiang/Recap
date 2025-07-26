import React from 'react';
import './HighlightedText.css';

const HighlightedText = ({ text, highlightWords = [] }) => {
  if (!highlightWords || highlightWords.length === 0) {
    return <span>{text}</span>;
  }

  // 标准化highlightWords，支持字符串和对象两种格式
  const normalizedWords = highlightWords.map(word => {
    if (typeof word === 'string') {
      return { word, translation: null };
    }
    return word;
  });

  // 词汇词根匹配函数 - 处理常见的词汇变形
  const getWordVariations = (word) => {
    const baseWord = word.toLowerCase();
    const variations = [baseWord];
    
    // 添加复数形式
    variations.push(baseWord + 's');
    variations.push(baseWord + 'es');
    
    // 处理以y结尾的词
    if (baseWord.endsWith('y')) {
      variations.push(baseWord.slice(0, -1) + 'ies');
    }
    
    // 添加进行时形式
    variations.push(baseWord + 'ing');
    if (baseWord.endsWith('e')) {
      variations.push(baseWord.slice(0, -1) + 'ing');
    }
    // 双写最后一个字母 + ing (如: run -> running)
    if (baseWord.length >= 3 && /[aeiou]/.test(baseWord[baseWord.length - 2]) && !/[aeiou]/.test(baseWord[baseWord.length - 1])) {
      variations.push(baseWord + baseWord[baseWord.length - 1] + 'ing');
    }
    
    // 添加过去式形式
    variations.push(baseWord + 'ed');
    if (baseWord.endsWith('e')) {
      variations.push(baseWord + 'd');
    }
    // 双写最后一个字母 + ed
    if (baseWord.length >= 3 && /[aeiou]/.test(baseWord[baseWord.length - 2]) && !/[aeiou]/.test(baseWord[baseWord.length - 1])) {
      variations.push(baseWord + baseWord[baseWord.length - 1] + 'ed');
    }
    // 以y结尾变ied
    if (baseWord.endsWith('y') && baseWord.length > 1 && !/[aeiou]/.test(baseWord[baseWord.length - 2])) {
      variations.push(baseWord.slice(0, -1) + 'ied');
    }
    
    // 添加第三人称单数形式
    if (baseWord.endsWith('y') && baseWord.length > 1 && !/[aeiou]/.test(baseWord[baseWord.length - 2])) {
      variations.push(baseWord.slice(0, -1) + 'ies');
    } else if (baseWord.endsWith('s') || baseWord.endsWith('sh') || baseWord.endsWith('ch') || baseWord.endsWith('x') || baseWord.endsWith('z')) {
      variations.push(baseWord + 'es');
    } else {
      variations.push(baseWord + 's');
    }
    
    return [...new Set(variations)]; // 去重
  };

  // 检查一个词是否匹配任何高亮词汇（包括变形），并返回匹配的词汇对象
  const findWordMatch = (word, normalizedWords) => {
    const wordLower = word.toLowerCase();
    
    return normalizedWords.find(highlightWordObj => {
      const highlightWord = highlightWordObj.word;
      const variations = getWordVariations(highlightWord);
      return variations.includes(wordLower) || 
             // 反向检查：检查当前词是否是高亮词的词根
             getWordVariations(wordLower).includes(highlightWord.toLowerCase());
    });
  };

  // 创建更智能的正则表达式
  const allVariations = [];
  normalizedWords.forEach(wordObj => {
    allVariations.push(...getWordVariations(wordObj.word));
  });
  
  // 去重并转义特殊字符
  const uniqueVariations = [...new Set(allVariations)]
    .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  
  if (uniqueVariations.length === 0) {
    return <span>{text}</span>;
  }

  const wordsPattern = uniqueVariations.join('|');
  const regex = new RegExp(`\\b(${wordsPattern})\\b`, 'gi');
  
  // 分割文本并高亮匹配的词汇
  const parts = text.split(regex);
  
  return (
    <span>
      {parts.map((part, index) => {
        // 检查这个部分是否是需要高亮的词汇（包括变形）
        const matchedWord = part && findWordMatch(part, normalizedWords);
        
        return matchedWord ? (
          <span 
            key={index} 
            className="highlighted-word"
            data-word={matchedWord.word}
            data-translation={matchedWord.translation}
          >
            {part}
            <div className="word-tooltip">
              {matchedWord.translation && (
                <div className="tooltip-translation">{matchedWord.translation}</div>
              )}
              <div className="tooltip-status">已回顾</div>
            </div>
          </span>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </span>
  );
};

export default HighlightedText;