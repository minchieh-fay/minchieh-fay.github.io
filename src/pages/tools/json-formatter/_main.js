import { help_transformJson } from './_help.js';

// 初始化 JSON 工具并绑定页面操作
function initJsonFormatter() {
  // step.1 获取工具页面的交互元素
  const tool = document.querySelector('[data-json-tool]');
  const input = tool?.querySelector('#json-input');
  const message = tool?.querySelector('[data-message]');
  if (!input || !message) return;

  // step.2 将按钮操作交给 JSON 转换逻辑
  tool.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      help_transformJson(input, message, button.dataset.action);
    });
  });
}

initJsonFormatter();
