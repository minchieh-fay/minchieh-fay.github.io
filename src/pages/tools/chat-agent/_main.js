import { AGNES_BASE_URL, initAgnesAuth } from '../_agnes-auth.js';

const state = { messages: [], images: [] };

// 转义模型文本，避免聊天内容被当成 HTML 插入页面
function help_escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character]);
}

// 将图片文件读取为可直接发送给模型的 Data URI
function help_readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('图片读取失败。'));
    reader.readAsDataURL(file);
  });
}

// 初始化聊天会话、图片输入和 Agnes Chat Completions 请求
function initChatAgent(apiKey) {
  const root = document.querySelector('[data-agnes-auth]');
  const messages = root.querySelector('[data-chat-messages]');
  const attachments = root.querySelector('[data-chat-attachments]');
  const form = root.querySelector('[data-chat-form]');
  const input = root.querySelector('[data-chat-input]');
  const imageInput = root.querySelector('[data-chat-image]');
  const error = root.querySelector('[data-chat-error]');
  const submit = root.querySelector('[data-chat-submit]');

  // step.1 渲染当前会话消息和待发送图片
  const render = () => {
    messages.innerHTML = state.messages.map((item) => {
      const content = typeof item.content === 'string' ? item.content : item.text;
      const images = item.images?.map((src) => `<img src="${src}" alt="用户上传的图片" />`).join('') ?? '';
      return `<article class="chat-message chat-message-${item.role}"><div>${help_escapeHtml(content || '')}</div>${images}</article>`;
    }).join('');
    attachments.hidden = state.images.length === 0;
    attachments.innerHTML = state.images.map((src, index) => (
      `<figure><img src="${src}" alt="待发送图片 ${index + 1}" /><button type="button" data-remove-image="${index}" aria-label="移除图片">×</button></figure>`
    )).join('');
    messages.scrollTop = messages.scrollHeight;
  };

  // step.2 读取图片并按选择顺序加入当前用户消息
  const addImages = async (files) => {
    for (const file of files) state.images.push(await help_readImage(file));
    render();
  };

  // step.3 发送文本和图片，保存 assistant 回复形成单一会话
  const sendMessage = async () => {
    const text = input.value.trim();
    if (!text && state.images.length === 0) return;
    const content = [{ type: 'text', text: text || '请描述这张图片。' }];
    state.images.forEach((url) => content.push({ type: 'image_url', image_url: { url } }));
    state.messages.push({ role: 'user', content, text, images: [...state.images] });
    state.images = [];
    input.value = '';
    render();
    submit.disabled = true;
    error.textContent = '';
    try {
      const response = await fetch(`${AGNES_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'agnes-3.0-flash',
          messages: state.messages.map(({ role, content }) => ({ role, content }))
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || '请求失败。');
      state.messages.push({ role: 'assistant', content: result.choices?.[0]?.message?.content || '模型没有返回文本。' });
      render();
    } catch (reason) {
      error.textContent = reason.message || '请求失败，请稍后重试。';
    } finally {
      submit.disabled = false;
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    sendMessage();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  imageInput.addEventListener('change', () => addImages([...imageInput.files]));
  attachments.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-image]');
    if (button) state.images.splice(Number(button.dataset.removeImage), 1);
    render();
  });
  root.querySelector('[data-reset-chat]').addEventListener('click', () => {
    state.messages = [];
    state.images = [];
    error.textContent = '';
    render();
  });
  render();
}

initAgnesAuth(initChatAgent);
