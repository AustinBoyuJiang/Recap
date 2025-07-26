import memory
import article_memory
import agent
import json
import asyncio
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

clients = set()

# 存储上传的文档
uploaded_documents = []


def safe_async_call(coro):
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(coro)  # 当前在 async 中
    except RuntimeError:
        asyncio.run(coro)  # 当前在 sync 中


@app.get("/chat/history")
async def get_chat_history():
    """获取聊天历史记录"""
    # 过滤掉系统消息和测试消息，只返回用户和助手的对话
    chat_history = [
        msg for msg in agent.history 
        if msg["role"] in ["user", "assistant"] 
        and msg["content"] != "连接测试"
        and not msg["content"].startswith("SYSTEM:")
    ]
    return {"history": chat_history}

@app.post("/chat/clear")
async def clear_chat_history():
    """清除聊天历史记录"""
    # 保留系统消息，清除用户和助手的对话
    agent.history = [msg for msg in agent.history if msg["role"] == "system"]
    return {"message": "Chat history cleared"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except:
        clients.remove(websocket)


async def send_to_frontend():
    try:
        data = memory.query()
        text = json.dumps(data)
        for ws in clients.copy():
            try:
                await ws.send_text(text)
            except:
                clients.remove(ws)
    except Exception as e:
        print("send_to_frontend error:", e)


class MemoryInput(BaseModel):
    sentence: str
    grade: int


@app.post("/update/")
def update_route(data: MemoryInput):
    memory.update(data.sentence, data.grade)
    safe_async_call(send_to_frontend())
    return {"message": "ok"}


@app.get("/query/")
def query_route():
    return memory.query()


@app.post("/init/")
def init_route():
    memory.nodes = [{}, {}, {}, {}]
    memory.history = []
    memory.retention_queue = memory.SortedSet()
    safe_async_call(send_to_frontend())
    return {"message": "ok"}


class ChatInput(BaseModel):
    message: str
    user_involved: bool
    reset_history: bool = False


class UrlInput(BaseModel):
    url: str
    name: str


class SummaryInput(BaseModel):
    content: str
    title: str


class DocumentInput(BaseModel):
    id: str
    name: str
    icon: str
    description: str
    type: str
    url: str = None
    articleData: dict = None


class ArticleKnowledgeGraphInput(BaseModel):
    title: str
    content: str
    document_id: str


class ArticleMemoryUpdateInput(BaseModel):
    item: str
    grade: int
    document_id: str


@app.post("/chat")
def chat(input: ChatInput):
    # 如果是连接测试，直接返回成功响应，不添加到history
    if not input.user_involved and input.message == "连接测试":
        if input.reset_history:
            # 保留系统消息，清除用户和助手的对话
            agent.history = [msg for msg in agent.history if msg["role"] == "system"]
        return {
            "output": "连接成功",
            "highlight_words": []
        }
    
    # 如果是系统启动对话消息，处理但不添加到history
    if not input.user_involved and input.message.startswith("SYSTEM:"):
        if input.reset_history:
            # 保留系统消息，清除用户和助手的对话
            agent.history = [msg for msg in agent.history if msg["role"] == "system"]
        # 对于系统启动消息，不添加到history，直接处理
        pass
    else:
        # 只有真正的用户消息才添加到history
        if input.user_involved:
            res = agent.judge(
                ai_message=agent.history[-1]["content"],
                user_reply=input.message
            )
            print(f"AI understanding [评分{res['ai_understanding']}]:", agent.history[-1]["content"])
            print(f"User quality [评分{res['user_quality']}]:", input.message)
            memory.update(agent.history[-1]["content"], res["ai_understanding"])
            memory.update(input.message, res["user_quality"])
            safe_async_call(send_to_frontend())

        agent.history.append({"role": "user", "content": input.message})
    retention_queue = memory.query()["retention_queue"]
    print("Retention queue:", retention_queue)

    highlighted_words = retention_queue[:]

    if highlighted_words:
        cue_str = ", ".join(highlighted_words)
        system_prompt = (
            "You are an educational assistant helping a student improve their English. "
            f"The student is currently focusing on these important vocabulary words or morphemes: {cue_str}. "
            "Make a strong effort to use these words in your responses. "
            "If the student's message isn't directly related to these words, find a way to connect the conversation to \
            them through examples, associations, or transitions."
            "Encourage the student to use them in context."
            "Do not ask students what topic they want. You decide what to study next."
        )
    else:
        system_prompt = (
            "You are an educational assistant helping a student improve their English. "
            "The student hasn’t selected specific vocabulary topics yet. "
            "Come up with a set of useful and engaging vocabulary themes (e.g., food, hobbies, travel, emotions) "
            "and guide the conversation naturally to introduce and reinforce those words. "
            "Encourage the student to use them in context as they respond."
            "Do not ask students what topic they want. You decide what to study next."
        )

    full_messages = [{"role": "system", "content": system_prompt}] + agent.history

    response = agent.client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=full_messages,
        temperature=0.7
    )

    reply = response.choices[0].message.content
    agent.history.append({"role": "assistant", "content": reply})

    used_keywords = [w for w in highlighted_words if w.lower() in reply.lower()]
    print("Used keywords:", used_keywords)

    return {
        "output": reply,
        "highlight_words": retention_queue  # 或者 retention_queue 中的词汇
    }


