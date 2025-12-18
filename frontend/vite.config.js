import { defineConfig } from 'vite'
// 其他 import...

export default defineConfig({
  // ... 其他配置保持不变 ...
  
  // === 添加下面这段 build 配置 ===
  build: {
    outDir: '../backend/static', // 重点：修改输出目录指向后端的 static
    emptyOutDir: true,           // 编译前清空老文件
  }
})