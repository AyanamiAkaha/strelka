import { createApp } from 'vue'
import App from './App.vue'
import './public/style.css'

console.log('Vue app starting...')

const app = createApp(App)
console.log('About to mount...')
app.mount('#app')

console.log('Vue app mounted!')
