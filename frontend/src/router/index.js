import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import OnlinePlayerStatsView from '../views/OnlinePlayerStatsView.vue'
import TypeListView from '../views/TypeListView.vue'
import RegionListView from '../views/RegionListView.vue'
import SystemListView from '../views/SystemListView.vue'
import TypeDetailView from '../views/TypeDetailView.vue'
import RegionDetailView from '../views/RegionDetailView.vue'
import SystemDetailView from '../views/SystemDetailView.vue'
import SystemKillView from '../views/SystemKillView.vue'
import ManufacturingCostView from '../views/ManufacturingCostView.vue'
import LoginView from '../views/LoginView.vue'
import ProfileView from '../views/ProfileView.vue'
import OrderQueryView from '../views/OrderQueryView.vue'
import LoyaltyOfferView from '../views/LoyaltyOfferView.vue'
import ProfitDataView from '../views/ProfitDataView.vue'
import LpBlueprintView from '../views/LpBlueprintView.vue'
import MyKbView from '../views/MyKbView.vue'
import KbRankingView from '../views/KbRankingView.vue'
import KbRankingDetailView from '../views/KbRankingDetailView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView
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
    },
    {
      path: '/systems',
      name: 'systems',
      component: SystemListView
    },
    {
      path: '/systems/:id',
      name: 'system-detail',
      component: SystemDetailView
    },
    {
      path: '/system-kills',
      name: 'system-kills',
      component: SystemKillView
    },
    {
      path: '/manufacturing-cost',
      name: 'manufacturing-cost',
      component: ManufacturingCostView
    },
    {
      path: '/lp-blueprint',
      name: 'lp-blueprint',
      component: LpBlueprintView
    },
    {
      path: '/my-kb',
      name: 'my-kb',
      component: MyKbView
    },
    {
      path: '/kb-ranking',
      name: 'kb-ranking',
      component: KbRankingView
    },
    {
      path: '/kb-ranking/:id',
      name: 'kb-ranking-detail',
      component: KbRankingDetailView
    }
  ]
})

export default router