def extract_article_content(html_content, base_url):
    """提取网页中的文章内容"""
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # 移除脚本和样式标签
    for script in soup(["script", "style", "nav", "header", "footer", "aside"]):
        script.decompose()
    
    # 尝试找到主要内容区域
    content_selectors = [
        'article', 'main', '.content', '.article', '.post', 
        '.entry-content', '.post-content', '.article-content',
        '[role="main"]', '.main-content'
    ]
    
    main_content = None
    for selector in content_selectors:
        main_content = soup.select_one(selector)
        if main_content:
            break
    
    if not main_content:
        # 如果没找到特定的内容区域，使用body
        main_content = soup.find('body')
    
    if not main_content:
        return {"title": "无法解析", "content": "无法提取网页内容"}
    
    # 提取标题
    title = ""
    title_tag = soup.find('title')
    if title_tag:
        title = title_tag.get_text().strip()
    
    # 如果没有title标签，尝试找h1
    if not title:
        h1_tag = main_content.find('h1')
        if h1_tag:
            title = h1_tag.get_text().strip()
    
    # 提取文本内容
    paragraphs = []
    for element in main_content.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li']):
        text = element.get_text().strip()
        if text and len(text) > 10:  # 过滤掉太短的文本
            paragraphs.append(text)
    
    content = '\n\n'.join(paragraphs)
    
    return {
        "title": title or "未知标题",
        "content": content or "无法提取有效内容"
    }


def generate_smart_title(title, content, url):
    """使用LLM生成智能标题或使用网页标题"""
    try:
        # 如果网页标题合理，直接使用
        if title and len(title.strip()) > 5 and len(title.strip()) < 100:
            # 清理标题，移除网站名称等后缀
            clean_title = title.strip()
            # 移除常见的网站后缀
            suffixes_to_remove = [' - ', ' | ', ' _ ', ' — ']
            for suffix in suffixes_to_remove:
                if suffix in clean_title:
                    clean_title = clean_title.split(suffix)[0].strip()
            
            if len(clean_title) > 5:
                return clean_title
        
        # 如果标题不合理，使用LLM生成
        content_preview = content[:500] if content else ""
        
        system_prompt = (
            "你是一个内容标题生成助手。请根据提供的网页内容生成一个简洁、准确的中文标题。"
            "标题应该：1. 长度在10-30个字符之间 2. 准确概括内容主题 3. 简洁易懂"
            "只返回标题文本，不要其他内容。"
        )
        
        user_prompt = f"网址: {url}\n内容预览: {content_preview}"
        
        response = agent.client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=50
        )
        
        generated_title = response.choices[0].message.content.strip()
        
        # 验证生成的标题
        if generated_title and len(generated_title) > 5 and len(generated_title) < 50:
            return generated_title
        
    except Exception as e:
        print(f"生成标题失败: {e}")
    
    # 如果所有方法都失败，使用URL作为后备
    domain = urlparse(url).netloc
    return f"来自 {domain} 的内容"


