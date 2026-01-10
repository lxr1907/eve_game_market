<script setup>
import Navbar from './components/Navbar.vue'
// App.vue - Main application component
</script>

<template>
  <div id="app" class="dark">
    <Navbar />
    <div class="main-content">
      <router-view />
    </div>
  </div>
</template>

<style>
/* Global styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #121212;
  color: #e0e0e0;
  padding-top: 60px; /* Add padding to avoid content being covered by fixed navbar */
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 5px;
  background-color: #1e1e1e;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

/* Element Plus 暗色主题增强样式 */
.el-card {
  background-color: #1e1e1e !important;
  border-color: #333 !important;
  color: #e0e0e0;
}

.el-card__header {
  background-color: #2c3e50 !important;
  border-bottom-color: #333 !important;
  color: #ffffff;
}

.el-table {
  background-color: #1e1e1e !important;
  color: #e0e0e0;
}

.el-table__header-wrapper th {
  background-color: #2c3e50 !important;
  color: #ffffff;
  border-bottom-color: #333 !important;
}

.el-table__body-wrapper tr {
  background-color: #1e1e1e !important;
}

.el-table__body-wrapper tr.el-table__row--striped {
  background-color: #1e1e1e !important;
}

.el-table__body-wrapper tr:hover {
  background-color: #2c3e50 !important;
}

.el-table__body-wrapper td {
  border-bottom-color: #333 !important;
  color: #e0e0e0;
}

.el-input__inner {
  background-color: #2c3e50 !important;
  border-color: #333 !important;
  color: #e0e0e0;
}

.el-input__inner::placeholder {
  color: #999 !important;
}

.el-select-dropdown {
  background-color: #2c3e50 !important;
  border-color: #333 !important;
}

.el-select-dropdown__item {
  color: #e0e0e0 !important;
}

.el-select-dropdown__item:hover {
  background-color: #34495e !important;
}

.el-select-dropdown__item.selected {
  background-color: #409eff !important;
  color: #ffffff !important;
}

.el-pagination {
  color: #e0e0e0 !important;
}

.el-pager li {
  background-color: #1e1e1e !important;
  border-color: #333 !important;
  color: #e0e0e0 !important;
}

.el-pager li:hover {
  background-color: #34495e !important;
  color: #ffffff !important;
}

.el-pager li.active {
  background-color: #409eff !important;
  color: #ffffff !important;
}

.el-button {
  background-color: #2c3e50 !important;
  border-color: #333 !important;
  color: #ffffff !important;
}

.el-button:hover {
  background-color: #34495e !important;
  border-color: #409eff !important;
}

.el-button--primary {
  background-color: #409eff !important;
  border-color: #409eff !important;
}

.el-button--primary:hover {
  background-color: #66b1ff !important;
  border-color: #66b1ff !important;
}

.el-radio-button__inner {
  background-color: #2c3e50 !important;
  border-color: #333 !important;
  color: #e0e0e0 !important;
}

.el-radio-button__orig-radio:checked + .el-radio-button__inner {
  background-color: #409eff !important;
  border-color: #409eff !important;
  color: #ffffff !important;
}
</style>
