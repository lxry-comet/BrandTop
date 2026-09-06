import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src')
		}
	},
	// Netlify serwuje z korzenia domeny (nie z podfolderu jak GitHub Pages),
	// więc base zawsze '/' — niezależnie od env/trybu builda.
	base: '/'
})