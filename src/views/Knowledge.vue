<template>
  <div class="knowledge-container">
    <!-- 左侧：角色导航栏 -->
    <div class="role-sidebar">
      <div class="sidebar-header">
        <h2 class="sidebar-title">记忆对象</h2>
        <a-input-search 
          v-model="roleSearchKeyword" 
          placeholder="搜索角色..." 
          class="role-search"
          allow-clear
        />
      </div>

      <div class="role-list">
        <div 
          v-for="role in filteredRoles" 
          :key="role.id" 
          class="role-item"
          :class="{ active: currentRoleId === role.id }"
          @click="handleRoleChange(role.id)"
        >
          <a-avatar :size="40" :image-url="role.avatarUrl" class="role-avatar" />
          <div class="role-info">
            <div class="role-name">{{ role.name }}</div>
            <!-- 移除 roleSetting 展示 -->
          </div>
          <div class="active-indicator" :style="{ backgroundColor: role.themeColor || '#FF9A2E' }"></div>
        </div>
        
        <!-- 空状态 -->
        <div v-if="filteredRoles.length === 0" class="empty-roles">
          无此角色
        </div>
      </div>
    </div>

    <!-- 右侧：内容管理区 -->
    <div class="content-area">
      <template v-if="currentRole">
        <!-- 角色头部卡片 -->
        <div class="content-header" :style="{ backgroundImage: currentRole.bgImage }">
           <div class="header-overlay"></div>
           <div class="header-content">
             <a-avatar :size="64" :image-url="currentRole.avatarUrl" class="header-avatar" :style="{ borderColor: currentRole.themeColor || '#fff' }" />
             <div class="header-text">
               <h1 class="current-role-name">{{ currentRole.name }} 的记忆库</h1>
               <p class="current-role-desc">投喂文档，让TA变得更懂你。</p>
             </div>
           </div>
        </div>

        <!-- 工具栏与表格 -->
        <div class="table-wrapper">
          <div class="toolbar">
            <div class="left-tools">
               <a-upload
                action="/api/doc/parse"
                :headers="uploadHeaders"
                :data="{ roleId: currentRoleId }" 
                :show-file-list="false"
                @success="handleUploadSuccess"
                @error="handleUploadError"
              >
                <template #upload-button>
                  <a-button type="primary" size="large" class="upload-btn" :style="{ backgroundColor: currentRole.themeColor, borderColor: currentRole.themeColor }">
                    <template #icon><icon-upload /></template>
                    上传记忆文档
                  </a-button>
                </template>
              </a-upload>
              <span class="tip-text">支持 PDF, Word, TXT (Max 10MB)</span>
            </div>
            
            <a-input-search 
              placeholder="搜索文档..." 
              style="width: 240px" 
              allow-clear
            />
          </div>

          <a-table
            :data="data"
            :loading="loading"
            :pagination="pagination"
            :bordered="false"
            row-key="fileId"
            class="custom-table"
          >
            <template #columns>
              <a-table-column title="文档名称" data-index="fileName">
                <template #cell="{ record }">
                  <div class="file-name-cell">
                    <icon-file-pdf v-if="record.fileName.endsWith('.pdf')" style="color: #ff4d4f; font-size: 24px; margin-right: 12px;" />
                    <icon-file v-else style="color: #1890ff; font-size: 24px; margin-right: 12px;" />
                    <span class="file-name-text">{{ record.fileName }}</span>
                  </div>
                </template>
              </a-table-column>
              <a-table-column title="大小" data-index="fileSize" width="120">
                <template #cell="{ record }">
                  {{ (record.fileSize / 1024 / 1024).toFixed(2) }} MB
                </template>
              </a-table-column>
              <a-table-column title="上传时间" data-index="createTime" width="180" />
              <a-table-column title="操作" width="100">
                <template #cell="{ record }">
                  <a-popconfirm content="确定要删除这段记忆吗？" type="warning" @ok="handleDelete(record)">
                    <a-button type="text" size="small" status="danger" shape="circle">
                      <icon-delete />
                    </a-button>
                  </a-popconfirm>
                </template>
              </a-table-column>
            </template>
            <template #empty>
               <div class="empty-state">
                 <div class="empty-icon-bg">
                   <icon-folder style="font-size: 32px; color: var(--color-text-3);" />
                 </div>
                 <p>空空如也~ 快去上传文档吧</p>
               </div>
            </template>
          </a-table>
        </div>
      </template>
      
      <!-- 未选择状态 (理论上默认会选中第一个，这里做防守) -->
      <div v-else class="no-select-state">
        <icon-user-group style="font-size: 48px; color: #ccc; margin-bottom: 16px;" />
        <p>请选择一个角色查看记忆库</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { getDocList, deleteDoc } from '@/api/doc'
