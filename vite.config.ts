import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { localImagePlugin } from './local-image-plugin'

export default defineConfig({
  plugins: [vue(), localImagePlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    open: true
  },
  assetsInclude: ['**/*.glsl', '**/*.vert', '**/*.frag']
})
