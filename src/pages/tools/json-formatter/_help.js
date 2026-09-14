// 根据操作类型转换 JSON 文本
export function help_transformJson(input, message, mode) {
  // step.1 处理清空操作
  if (mode === 'clear') {
    input.value = '';
    message.textContent = '';
    delete message.dataset.state;
    return;
  }

  // step.2 解析 JSON 并生成目标格式
  try {
    const value = JSON.parse(input.value);
    const spacing = mode === 'format' ? 2 : 0;
    input.value = JSON.stringify(value, null, spacing);
    message.textContent = mode === 'format' ? '格式化完成。' : '压缩完成。';
    message.dataset.state = 'success';
  } catch (error) {
    message.textContent = `JSON 无法解析：${error.message}`;
    message.dataset.state = 'error';
  }
}
