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
  padding-top: 60px;
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

/* 基础行样式 */
.el-table__body-wrapper tr,
.el-table__body-wrapper tr.el-table__row,
.el-table__body-wrapper tr.el-table__row--striped {
  background-color: #1e1e1e !important;
}

/* 深度穿透选择器确保覆盖Element Plus内部样式 */
.el-table__body-wrapper tr:hover {
  background-color: #34495e !important;
  color: #ffffff !important;
}

.el-table__body-wrapper tr.el-table__row--striped:hover {
  background-color: #34495e !important;
  color: #ffffff !important;
}

.el-table__body-wrapper tr.el-table__row:hover {
  background-color: #34495e !important;
  color: #ffffff !important;
}

.el-table__body-wrapper tr.el-table__row--hover {
  background-color: #34495e !important;
  color: #ffffff !important;
}

/* 确保单元格背景色也被覆盖 */
.el-table__body-wrapper tr:hover td {
  background-color: #34495e !important;
  color: #ffffff !important;
}

.el-table__body-wrapper tr.el-table__row--striped:hover td {
  background-color: #34495e !important;
  color: #ffffff !important;
}

.el-table__body-wrapper tr.el-table__row:hover td {
  background-color: #34495e !important;
  color: #ffffff !important;
}

.el-table__body-wrapper tr.el-table__row--hover td {
  background-color: #34495e !important;
  color: #ffffff !important;
}

/* 确保覆盖Element Plus的所有可能的行选择器 */
.el-table__body tr:hover {
  background-color: #34495e !important;
  color: #ffffff !important;
}

.el-table__body tr.el-table__row--hover {
  background-color: #34495e !important;
  color: #ffffff !important;
}

.el-table__body tr:hover td {
  background-color: #34495e !important;
  color: #ffffff !important;
}

/* 确保覆盖Element Plus的表格行高和内边距 */
.el-table__body tr.el-table__row {
  background-color: #1e1e1e !important;
  color: #e0e0e0 !important;
}

.el-table__body tr.el-table__row--striped {
  background-color: #1e1e1e !important;
  color: #e0e0e0 !important;
}

/* 使用!important确保最高优先级 */
.el-table__body-wrapper tr:hover,
.el-table__body-wrapper tr:hover td,
.el-table__body tr:hover,
.el-table__body tr:hover td,
.el-table__row:hover,
.el-table__row:hover td {
  background-color: #34495e !important;
  color: #ffffff !important;
  background-image: none !important;
  background-repeat: no-repeat !important;
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

/* 全局单选按钮组样式 - 精确选择器确保样式生效 */
.el-radio-group .el-radio-button .el-radio-button__inner {
  background-color: #2c3e50 !important;
  border-color: #333 !important;
  color: #e0e0e0 !important;
  padding: 6px 15px;
  transition: all 0.3s ease;
}

.el-radio-group .el-radio-button .el-radio-button__inner:hover {
  background-color: #34495e !important;
  border-color: #409eff !important;
  color: #ffffff !important;
}

/* 精确选择器确保选中状态样式优先 */
.el-radio-group .el-radio-button.is-active .el-radio-button__inner {
  background-color: #409eff !important;
  border-color: #409eff !important;
  color: #ffffff !important;
  box-shadow: 0 0 5px rgba(64, 158, 255, 0.5) !important;
}

.el-radio-group .el-radio-button .el-radio-button__orig-radio:checked + .el-radio-button__inner {
  background-color: #409eff !important;
  border-color: #409eff !important;
  color: #ffffff !important;
  box-shadow: 0 0 5px rgba(64, 158, 255, 0.5) !important;
}

/* 确保选中状态的文字颜色 */
.el-radio-group .el-radio-button.is-active .el-radio-button__inner span,
.el-radio-group .el-radio-button .el-radio-button__orig-radio:checked + .el-radio-button__inner span {
  color: #ffffff !important;
}

/* 确保未选中状态的文字颜色 */
.el-radio-group .el-radio-button:not(.is-active) .el-radio-button__inner span,
.el-radio-group .el-radio-button .el-radio-button__orig-radio:not(:checked) + .el-radio-button__inner span {
  color: #e0e0e0 !important;
}

/* 确保按钮组边框样式统一 */
.el-radio-group--button .el-radio-button:first-child .el-radio-button__inner {
  border-radius: 4px 0 0 4px !important;
  border-left: none !important;
}

.el-radio-group--button .el-radio-button:last-child .el-radio-button__inner {
  border-radius: 0 4px 4px 0 !important;
}

.el-radio-group--button .el-radio-button__inner {
  border-left: 1px solid #333 !important;
}
</style>
