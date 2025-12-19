import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import TypeListView from '../views/TypeListView.vue'
import TypeDetailView from '../views/TypeDetailView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/types',
      name: 'types',
      component: TypeListView
    },
    {
      path: '/types/:id',
      name: 'type-detail',
      component: TypeDetailView
    }
  ]
})

export default router