import { getRoleList } from '@/api/role'
import { Message } from '@arco-design/web-vue'
import { IconUpload, IconFile, IconFilePdf, IconDelete, IconFolder, IconUserGroup } from '@arco-design/web-vue/es/icon'
import { adaptRoleData } from '@/utils/roleAdapter' // 引入适配器

const loading = ref(false)
const data = ref([])
const roles = ref([])
const currentRoleId = ref(null)
const roleSearchKeyword = ref('')
const pagination = { pageSize: 8 }

const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
}))

const currentRole = computed(() => {
  return roles.value.find(r => r.id === currentRoleId.value)
})

// 前端过滤角色列表
const filteredRoles = computed(() => {
  if (!roleSearchKeyword.value) return roles.value
  const kw = roleSearchKeyword.value.toLowerCase()
  return roles.value.filter(r => 
    r.name.toLowerCase().includes(kw)
    // 移除对 roleSetting 的搜索匹配，或者保留搜索但不展示
  )
})

// 初始化
const init = async () => {
  try {
    const roleRes = await getRoleList()
    // 使用适配器处理数据，确保 visual 等字段可用
    roles.value = roleRes.map(adaptRoleData)
    
    if (roles.value.length > 0) {
      currentRoleId.value = roles.value[0].id
      fetchDocs()
    }
  } catch (error) {
    console.error(error)
  }
}

const fetchDocs = async () => {
  if (!currentRoleId.value) return
  
  loading.value = true
  try {
    const res = await getDocList({ roleId: currentRoleId.value })
    data.value = res
  } catch (error) {
    // error
  } finally {
    loading.value = false
  }
}

const handleRoleChange = (id) => {
  currentRoleId.value = id
  fetchDocs()
}

const handleUploadSuccess = (fileItem) => {
  const res = fileItem.response
  if (res && res.code === 200) {
    Message.success('记忆植入成功！')
    fetchDocs()
  } else {
    Message.error(res?.message || '上传失败')
  }
}

const handleUploadError = () => {
  Message.error('上传失败')
}

const handleDelete = async (record) => {
  try {
    await deleteDoc({ fileId: record.fileId })
    Message.success('记忆已删除')
    fetchDocs()
  } catch (error) {
    // error
  }
}

onMounted(() => {
  init()
})
</script>

<style scoped>
.knowledge-container {
  display: flex;
  height: 100%;
  background-color: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

/* 左侧导航栏 */
.role-sidebar {
  width: 280px;
  background-color: #FFFBF5; /* 极浅的米色背景 */
  border-right: 1px solid rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px 16px;
}

.sidebar-title {
  margin: 0 0 12px 0;
  font-size: 18px;
  color: #4E342E;
  padding-left: 4px;
}

.role-search {
  background-color: #fff;
  border-radius: 8px;
}

.role-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px 20px 12px;
}

.role-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 12px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.role-item:hover {
  background-color: rgba(255, 154, 46, 0.08);
}

.role-item.active {
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.role-avatar {
  border: 2px solid transparent;
  margin-right: 12px;
}

.role-item.active .role-avatar {
  border-color: var(--primary-6);
}

.role-info {
  flex: 1;
  overflow: hidden;
  /* 垂直居中 */
  display: flex; 
  align-items: center;
}

.role-name {
  font-size: 15px;
  font-weight: 600;
  color: #4E342E;
  /* margin-bottom: 2px; */ /* 只有一行文字了，不需要 margin */
}

.active-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 24px;
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.role-item.active .active-indicator {
  opacity: 1;
}

.empty-roles {
  text-align: center;
  color: #ccc;
  padding-top: 40px;
  font-size: 13px;
}

/* 右侧内容区 */
.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #fff;
}

.content-header {
  height: 160px;
  position: relative;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  padding: 0 40px;
}

.header-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
}

.header-content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-avatar {
  border: 3px solid #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.current-role-name {
  margin: 0 0 6px 0;
  font-size: 24px;
  color: #4E342E;
}

.current-role-desc {
  margin: 0;
  color: #6D4C41;
  font-size: 14px;
}

.table-wrapper {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.left-tools {
  display: flex;
  align-items: center;
  gap: 16px;
}

.upload-btn {
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

.tip-text {
  color: #999;
  font-size: 12px;
}

.file-name-text {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.empty-state {
  padding: 60px 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #999;
}

.empty-icon-bg {
  width: 64px;
  height: 64px;
  background-color: #F7F8FA;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 16px;
}

/* 表格样式覆盖 */
:deep(.arco-table-cell) {
  padding: 14px 16px !important;
}
:deep(.arco-table-th) {
  background-color: #fff !important;
  border-bottom: 1px solid #f0f0f0;
  color: #8D6E63;
}
:deep(.arco-table-tr:hover .arco-table-td) {
  background-color: #FFFBF5 !important;
}
</style>
