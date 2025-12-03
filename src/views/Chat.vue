<template>
  <div class="chat-container" :style="{ backgroundImage: currentRole?.bgImage }">
    <!-- 背景遮罩，提升文字可读性 -->
    <div class="bg-overlay"></div>

    <!-- 头部 (灵动岛风格悬浮) -->
    <div class="chat-header-wrapper">
      <div class="chat-header">
        <a-button type="text" class="back-btn" @click="$router.push('/roles')">
          <icon-left />
        </a-button>

        <div class="role-info" v-if="currentRole">
          <div class="avatar-ring" :style="{ borderColor: currentRole?.themeColor || 'var(--primary-6)' }">
             <a-avatar :size="40">
                <template #trigger-icon>
                  <icon-user />
                </template>
                <img 
                  :src="currentRole.avatarUrl" 
                  @error="(e) => { e.target.style.display='none'; e.target.nextElementSibling.style.display='flex' }"
                  style="width: 100%; height: 100%; object-fit: cover;"
                />
                <div style="display:none; width: 100%; height: 100%; background: #f2f3f5; color: #86909c; font-weight: bold; justify-content: center; align-items: center;">
                   {{ currentRole.name?.charAt(0) }}
                </div>
             </a-avatar>
          </div>
          <div class="meta">
            <div class="name">{{ currentRole.name }}</div>
            <div class="status">
              <span class="online-dot"></span> 在线
            </div>
          </div>
        </div>
        
        <div class="actions">
          <a-tooltip content="重置记忆">
            <a-button type="text" class="action-btn" shape="circle" @click="handleReset">
              <icon-refresh />
            </a-button>
          </a-tooltip>
        </div>
      </div>
    </div>

    <!-- 消息列表 (滚动区域) -->
    <div class="chat-body" ref="chatBodyRef">
      <div class="message-list">
        <!-- 日期分割线 -->
        <div class="date-divider" v-if="messages.length > 0">今天</div>
        
        <!-- 空状态提示 -->
        <div v-if="messages.length === 0" class="empty-chat-tip">
           <span class="tip-pill">开始与 {{ currentRole?.name || 'TA' }} 的新对话吧~</span>
        </div>
        
        <div 
          v-for="msg in messages" 
          :key="msg.id" 
          :class="['message-item', msg.role === 'user' ? 'user' : 'assistant']"
        >
          <div class="avatar">
            <a-avatar v-if="msg.role === 'user'" :size="40">
                <img 
                  v-if="userInfo.avatarUrl"
                  :src="userInfo.avatarUrl" 
                  @error="(e) => { e.target.style.display='none'; e.target.nextElementSibling.style.display='flex' }"
                  style="width: 100%; height: 100%; object-fit: cover;"
                />
                <div style="display:none; width: 100%; height: 100%; background: var(--primary-6); color: #fff; justify-content: center; align-items: center;">
                  U
                </div>
            </a-avatar>
            
            <a-avatar v-else :size="40">
               <img 
                  v-if="currentRole?.avatarUrl"
                  :src="currentRole.avatarUrl" 
                  @error="(e) => { e.target.style.display='none'; e.target.nextElementSibling.style.display='flex' }"
                  style="width: 100%; height: 100%; object-fit: cover;"
               />
               <div style="display:none; width: 100%; height: 100%; background: #f2f3f5; color: #86909c; justify-content: center; align-items: center;">
                 AI
               </div>
            </a-avatar>
          </div>
          
          <div class="content-wrapper">
            <div class="bubble-name" v-if="msg.role === 'assistant'">{{ currentRole?.name }}</div>
            <div class="content markdown-body" v-if="msg.loading">
              <div class="typing-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
            <div 
              class="content markdown-body" 
              v-else 
              v-html="renderMarkdown(msg.content)"
              :style="msg.role === 'user' ? { background: currentRole?.themeColor || 'var(--primary-6)' } : {}"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部输入 (悬浮设计) -->
    <div class="chat-footer">
      <div class="input-bar">
        <a-upload action="/" :auto-upload="false" :show-file-list="false" @change="handleFileSelect">
           <template #upload-button>
              <a-button type="text" shape="circle" class="tool-btn">
                <icon-image />
              </a-button>
           </template>
        </a-upload>

        <div class="input-wrapper">
          <a-textarea
            v-model="inputText"
            placeholder="和它说点什么..."
            :auto-size="{ minRows: 1, maxRows: 4 }"
            @keydown.enter.prevent="handleKeydown"
            class="custom-textarea"
          />
        </div>
        
        <a-button 
          type="primary" 
          shape="circle" 
          size="large"
          :loading="sending" 
          @click="sendMessage"
          class="send-btn"
          :disabled="!inputText.trim()"
          :style="{ backgroundColor: currentRole?.themeColor || 'var(--primary-6)', borderColor: currentRole?.themeColor || 'var(--primary-6)' }"
        >
          <icon-send />
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getRoleDetail } from '@/api/role'
import { getChatHistory, resetChat } from '@/api/chat'
import { Message } from '@arco-design/web-vue'
import { IconRefresh, IconImage, IconLeft, IconSend, IconUser } from '@arco-design/web-vue/es/icon'
import MarkdownIt from 'markdown-it'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { adaptRoleData } from '@/utils/roleAdapter'

