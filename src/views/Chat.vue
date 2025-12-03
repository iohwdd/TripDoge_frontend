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
            
            <!-- AI 消息内容 -->
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

            <!-- 工具调用展示区 (移到气泡下方) -->
            <div v-if="msg.toolCalls && msg.toolCalls.length > 0" class="tool-calls-container">
              <a-collapse :bordered="false" expand-icon-position="left">
                <template #expand-icon="{ active }">
                   <icon-caret-right :style="{ transform: active ? 'rotate(90deg)' : 'none', marginRight: '8px', fontSize: '12px', color: '#999' }" />
                </template>
                <a-collapse-item v-for="(tool, idx) in msg.toolCalls" :key="idx" :header="`使用工具: ${tool.name || '未知工具'}`">
                  <div class="tool-detail">
                    <div class="tool-section">
                      <span class="tool-label">输入:</span>
                      <!-- 格式化展示 JSON -->
                      <pre class="code-block">{{ formatJson(tool.args) }}</pre>
                    </div>
                    <div class="tool-section" v-if="tool.result">
                      <span class="tool-label">结果:</span>
                      <pre class="code-block result">{{ tool.result }}</pre>
                    </div>
                  </div>
                </a-collapse-item>
              </a-collapse>
            </div>
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
import { IconRefresh, IconImage, IconLeft, IconSend, IconUser, IconCaretRight } from '@arco-design/web-vue/es/icon'
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

// 格式化 JSON
const formatJson = (jsonStr) => {
  try {
    // 如果是已经是对象，直接格式化
    if (typeof jsonStr === 'object') {
      return JSON.stringify(jsonStr, null, 2)
    }
    // 尝试解析字符串
    const obj = JSON.parse(jsonStr)
    return JSON.stringify(obj, null, 2)
  } catch (e) {
    // 解析失败，直接返回原字符串
    return jsonStr
  }
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

// 获取历史记录 (含工具调用合并逻辑)
const fetchHistory = async () => {
  try {
    const res = await getChatHistory(roleId.value)
    const processedMsgs = []
    let tempTool = null

    // 遍历原始消息
    for (const item of res) {
      if (item.role === 'system') continue // 跳过 system

      // 1. 工具调用请求 (Tool Call)
      if (item.toolCall) {
        try {
          // 解析参数，处理 LangChain4j 可能返回的数组结构
          let rawCall = item.toolCall
          let toolName = 'Tool Call'
          let toolArgs = item.toolCall

          // 尝试解析 JSON
          if (typeof rawCall === 'string') {
             try {
               const parsed = JSON.parse(rawCall)
               // 如果是数组且包含 id/name/arguments，说明是标准 ToolCall 结构
               if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
                 // 取第一个调用的 name 和 arguments
                 toolName = parsed[0].name
                 toolArgs = parsed[0].arguments
               }
             } catch(e) { /* ignore */ }
          }

          tempTool = {
            name: toolName,
            args: toolArgs,
            result: null
          }
        } catch (e) {
          tempTool = { name: 'Tool Call', args: item.toolCall, result: null }
        }
        continue // 暂存，不显示
      }

      // 2. 工具执行结果 (Tool Result)
      if (item.toolExecResult) {
        if (tempTool) {
          tempTool.result = item.toolExecResult
        } else {
          tempTool = { name: 'Tool Result', args: 'Unknown', result: item.toolExecResult }
        }
        continue // 暂存，不显示
      }

      // 3. 普通消息 (AI 回复或用户消息)
      if (item.role === 'assistant') {
        const msgObj = {
          id: item.id,
          role: item.role,
          content: item.content,
          loading: false,
          toolCalls: []
        }
        
        if (tempTool) {
          msgObj.toolCalls.push(tempTool)
          tempTool = null 
        }
        
        processedMsgs.push(msgObj)
      } else {
        if (tempTool) tempTool = null 
        
        processedMsgs.push({
          id: item.id,
          role: item.role,
          content: item.content,
          loading: false
        })
      }
    }

    messages.value = processedMsgs
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
    loading: true,
    toolCalls: [] 
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
  padding: 100px 20px 120px 20px; 
}

.message-list {
  max-width: 700px;
  margin: 0 auto;
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
  align-items: flex-start; /* Modified */
  width: 100%;
}

.message-item.user {
  flex-direction: row-reverse;
}

.content-wrapper {
  max-width: 75%;
  display: flex;
  flex-direction: column;
  align-items: flex-start; /* Modified */
}

.message-item.user .content-wrapper {
  align-items: flex-end; /* Added */
}

.bubble-name {
  font-size: 12px;
  color: #8D6E63;
  margin-bottom: 4px;
  margin-left: 4px;
}

/* 工具调用样式 - 附属标签风格 */
.tool-calls-container {
  margin-top: -6px;
  margin-left: 12px;
  margin-bottom: 4px;
  background: rgba(255, 255, 255, 0.85);
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-top: none;
  width: fit-content;
  max-width: 95%;
  font-size: 12px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.04);
  z-index: 0;
}

/* 覆盖 Arco Collapse 样式以适应半透明 */
.tool-calls-container :deep(.arco-collapse-item-header) {
  background: transparent;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  font-size: 13px;
  color: #555;
  padding: 8px 12px;
  border: none;
  display: flex;
  align-items: center;
}

/* 图标容器：固定宽度，防止挤压 */
.tool-calls-container :deep(.arco-collapse-item-icon) {
  margin-right: 10px !important;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0; /* 关键：防止被压缩导致重叠 */
}

/* 标题样式 */
.tool-calls-container :deep(.arco-collapse-item-header-title) {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.5;
  margin-left: 20px !important; /* 双重保险：给文字也加左边距 */
}

.tool-calls-container :deep(.arco-collapse-item-content) {
  background: rgba(255, 255, 255, 0.4);
  padding: 8px 12px;
  font-size: 12px;
}

.tool-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tool-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tool-label {
  font-weight: bold;
  color: #666;
}

.code-block {
  margin: 0;
  background: rgba(0,0,0,0.05);
  padding: 8px;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: monospace;
  color: #333;
}

.code-block.result {
  color: #0057b7; /* 稍微区分一下结果颜色 */
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
  position: relative;
  z-index: 1;
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
  padding: 20px 24px 24px 24px;
  background: linear-gradient(to top, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 100%);
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
