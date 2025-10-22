import { defineConfig } from 'vite';
import monkey, { cdn, util } from 'vite-plugin-monkey';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    minify: true,
  },
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        icon: 'https://vitejs.dev/logo.svg',
        namespace: 'wibus/changjiang-ai-answer',
        match: [
          'https://changjiang.yuketang.cn/*',
          'https://changjiang-exam.yuketang.cn/*',
          'https://www.doubao.com/*',
        ],
      },
    }),
  ],
});
