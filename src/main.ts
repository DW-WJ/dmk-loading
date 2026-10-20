import { createApp } from 'vue'
import App from './demo/App.vue'
import TransitionLoading from './lib'

createApp(App)
  .use(TransitionLoading, {
    text: '加载中...',
    spinner: 'ring',
    transition: 'fade',
    maskStyle: 'soft',
    delay: 120
  })
  .mount('#app')