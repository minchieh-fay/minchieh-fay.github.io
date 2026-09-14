export const AGNES_BASE_URL = 'https://api.agnes-ai.cn/v1';

// 初始化 Agnes API Key 校验，并在有效后开放工具页面
export function initAgnesAuth(onReady) {
  const root = document.querySelector('[data-agnes-auth]');
  const app = root?.querySelector('[data-agnes-app]');
  const dialog = root?.querySelector('[data-agnes-dialog]');
  const form = root?.querySelector('[data-agnes-form]');
  const input = root?.querySelector('[data-agnes-key]');
  const toggle = root?.querySelector('[data-agnes-toggle]');
  const error = root?.querySelector('[data-agnes-error]');
  const submit = root?.querySelector('[data-agnes-submit]');
  if (!root || !app || !dialog || !form || !input || !toggle || !error || !submit) return;

  // step.1 通过 models 接口确认令牌有效
  const validateKey = async (key) => {
    const cacheBuster = `?auth_check=${Date.now()}`;
    const response = await fetch(`${AGNES_BASE_URL}/models${cacheBuster}`, {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${key}`,
        'Cache-Control': 'no-cache'
      }
    });
    return response.ok;
  };

  // step.2 保存有效令牌并显示具体工具，否则保留输入弹窗
  const openApp = (key) => {
    localStorage.setItem('AGNES_API_KEY', key);
    root.dataset.agnesReady = 'true';
    dialog.setAttribute('hidden', '');
    app.removeAttribute('hidden');
    onReady(key);
  };

  const checkKey = async (key) => {
    submit.disabled = true;
    submit.textContent = '验证中...';
    error.textContent = '';
    let valid = false;
    try {
      valid = await validateKey(key);
    } catch (reason) {
      error.textContent = reason.message || '验证请求失败，请检查网络后重试。';
      localStorage.removeItem('AGNES_API_KEY');
      delete root.dataset.agnesReady;
      dialog.hidden = false;
      submit.disabled = false;
      submit.textContent = '验证并进入';
      return;
    }
    if (!valid) {
      error.textContent = 'API Key 无效，请重新输入。';
      localStorage.removeItem('AGNES_API_KEY');
      delete root.dataset.agnesReady;
      dialog.hidden = false;
      submit.disabled = false;
      submit.textContent = '验证并进入';
      return;
    }
    try {
      openApp(key);
    } catch (reason) {
      app.hidden = true;
      delete root.dataset.agnesReady;
      dialog.hidden = false;
      error.textContent = `工具初始化失败：${reason.message || '未知错误'}`;
      console.error('Agnes tool initialization failed', reason);
    } finally {
      submit.disabled = false;
      submit.textContent = '验证并进入';
    }
  };

  // step.3 优先校验已有令牌，没有令牌时直接显示输入界面
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const key = input.value.trim();
    if (key) checkKey(key);
    else error.textContent = '请输入 API Key。';
  });
  toggle.addEventListener('click', () => {
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    toggle.textContent = visible ? '显示' : '隐藏';
    toggle.setAttribute('aria-label', visible ? '显示 API Key' : '隐藏 API Key');
  });
  const savedKey = localStorage.getItem('AGNES_API_KEY');
  if (savedKey) checkKey(savedKey);
  else dialog.hidden = false;
}
