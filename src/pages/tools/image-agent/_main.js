import { AGNES_BASE_URL, initAgnesAuth } from '../_agnes-auth.js';
import {
  help_deleteImageRecord,
  help_listImageRecords,
  help_saveImageRecord
} from './_library.js';

const state = { images: [] };

// 将用户选择或粘贴的图片读取为 Agnes 接受的 Data URI
function help_readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('图片读取失败。'));
    reader.readAsDataURL(file);
  });
}

// 初始化图像编辑器、参考图排序和 Agnes Image Generations 请求
function initImageAgent(apiKey) {
  const root = document.querySelector('[data-agnes-auth]');
  const prompt = root.querySelector('[data-image-prompt]');
  const input = root.querySelector('[data-image-input]');
  const references = root.querySelector('[data-image-references]');
  const result = root.querySelector('[data-image-result]');
  const error = root.querySelector('[data-image-error]');
  const generate = root.querySelector('[data-image-generate]');
  const library = root.querySelector('[data-image-library]');
  const libraryDate = root.querySelector('[data-library-date]');
  const libraryEmpty = root.querySelector('[data-library-empty]');
  let libraryRecords = [];

  // step.1 按日期筛选并渲染本地图片库
  const renderLibrary = () => {
    const selectedDate = libraryDate.value;
    const records = selectedDate === 'all'
      ? libraryRecords
      : libraryRecords.filter((record) => record.date === selectedDate);
    libraryEmpty.hidden = records.length > 0;
    library.innerHTML = records.map((record) => (
      `<article class="library-item"><img src="${record.url}" data-library-image="${record.id}" alt="${record.prompt}" /><button type="button" data-delete-image="${record.id}" aria-label="删除图片">删除</button><p>${record.prompt}</p></article>`
    )).join('');
  };

  // step.2 读取 IndexedDB 记录并生成日期筛选选项
  const loadLibrary = async () => {
    try {
      libraryRecords = await help_listImageRecords();
      const dates = [...new Set(libraryRecords.map((record) => record.date))];
      libraryDate.innerHTML = '<option value="all">全部</option>';
      libraryDate.innerHTML += dates.map((date) => `<option value="${date}">${date}</option>`).join('');
      renderLibrary();
    } catch (reason) {
      libraryEmpty.textContent = `图片库读取失败：${reason.message || '未知错误'}`;
      libraryEmpty.hidden = false;
    }
  };

  // step.3 图片失效时删除记录，删除按钮也走同一条清理流程
  const removeLibraryRecord = async (id) => {
    await help_deleteImageRecord(id);
    libraryRecords = libraryRecords.filter((record) => record.id !== id);
    renderLibrary();
  };

  // step.1 渲染参考图片并保持 Picture 编号与数组顺序一致
  const renderReferences = () => {
    references.innerHTML = state.images.map((src, index) => (
      `<figure><img src="${src}" alt="Picture ${index + 1}" /><figcaption><button class="image-reference-tag" type="button" data-insert-reference="${index}">&lt;Picture ${index + 1}&gt;</button></figcaption><button type="button" data-remove-reference="${index}" aria-label="移除图片">×</button></figure>`
    )).join('');
  };

  // step.2 接收文件选择和剪贴板图片，按进入顺序保存
  const addImages = async (files) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    for (const file of imageFiles) state.images.push(await help_readImage(file));
    renderReferences();
  };

  // step.3 提交提示词、比例、尺寸和参考图，展示返回的图片 URL
  const generateImage = async () => {
    if (!prompt.value.trim()) {
      error.textContent = '请先输入图片描述。';
      return;
    }
    generate.disabled = true;
    generate.textContent = '生成中...';
    error.textContent = '';
    result.innerHTML = '<p class="agent-hint">正在生成图片，请稍候。</p>';
    try {
      const requestBody = {
        model: 'agnes-image-2.5-flash',
        prompt: prompt.value.trim(),
        size: root.querySelector('[data-image-size]').value,
        ratio: root.querySelector('[data-image-ratio]').value,
        extra_body: { response_format: 'url' }
      };
      if (state.images.length > 0) requestBody.extra_body.image = state.images;
      const response = await fetch(`${AGNES_BASE_URL}/images/generations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || '图片生成失败。');
      const images = (data.data || []).map((item) => {
        if (item.url) return item.url;
        return null;
      }).filter(Boolean);
      if (!images.length) throw new Error('接口没有返回图片。');
      const createdAt = Date.now();
      const date = new Date(createdAt).toLocaleDateString('zh-CN');
      for (const url of images) {
        await help_saveImageRecord({
          id: crypto.randomUUID(),
          url,
          prompt: prompt.value.trim(),
          ratio: root.querySelector('[data-image-ratio]').value,
          size: root.querySelector('[data-image-size]').value,
          createdAt,
          date
        });
      }
      await loadLibrary();
      result.innerHTML = images.map((src, index) => (
        `<figure class="generated-image"><img src="${src}" alt="生成结果 ${index + 1}" /><a href="${src}" download="agnes-image-${index + 1}.png">下载图片</a></figure>`
      )).join('');
    } catch (reason) {
      result.innerHTML = '';
      error.textContent = reason.message || '请求失败，请稍后重试。';
    } finally {
      generate.disabled = false;
      generate.textContent = '生成图片';
    }
  };

  input.addEventListener('change', () => addImages([...input.files]));
  prompt.addEventListener('paste', (event) => {
    const files = [...event.clipboardData.items]
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter(Boolean);
    if (files.length) {
      event.preventDefault();
      addImages(files);
    }
  });
  references.addEventListener('click', (event) => {
    const reference = event.target.closest('[data-insert-reference]');
    if (reference) {
      const number = Number(reference.dataset.insertReference) + 1;
      const insertion = `<Picture ${number}>`;
      const start = prompt.selectionStart;
      prompt.setRangeText(insertion, start, prompt.selectionEnd, 'end');
      prompt.focus();
      return;
    }
    const button = event.target.closest('[data-remove-reference]');
    if (button) state.images.splice(Number(button.dataset.removeReference), 1);
    renderReferences();
  });
  libraryDate.addEventListener('change', renderLibrary);
  library.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('[data-delete-image]');
    if (deleteButton) removeLibraryRecord(deleteButton.dataset.deleteImage);
  });
  library.addEventListener('error', (event) => {
    const image = event.target.closest('[data-library-image]');
    if (image) removeLibraryRecord(image.dataset.libraryImage);
  }, true);
  generate.addEventListener('click', generateImage);
  renderReferences();
  loadLibrary();
}

initAgnesAuth(initImageAgent);
