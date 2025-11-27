<template>
  <div class="knowledge-container">
    <!-- 顶部角色选择区 -->
    <div class="role-selector">
      <h2 class="page-title">
        <icon-book style="margin-right: 8px; color: rgb(var(--primary-6));" />
        角色记忆库
      </h2>
      <p class="page-desc">每个角色都有独立的记忆，上传文档来丰富他们的知识储备吧！</p>
      
      <a-tabs type="capsule" v-model:active-key="currentRoleId" @change="handleRoleChange">
        <a-tab-pane v-for="role in roles" :key="role.id" :title="role.name">
          <template #title>
            <div class="tab-label">
              <a-avatar :size="24" :image-url="role.avatarUrl" style="margin-right: 8px;" />
              {{ role.name }}
            </div>
          </template>
        </a-tab-pane>
      </a-tabs>
    </div>

    <!-- 内容区 -->
    <a-card class="content-card">
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
              <a-button type="primary" size="large">
                <template #icon><icon-upload /></template>
                投喂知识 (上传文档)
              </a-button>
            </template>
          </a-upload>
          <span class="tip-text">支持 PDF, Word, TXT 格式</span>
        </div>
        
        <a-input-search 
          placeholder="搜索记忆..." 
          style="width: 260px" 
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
                <icon-file-pdf v-if="record.fileName.endsWith('.pdf')" style="color: #ff4d4f; font-size: 20px; margin-right: 8px;" />
                <icon-file v-else style="color: #1890ff; font-size: 20px; margin-right: 8px;" />
                <span>{{ record.fileName }}</span>
              </div>
            </template>
          </a-table-column>
          <a-table-column title="大小" data-index="fileSize" width="120">
            <template #cell="{ record }">
              {{ (record.fileSize / 1024 / 1024).toFixed(2) }} MB
            </template>
          </a-table-column>
          <a-table-column title="上传时间" data-index="createTime" width="180" />
          <a-table-column title="操作" width="120">
            <template #cell="{ record }">
              <a-popconfirm content="确定要删除这段记忆吗？" type="warning" @ok="handleDelete(record)">
                <a-button type="text" size="small" status="danger">
                  <template #icon><icon-delete /></template>
                  删除
                </a-button>
              </a-popconfirm>
            </template>
          </a-table-column>
        </template>
        <template #empty>
           <div class="empty-state">
             <icon-folder style="font-size: 48px; color: var(--color-text-3); margin-bottom: 10px;" />
             <p>这个角色还没有专属记忆哦~</p>
           </div>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { getDocList, deleteDoc } from '@/api/doc'
import { getRoleList } from '@/api/role'
import { Message } from '@arco-design/web-vue'
import { IconUpload, IconFile, IconFilePdf, IconDelete, IconBook, IconFolder } from '@arco-design/web-vue/es/icon'

const loading = ref(false)
const data = ref([])
const roles = ref([])
const currentRoleId = ref(null)
const pagination = { pageSize: 10 }

const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
}))

// 初始化：先获取角色列表，选中第一个，然后获取文档
const init = async () => {
  try {
    const roleRes = await getRoleList()
    roles.value = roleRes
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
    // 传入 roleId 获取对应角色的知识库
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
    Message.success('投喂成功！角色正在消化知识...')
    fetchDocs()
  } else {
    Message.error(res?.message || '上传失败')
  }
}

const handleUploadError = () => {
  Message.error('上传失败 (Mock 环境需确保 mockjs 拦截正确)')
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
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.role-selector {
  background: linear-gradient(to right, #FFF8EB, #FFFFFF);
  padding: 24px 32px;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(255, 154, 46, 0.05);
}

.page-title {
  display: flex;
  align-items: center;
  margin: 0 0 8px 0;
  color: #4E342E; /* 深褐色，像咖啡色 */
  font-size: 24px;
}

.page-desc {
  margin: 0 0 20px 0;
  color: #8D6E63;
  font-size: 14px;
}

.tab-label {
  display: flex;
  align-items: center;
  padding: 4px 0;
}

.content-card {
  flex: 1;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.left-tools {
  display: flex;
  align-items: center;
  gap: 16px;
}

.tip-text {
  color: var(--color-text-3);
  font-size: 12px;
}

.file-name-cell {
  display: flex;
  align-items: center;
  font-weight: 500;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: var(--color-text-3);
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 深度定制表格样式 */
:deep(.arco-table-cell) {
  padding: 16px !important;
}
:deep(.arco-table-th) {
  background-color: #FFF8EB !important;
  color: #8D6E63;
  font-weight: 600;
}
:deep(.arco-table-tr:hover .arco-table-td) {
  background-color: #FFF2D6 !important;
}
</style>
