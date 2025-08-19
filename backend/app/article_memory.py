import time
import math
import agent
import json
from collections import defaultdict
from sortedcontainers import SortedSet


def merge_pairs(pairs):
    counter = defaultdict(int)
    for key, value in pairs:
        counter[key] += value
    return list(counter.items())


def split_article(article_content):
    """
    第1层：将文章分解为主要章节/段落
    """
    system_prompt = (
        "You are a content analysis engine. Given an article, identify and extract the main sections or topics. "
        "Return a Python list of strings, where each string is a concise title (3-8 words) representing a major section or topic in the article. "
        "Focus on the main themes, not minor details. Aim for 3-8 sections maximum. "
        "Example format: ['Introduction to AI', 'Machine Learning Basics', 'Deep Learning Applications', 'Future Challenges']"
    )
    
    # 限制内容长度避免token过多
    content_preview = article_content[:3000] if len(article_content) > 3000 else article_content
    user_message = f"Article content: \"{content_preview}\""

    try:
        response = agent.client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.3
        )

        raw = response.choices[0].message.content.strip()
        sections = eval(raw)
        return [((section, 1), 1.0/len(sections)) for section in sections if isinstance(section, str)]
    except:
        # 如果AI解析失败，使用简单的段落分割
        paragraphs = [p.strip() for p in article_content.split('\n\n') if len(p.strip()) > 100]
        sections = [f"Section {i+1}" for i in range(min(len(paragraphs), 6))]
        return [((section, 1), 1.0/len(sections)) for section in sections]


def split_section(section_title):
    """
    第2层：将章节分解为核心概念
    """
    system_prompt = (
        "You are a knowledge extraction engine. Given a section title from an article, "
        "identify the key concepts, terms, or ideas that would be important for a reader to understand and remember. "
        "Return a Python list of strings, where each string is a specific concept, term, or key idea (1-4 words each). "
        "Focus on concrete, memorable concepts rather than abstract ideas. Aim for 3-6 concepts per section. "
        "Example: For 'Machine Learning Basics' → ['supervised learning', 'neural networks', 'training data', 'algorithms']"
    )
    
    user_message = f"Section title: \"{section_title}\""

    try:
        response = agent.client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.3
        )

        raw = response.choices[0].message.content.strip()
        concepts = eval(raw)
        return [((concept, 2), 1.0/len(concepts)) for concept in concepts if isinstance(concept, str)]
    except:
        # 如果AI解析失败，使用基于标题的简单概念生成
        words = section_title.lower().split()
        key_words = [w for w in words if len(w) > 3 and w not in ['the', 'and', 'for', 'with', 'from']]
        return [((word, 2), 1.0/len(key_words)) for word in key_words[:4]]


def split_concept(concept):
    """
    第3层：将概念分解为具体细节和要点
    """
    system_prompt = (
        "You are a detail extraction engine. Given a concept or term, "
        "identify specific details, facts, characteristics, or sub-components that help explain or define this concept. "
        "Return a Python list of strings, where each string is a specific detail or fact (2-6 words each). "
        "Focus on concrete, factual details rather than general descriptions. Aim for 2-5 details per concept. "
        "Example: For 'neural networks' → ['interconnected nodes', 'weighted connections', 'activation functions', 'backpropagation']"
    )
    
    user_message = f"Concept: \"{concept}\""

    try:
        response = agent.client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.3
        )

        raw = response.choices[0].message.content.strip()
        details = eval(raw)
        return [((detail, 3), 1.0/len(details)) for detail in details if isinstance(detail, str)]
    except:
        # 如果AI解析失败，使用基于概念的简单细节生成
        words = concept.lower().split()
        if len(words) > 1:
            return [((word, 3), 0.5) for word in words if len(word) > 2]
        else:
            return [((f"{concept} definition", 3), 1.0)]


def split_detail(detail):
    """
    第4层：细节层不再进一步分解
    """
    return []


def update_ease_factor(ef, grade, sensitivity=1.5):
    """更新难度因子"""
    delta = sensitivity * (0.3 - (5 - grade) * (0.2 + (5 - grade) * 0.08))
    ef += delta
    return max(ef, 1.3)


# 文章记忆系统的全局变量
retention_threshold = 0.6
decay_factor = math.log(2) / 300  # 文章记忆半衰期设为5分钟，比英语单词更长
article_nodes = [{}, {}, {}, {}]
article_history = []
article_retention_queue = SortedSet()
article_split_functions = [split_article, split_section, split_concept, split_detail]


