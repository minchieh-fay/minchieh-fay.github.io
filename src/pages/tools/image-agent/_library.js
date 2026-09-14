const DB_NAME = 'minchieh-fay-tools';
const STORE_NAME = 'generated-images';

// 打开图片库数据库并在首次使用时创建记录仓库
function help_openLibrary() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 读取所有生成记录并按创建时间倒序返回
export async function help_listImageRecords() {
  const database = await help_openLibrary();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME).objectStore(STORE_NAME).getAll();
    request.onsuccess = () => {
      const records = request.result.sort((a, b) => b.createdAt - a.createdAt);
      resolve(records);
    };
    request.onerror = () => reject(request.error);
  });
}

// 保存远程图片 URL 和生成信息，不保存图片 Base64 内容
export async function help_saveImageRecord(record) {
  const database = await help_openLibrary();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readwrite')
      .objectStore(STORE_NAME)
      .put(record);
    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
}

// 删除图片库中的单条生成记录
export async function help_deleteImageRecord(id) {
  const database = await help_openLibrary();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readwrite')
      .objectStore(STORE_NAME)
      .delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
