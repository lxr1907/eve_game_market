import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import TypeListView from '../views/TypeListView.vue'
import TypeDetailView from '../views/TypeDetailView.vue'
import RegionListView from '../views/RegionListView.vue'
import RegionDetailView from '../views/RegionDetailView.vue'
import OrderQueryView from '../views/OrderQueryView.vue'
import LoyaltyOfferView from '../views/LoyaltyOfferView.vue'
import ProfitDataView from '../views/ProfitDataView.vue'
import OnlinePlayerStatsView from '../views/OnlinePlayerStatsView.vue'

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
    },
    {
      path: '/regions',
      name: 'regions',
      component: RegionListView
    },
    {
      path: '/regions/:id',
      name: 'region-detail',
      component: RegionDetailView
    },
    {
      path: '/orders',
      name: 'orders',
      component: OrderQueryView
    },
    {
      path: '/loyalty',
      name: 'loyalty',
      component: LoyaltyOfferView
    },
    {
      path: '/profit-data',
      name: 'profit-data',
      component: ProfitDataView
    },
    {
      path: '/online-player-stats',
      name: 'online-player-stats',
      component: OnlinePlayerStatsView
    }
  ]
})

export default router