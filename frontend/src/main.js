import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import App from './App.vue';
import router from './router';
import './assets/styles/main.css';
import './assets/styles/handdrawn.css';
const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(ElementPlus);
app.config.errorHandler = (err, instance, info) => {
    console.error('Vue error:', err);
};
app.mount('#app');