@app.post("/scrape-url")
async def scrape_url(input: UrlInput):
    """爬取网页内容"""
    try:
        # 验证URL格式
        parsed_url = urlparse(input.url)
        if not parsed_url.scheme or not parsed_url.netloc:
            raise HTTPException(status_code=400, detail="无效的URL格式")
        
        # 设置请求头，模拟浏览器
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        
        # 发送请求
        response = requests.get(input.url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # 检查内容类型
        content_type = response.headers.get('content-type', '').lower()
        if 'text/html' not in content_type:
            raise HTTPException(status_code=400, detail="URL不是HTML页面")
        
        # 提取内容
        article_data = extract_article_content(response.text, input.url)
        
        # 生成智能标题
        smart_title = generate_smart_title(
            article_data["title"], 
            article_data["content"], 
            input.url
        )
        
        return {
            "success": True,
            "url": input.url,
            "name": smart_title,  # 使用智能生成的标题
            "title": article_data["title"],  # 保留原始标题
            "content": article_data["content"],
            "word_count": len(article_data["content"].split())
        }
        
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=408, detail="请求超时，请检查网络连接")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=503, detail="无法连接到目标网站")
    except requests.exceptions.HTTPError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"HTTP错误: {e.response.status_code}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"爬取失败: {str(e)}")


@app.post("/generate-summary")
async def generate_summary(input: SummaryInput):
    """生成文章摘要"""
    try:
        # 限制内容长度，避免token过多
        content_preview = input.content[:2000] if len(input.content) > 2000 else input.content
        
        system_prompt = (
            "你是一个专业的内容摘要助手。请为提供的文章生成一个简洁、准确的摘要。"
            "摘要要求：1. 长度控制在100-200字之间 2. 突出文章的核心观点和重要信息 "
            "3. 使用简洁明了的语言 4. 保持客观中性的语调"
        )
        
        user_prompt = f"文章标题：{input.title}\n\n文章内容：{content_preview}"
        
        response = agent.client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=300
        )
        
        summary = response.choices[0].message.content.strip()
        
        return {
            "success": True,
            "summary": summary,
            "original_length": len(input.content),
            "summary_length": len(summary)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成摘要失败: {str(e)}")


@app.get("/documents")
async def get_documents():
    """获取所有上传的文档"""
    return {"documents": uploaded_documents}


@app.post("/documents")
async def save_document(document: DocumentInput):
    """保存文档到后端"""
    try:
        # 检查是否已存在相同ID的文档
        existing_doc = next((doc for doc in uploaded_documents if doc["id"] == document.id), None)
        if existing_doc:
            # 更新现有文档
            existing_doc.update(document.dict())
        else:
            # 添加新文档
            uploaded_documents.append(document.dict())
        
        return {"success": True, "message": "文档保存成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存文档失败: {str(e)}")


@app.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    """删除文档"""
    try:
        global uploaded_documents
        uploaded_documents = [doc for doc in uploaded_documents if doc["id"] != document_id]
        return {"success": True, "message": "文档删除成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除文档失败: {str(e)}")


@app.post("/article/create-knowledge-graph")
async def create_article_knowledge_graph(input: ArticleKnowledgeGraphInput):
    """为文章创建知识图谱"""
    try:
        # 创建文章知识图谱
        knowledge_graph = article_memory.create_article_knowledge_graph(
            input.content, 
            input.title,
            input.document_id
        )
        
        return {
            "success": True,
            "document_id": input.document_id,
            "knowledge_graph": knowledge_graph,
            "message": "文章知识图谱创建成功"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建知识图谱失败: {str(e)}")


@app.get("/article/knowledge-graph/{document_id}")
async def get_article_knowledge_graph(document_id: str):
    """获取文章知识图谱"""
    try:
        knowledge_graph = article_memory.query_article_memory()
        suggestions = article_memory.get_article_review_suggestions()
        
        return {
            "success": True,
            "document_id": document_id,
            "knowledge_graph": knowledge_graph,
            "review_suggestions": suggestions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取知识图谱失败: {str(e)}")


@app.post("/article/update-memory")
async def update_article_memory(input: ArticleMemoryUpdateInput):
    """更新文章记忆节点"""
    try:
        # 更新文章记忆
        article_memory.update_article_memory(input.item, input.grade)
        
        # 获取更新后的状态
        knowledge_graph = article_memory.query_article_memory()
        
        return {
            "success": True,
            "document_id": input.document_id,
            "knowledge_graph": knowledge_graph,
            "message": "记忆更新成功"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新记忆失败: {str(e)}")


@app.get("/article/review-suggestions/{document_id}")
async def get_article_review_suggestions(document_id: str):
    """获取文章复习建议"""
    try:
        suggestions = article_memory.get_article_review_suggestions()
        
        return {
            "success": True,
            "document_id": document_id,
            "suggestions": suggestions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取复习建议失败: {str(e)}")
