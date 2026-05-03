import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // RẤT QUAN TRỌNG: Thêm dòng base này và điền đúng tên Repository của bạn
  base: '/gamevovan/', 
})