const route = useRoute()
const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)
const md = new MarkdownIt()

const roleId = computed(() => route.params.roleId)
const currentRole = ref(null)
const messages = ref([])
const inputText = ref('')
const sending = ref(false)
const chatBodyRef = ref(null)

// 渲染 Markdown
const renderMarkdown = (text) => {
  if (!text) return ''
  return md.render(text)
}

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick()
  if (chatBodyRef.value) {
    chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight
  }
}

// 获取角色详情
const fetchRoleDetail = async () => {
  try {
    const res = await getRoleDetail(roleId.value)
    currentRole.value = adaptRoleData(res)
  } catch (error) {
    console.error(error)
  }
}

// 获取历史记录
const fetchHistory = async () => {
  try {
    const res = await getChatHistory(roleId.value)
    const validMessages = res.filter(item => item.role !== 'system')
    messages.value = validMessages.map(item => ({
      id: item.id,
      role: item.role,
      content: item.content,
      loading: false
    }))
    scrollToBottom()
  } catch (error) {
    console.error(error)
  }
}

// 发送消息
const sendMessage = async () => {
  const text = inputText.value.trim()
  if (!text && !sending.value) return
  
  messages.value.push({
    id: Date.now(),
    role: 'user',
    content: text,
    loading: false
  })
  
  inputText.value = ''
  scrollToBottom()
  
  sending.value = true
  
  const aiMsgId = Date.now() + 1
  const aiMsgIndex = messages.value.push({
    id: aiMsgId,
    role: 'assistant',
    content: '',
    loading: true
  }) - 1
  
  scrollToBottom()

  const token = localStorage.getItem('token')
  const formData = new FormData()
  formData.append('message', text)
  
  try {
    await fetchEventSource(`/api/chat/${roleId.value}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData,
      async onopen(response) {
        if (response.ok) {
          messages.value[aiMsgIndex].loading = false
          return
        } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
           throw new Error('Client Error')
        }
      },
      onmessage(msg) {
        if (msg.data === '[DONE]') {
          sending.value = false
          return
        }
        messages.value[aiMsgIndex].content += msg.data
        scrollToBottom()
      },
      onerror(err) {
        console.error('SSE Error:', err)
        sending.value = false
        throw err
      }
    })
  } catch (err) {
    messages.value[aiMsgIndex].loading = false
    if (!messages.value[aiMsgIndex].content) {
        messages.value[aiMsgIndex].content = '连接断开，请重试。'
    }
    sending.value = false
  }
}

const handleKeydown = (e) => {
  if (e.shiftKey) return
  sendMessage()
}

const handleReset = async () => {
  try {
    await resetChat(roleId.value)
    Message.success('对话已重置')
    messages.value = [] 
  } catch (error) {
    // error
  }
}

const handleFileSelect = () => {
    Message.info('图片上传功能暂未实现')
}

onMounted(() => {
  if (roleId.value) {
    fetchRoleDetail()
    fetchHistory()
  }
})

watch(() => route.params.roleId, (newId) => {
  if (newId) {
    currentRole.value = null
    messages.value = []
    fetchRoleDetail()
    fetchHistory()
  }
})
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  position: relative;
  overflow: hidden;
  background-size: cover;
  background-position: center;
  transition: background-image 0.5s ease;
}

/* 背景遮罩 */
.bg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  z-index: 0;
}

/* 头部悬浮 */
.chat-header-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 16px;
  display: flex;
  justify-content: center;
}

.chat-header {
  width: 90%;
  max-width: 800px;
  height: 64px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: 32px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  border: 1px solid rgba(255, 255, 255, 0.4);
}

.back-btn {
  color: #5D4037;
}

.action-btn {
  color: #8D6E63;
}

.role-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar-ring {
  padding: 2px;
  border: 2px solid transparent;
  border-radius: 50%;
  display: flex; 
  justify-content: center;
  align-items: center;
}

.meta .name {
  font-weight: 600;
  font-size: 16px;
  color: #4E342E;
  line-height: 1.2;
}

.meta .status {
  font-size: 12px;
  color: #8D6E63;
  display: flex;
  align-items: center;
  gap: 4px;
}

.online-dot {
  width: 6px;
  height: 6px;
  background-color: #00B42A;
  border-radius: 50%;
  display: inline-block;
}

/* 消息内容区 */
.chat-body {
  position: relative;
  z-index: 1;
  flex: 1;
  overflow-y: auto;
  /* 
    关键修复：
    顶部 padding = header wrapper height (~96px) + extra space
    底部 padding = footer height (~100px) + extra space
    确保内容不被遮挡
  */
  padding: 100px 20px 120px 20px; 
}

.message-list {
  max-width: 700px;
  margin: 0 auto;
  /* 移除 height: 100%，让内容自然撑开，否则滚动条可能异常 */
  display: flex;
  flex-direction: column;
}

.date-divider {
  text-align: center;
  font-size: 12px;
  color: #8D6E63;
  opacity: 0.7;
  margin: 20px 0;
  padding: 4px 12px;
  background: rgba(255,255,255,0.4);
  border-radius: 10px;
  display: inline-block;
  align-self: center;
}

.empty-chat-tip {
  margin-top: 40px; 
  display: flex;
  justify-content: center;
  opacity: 0.8;
  width: 100%;
}

.tip-pill {
  background: rgba(255,255,255,0.6);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  color: #8D6E63;
  backdrop-filter: blur(4px);
}

.message-item {
  display: flex;
  margin-bottom: 24px;
  gap: 12px;
  align-items: flex-end;
  width: 100%;
}

.message-item.user {
  flex-direction: row-reverse;
}

.content-wrapper {
  max-width: 75%;
  display: flex;
  flex-direction: column;
}

.bubble-name {
  font-size: 12px;
  color: #8D6E63;
  margin-bottom: 4px;
  margin-left: 4px;
}

.content {
  padding: 12px 18px;
  border-radius: 18px;
  line-height: 1.6;
  font-size: 15px;
  position: relative;
  word-break: break-word;
}

/* AI气泡：半透明毛玻璃 */
.assistant .content {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(10px);
  color: #4E342E;
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  border: 1px solid rgba(255,255,255,0.5);
}

/* 用户气泡：主题色 */
.user .content {
  background-color: var(--primary-6); 
  color: #fff;
  border-bottom-right-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 底部输入悬浮 */
.chat-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  /* 增加 padding 以确保美观 */
  padding: 20px 24px 30px 24px;
  background: linear-gradient(to top, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%);
}

.input-bar {
  max-width: 700px;
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
  gap: 12px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  padding: 8px 8px 8px 16px;
  border-radius: 28px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.6);
}

.tool-btn {
  color: #86909C;
}

.input-wrapper {
  flex: 1;
  display: flex;
}

.input-wrapper :deep(.arco-textarea-wrapper) {
  background: transparent;
  border: none;
  padding: 0;
  box-shadow: none;
  transition: none;
}

.input-wrapper :deep(.arco-textarea-wrapper:hover),
.input-wrapper :deep(.arco-textarea-wrapper:focus-within) {
  background: transparent;
  border: none;
  box-shadow: none;
}

.input-wrapper :deep(.arco-textarea) {
  background: transparent;
  border: none;
  padding: 10px 0;
  resize: none;
  color: #4E342E;
  font-size: 15px;
  caret-color: #FF9A2E;
  line-height: 1.5;
}

.input-wrapper :deep(.arco-textarea:focus) {
  outline: none;
  box-shadow: none;
}

.send-btn {
  flex-shrink: 0;
  transition: all 0.3s;
}

/* 动画 */
.typing-dots span {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #bbb;
  margin: 0 2px;
  animation: typing 1.4s infinite ease-in-out;
}
.typing-dots span:nth-child(1) { animation-delay: 0s; }
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 100% { transform: scale(0.6); opacity: 0.6; }
  50% { transform: scale(1); opacity: 1; }
}
</style>