def new_article_node(item, depth):
    """创建新的文章记忆节点"""
    time_ = time.time()
    retention = 1
    ease_factor = 2.5
    time_last = time_ + math.log(retention) * ease_factor / decay_factor
    review_interval = - math.log(retention_threshold) * ease_factor / decay_factor
    time_next = time_last + review_interval
    article_retention_queue.add((time_next, (item, depth)))
    
    return {
        "retention": retention,
        "time": time_,
        "time_last": time_last,
        "time_next": time_next,
        "decay_factor": decay_factor,
        "ease_factor": ease_factor,
        "review_interval": review_interval,
        "next": article_split_functions[depth](item),
        "history": {
            time_: {
                "time_last": time_last,
                "ease_factor": ease_factor,
            }
        },
    }


def update_article_retention(item, depth):
    """更新文章节点的记忆保持率"""
    article_nodes[depth][item]["time"] = time.time()
    time_ = article_nodes[depth][item]["time"]
    time_last = article_nodes[depth][item]["time_last"]
    decay_factor = article_nodes[depth][item]["decay_factor"]
    ease_factor = article_nodes[depth][item]["ease_factor"]
    article_nodes[depth][item]["retention"] = math.exp(-decay_factor / ease_factor * (time_ - time_last))


def update_article_node(item, grade, weight, depth):
    """更新文章记忆节点"""
    if item not in article_nodes[depth]:
        article_nodes[depth][item] = new_article_node(item, depth)
    
    time_ = time.time()
    time_last = article_nodes[depth][item]["time_last"] + (time_ - article_nodes[depth][item]["time_last"])
    article_nodes[depth][item]["time_last"] = time_last
    ease_factor = update_ease_factor(article_nodes[depth][item]["ease_factor"], grade)
    article_nodes[depth][item]["ease_factor"] = ease_factor
    article_nodes[depth][item]["history"][time_] = {
        "time_last": time_last,
        "ease_factor": ease_factor,
    }
    
    decay_factor = article_nodes[depth][item]["decay_factor"]
    time_next = article_nodes[depth][item]["time_next"]
    article_retention_queue.discard((time_next, (item, depth)))
    review_interval = - math.log(retention_threshold) * ease_factor / decay_factor
    time_next = time_last + review_interval
    article_nodes[depth][item]["review_interval"] = review_interval
    article_nodes[depth][item]["time_next"] = time_next
    article_retention_queue.add((time_next, (item, depth)))
    update_article_retention(item, depth)


def update_article_memory(item, grade, depth=0, weight=1):
    """更新文章记忆系统"""
    if depth == 0:  # 记录文章级别的学习历史
        article_history.append((time.time(), item))
    
    update_article_node(item, grade, weight, depth)
    
    # 递归更新下层节点
    if depth < 3:  # 只到第3层
        for (item_next, depth_next), w in article_nodes[depth][item]["next"]:
            update_article_memory(item_next, grade, depth_next, weight * w)


def update_all_article_retention():
    """更新所有文章节点的记忆保持率"""
    for depth in range(4):
        for item in article_nodes[depth].keys():
            update_article_retention(item, depth)


def query_article_memory():
    """查询文章记忆状态"""
    # 获取需要复习的概念（主要从第2层和第3层）
    queue = [x[1][0] for x in article_retention_queue if
             x[0] < time.time()
             and x[1][1] in {1, 2}  # 章节层和概念层
             and len(x[1][0]) > 2
             ]
    
    return {
        "nodes": article_nodes,
        "retention_queue": queue
    }


def create_article_knowledge_graph(article_content, article_title, document_id=None):
    """为文章创建知识图谱"""
    # 简化处理：使用全局变量，但添加检查避免重复创建
    global article_nodes, article_history, article_retention_queue
    
    # 如果已经存在内容，直接返回
    if any(article_nodes[i] for i in range(4)):
        return query_article_memory()
    
    # 重置文章记忆系统
    article_nodes = [{}, {}, {}, {}]
    article_history = []
    article_retention_queue = SortedSet()
    
    # 创建文章根节点并开始分解
    update_article_memory(article_title, 5)  # 初始评分为5（完全理解）
    
    return query_article_memory()


def get_article_review_suggestions():
    """获取文章复习建议"""
    current_time = time.time()
    suggestions = []
    
    # 获取需要复习的内容
    for time_next, (item, depth) in article_retention_queue:
        if time_next < current_time:
            retention = article_nodes[depth][item]["retention"]
            suggestions.append({
                "item": item,
                "depth": depth,
                "retention": retention,
                "urgency": (current_time - time_next) / 60  # 超时分钟数
            })
    
    # 按紧急程度排序
    suggestions.sort(key=lambda x: -x["urgency"])
    return suggestions[:10]  # 返回最紧急的10个