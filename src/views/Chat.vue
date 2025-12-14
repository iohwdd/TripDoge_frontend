<template>
  <div class="chat-container" :style="{ backgroundImage: currentRole?.bgImage }">
    <!-- 背景遮罩，提升文字可读性 -->
    <div class="bg-overlay"></div>

    <!-- 头部 (灵动岛风格悬浮) -->
    <div class="chat-header-wrapper">
      <div class="chat-header">
        <a-button type="text" class="back-btn" @click="backToRoles">
          <icon-left />
        </a-button>

        <div class="role-info" v-if="currentRole">
          <div class="avatar-ring" :style="{ borderColor: currentRole?.themeColor || 'var(--primary-6)' }">
             <a-avatar :size="40">
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
          <a-tooltip content="语音播报配置" position="bottom">
          <a-popover trigger="click" position="bottom" content-class="voice-popover">
            <a-button type="text" class="action-btn" shape="circle">
              <icon-sound v-if="isVoiceEnabled" />
              <icon-mute v-else />
            </a-button>
            <template #content>
              <div class="voice-config-panel">
                <div class="panel-row">
                  <span class="panel-label">语音播报</span>
                  <a-switch v-model="isVoiceEnabled" size="small" />
                </div>
                <div v-if="isVoiceEnabled" class="voice-selector">
                  <div class="panel-divider"></div>
                  <div class="option-title">音色选择</div>
                  <a-radio-group v-model="selectedVoice" direction="vertical" class="voice-radio-group">
                    <a-radio v-for="opt in voiceOptions" :key="opt.value" :value="opt.value">
                      <span class="voice-name">{{ opt.label }}</span>
                      <span class="voice-desc">{{ opt.desc }}</span>
                    </a-radio>
                  </a-radio-group>
                </div>
              </div>
            </template>
          </a-popover>
          </a-tooltip>

          <a-tooltip content="旅行计划师" position="bottom">
          <a-button type="text" class="action-btn" shape="circle" @click="isSkillPanelOpen = true">
            <icon-robot />
          </a-button>
          </a-tooltip>

          <a-tooltip content="重置记忆">
            <a-button type="text" class="action-btn" shape="circle" @click="handleReset">
              <icon-refresh />
            </a-button>
          </a-tooltip>
        </div>
      </div>
    </div>
    
    <!-- 技能抽屉 -->
    <a-drawer
      :visible="isSkillPanelOpen"
      @ok="isSkillPanelOpen = false"
      @cancel="isSkillPanelOpen = false"
      placement="right"
      :width="420"
      :footer="false"
      unmountOnClose
      @open="() => { activeTab = 'plan'; loadHistory(); }"
    >
      <template #title>
        <div class="drawer-title">
          <icon-robot class="drawer-icon" />
          <span>旅行定制师</span>
        </div>
      </template>

      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="plan" title="生成行程">
          <div class="skill-form">
            <a-form :model="tripPlan" layout="vertical">
              <a-form-item field="destination" label="目的地">
                <a-input v-model="tripPlan.destination" placeholder="例如：三亚、西安、东京" />
              </a-form-item>
              
              <a-form-item field="days" label="游玩天数">
                <a-input-number v-model="tripPlan.days" :min="1" :max="30" mode="button" />
              </a-form-item>
              
              <a-form-item field="people" label="出行人员">
                <a-radio-group v-model="tripPlan.people" type="button">
                  <a-radio value="单人">单人</a-radio>
                  <a-radio value="情侣">情侣</a-radio>
                  <a-radio value="亲子">亲子</a-radio>
                  <a-radio value="朋友">朋友</a-radio>
                  <a-radio value="家庭">家庭</a-radio>
                </a-radio-group>
              </a-form-item>
              
              <a-form-item field="budget" label="预算等级">
                 <a-radio-group v-model="tripPlan.budget" type="button">
                  <a-radio value="穷游">穷游</a-radio>
                  <a-radio value="适中">适中</a-radio>
                  <a-radio value="豪华">豪华</a-radio>
                </a-radio-group>
              </a-form-item>
              
              <a-form-item field="preferences" label="偏好 (多选)">
                <a-checkbox-group v-model="tripPlan.preferences">
                  <a-grid :cols="2" :colGap="12" :rowGap="12">
                    <a-grid-item v-for="opt in preferencesOptions" :key="opt">
                       <a-checkbox :value="opt">{{ opt }}</a-checkbox>
                    </a-grid-item>
                  </a-grid>
                </a-checkbox-group>
              </a-form-item>

              <div class="drawer-actions">
                <a-button type="primary" long @click="submitTripPlan" :disabled="!tripPlan.destination">
                  <template #icon><icon-send /></template>
                  生成行程方案
                </a-button>
              </div>
            </a-form>
          </div>
        </a-tab-pane>

        <a-tab-pane key="history" title="历史记录">
          <div class="history-panel">
            <a-spin :loading="historyLoading">
              <div v-if="historyList.length === 0" class="history-empty">暂无历史记录</div>
              <div v-else class="history-list">
                <div v-for="item in historyList" :key="item.id" class="history-item">
                  <div class="history-main">
                    <div class="history-title">{{ item.destination || '旅行方案' }}</div>
                    <div class="history-meta">
                      <span>{{ item.days ? item.days + '天' : '' }}</span>
                      <span v-if="item.people"> · {{ item.people }}</span>
                      <span v-if="item.createdAt"> · {{ item.createdAt }}</span>
                    </div>
                    <div class="history-tags" v-if="item.preferences && item.preferences.length">
                      <span v-for="tag in item.preferences" :key="tag" class="tag">{{ tag }}</span>
                    </div>
                  </div>
                  <div class="history-actions">
                    <a-button type="outline" size="small" @click="handlePreviewMd(item)">预览</a-button>
                    <a-button type="outline" size="small" @click="handleDownloadMd(item)">下载MD</a-button>
                  </div>
                </div>
              </div>
            </a-spin>
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-drawer>

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
            
            <!-- 工作流状态卡片 (新增) -->
            <div v-if="msg.workflow" class="workflow-card">
               <div class="workflow-header">
                 <span class="workflow-title">
                   <icon-robot style="margin-right:4px"/> 行程规划执行中
                 </span>
                 <span class="workflow-status" :class="msg.workflow.status">
                    {{ msg.workflow.status === 'running' ? '执行中...' : '已完成' }}
                 </span>
               </div>
               <div class="workflow-steps">
                  <div v-for="(step, idx) in msg.workflow.steps" :key="step.key" class="step-item" :class="step.status">
                     <div class="step-icon">
                        <component :is="step.status === 'finish' ? 'icon-check-circle' : (step.status === 'process' ? 'icon-loading' : step.icon)" :spin="step.status === 'process'" />
                     </div>
                     <span class="step-label">{{ step.label }}</span>
                     <div class="step-line" v-if="idx < msg.workflow.steps.length - 1"></div>
                  </div>
               </div>
            </div>
             <!-- 技能卡片 (用户侧展示) -->
             <div v-if="msg.type === 'skill_card'" class="skill-request-card">
                <div class="card-header">
                   <icon-robot /> 旅行定制需求
                </div>
                <div class="card-body">
                   <div class="info-row">
                      <span class="label">目的地：</span>
                      <span class="val">{{ msg.skillData.destination }}</span>
                   </div>
                   <div class="info-row">
                      <span class="label">天数：</span>
                      <span class="val">{{ msg.skillData.days }}天</span>
                   </div>
                   <div class="info-row">
                      <span class="label">人员：</span>
                      <span class="val">{{ msg.skillData.people }}</span>
                   </div>
                   <div class="info-tags" v-if="msg.skillData.preferences.length">
                      <span v-for="tag in msg.skillData.preferences" :key="tag" class="tag">{{ tag }}</span>
                   </div>
                </div>
             </div>

            <!-- AI 消息内容 -->
            <div class="content markdown-body" v-if="msg.loading && !msg.workflow">
              <div class="typing-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
            <div 
              class="content markdown-body" 
              v-else-if="msg.type !== 'skill_card'" 
              v-html="renderMarkdown(msg.content)"
              :style="msg.role === 'user' ? { background: currentRole?.themeColor || 'var(--primary-6)' } : {}"
            ></div>

            <!-- 工具调用展示区 (附属标签) -->
            <div v-if="msg.toolCalls && msg.toolCalls.length > 0" class="tool-calls-container">
              <a-collapse :bordered="false" expand-icon-position="right" class="minimal-collapse">
                <template #expand-icon="{ active }">
                   <icon-caret-right :style="{ transform: active ? 'rotate(90deg)' : 'none', color: '#ccc', fontSize: '12px' }" />
                </template>
                <a-collapse-item v-for="(tool, idx) in msg.toolCalls" :key="idx" header="工具调用">
                  <div class="tool-detail">
                    <div class="tool-row">
                       <span class="tool-key">工具:</span>
                       <span class="tool-text">{{ tool.name }}</span>
                    </div>
                    <div class="tool-row">
                       <span class="tool-key">输入:</span>
                       <span class="tool-text input">{{ formatJson(tool.args) }}</span>
                    </div>
                    <div class="tool-row" v-if="tool.result">
                       <span class="tool-key">输出:</span>
                       <span class="tool-text result">{{ tool.result }}</span>
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

  <!-- 旅行规划状态浮层，不占用对话区 -->
  <!-- 侧边工作流卡片，不占用聊天气泡 -->
  <!-- 旅行规划悬浮球 + 折叠面板 -->
  <transition name="fade">
    <div v-if="travelPlanIndicator.visible" class="travel-floating">
      <!-- 提示气泡 -->
      <div v-if="travelPlanIndicator.hintVisible" class="travel-hint">{{ travelPlanIndicator.hintText }}</div>

      <!-- 悬浮球 -->
      <div class="travel-ball" :class="travelPlanIndicator.status" @click="travelPlanIndicator.expanded = !travelPlanIndicator.expanded">
        <icon-loading v-if="travelPlanIndicator.status === 'running'" class="ball-icon" />
        <icon-check-circle v-else-if="travelPlanIndicator.status === 'success'" class="ball-icon" />
        <icon-close v-else class="ball-icon" />
      </div>
      <div class="travel-ball-caption">旅行计划师</div>

      <!-- 折叠面板 -->
      <div v-if="travelPlanIndicator.expanded" class="travel-panel">
        <div class="panel-header">
          <icon-robot /> 旅行计划师 · {{ travelPlanIndicator.status === 'running' ? '执行中' : (travelPlanIndicator.status === 'success' ? '已完成' : '异常') }}
        </div>
        <div class="panel-body">
          <div v-for="(step, idx) in travelPlanIndicator.steps" :key="step.key" class="panel-step">
            <div class="panel-step-icon" :class="step.status">
              <icon-check-circle v-if="step.status === 'finish'" />
              <icon-loading v-else-if="step.status === 'process'" />
              <icon-dot v-else />
            </div>
            <div class="panel-step-content">
              <div class="panel-step-title">{{ step.label }}</div>
              <div class="panel-step-status" :class="step.status">
                {{ step.status === 'finish' ? '完成' : (step.status === 'process' ? '进行中' : '待开始') }}
              </div>
            </div>
            <div v-if="idx < travelPlanIndicator.steps.length - 1" class="panel-step-line"></div>
          </div>
        </div>
        <div class="panel-footer" :class="travelPlanIndicator.status">
          <icon-loading v-if="travelPlanIndicator.status === 'running'" />
          <icon-check-circle v-else-if="travelPlanIndicator.status === 'success'" />
          <icon-close v-else />
          <span class="panel-footer-text">{{ travelPlanIndicator.text }}</span>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, nextTick, computed, watch, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getRoleDetail } from '@/api/role'
import { getChatHistory, resetChat } from '@/api/chat'
import { fetchSkillHistory, downloadSkillMd } from '@/api/skill'
import { runTravelPlanStream } from '@/api/travel'
import { Message } from '@arco-design/web-vue'
import { IconRefresh, IconImage, IconLeft, IconSend, IconUser, IconCaretRight, IconSound, IconMute, IconRobot, IconSearch, IconFilter, IconLocation, IconEdit, IconCheckCircle, IconLoading } from '@arco-design/web-vue/es/icon'
import MarkdownIt from 'markdown-it'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { adaptRoleData } from '@/utils/roleAdapter'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const userInfo = computed(() => userStore.userInfo)
const md = new MarkdownIt()

const roleId = computed(() => route.params.roleId)
const currentRole = ref(null)
const messages = ref([])
const inputText = ref('')
const sending = ref(false)
const chatBodyRef = ref(null)
// 工作流步骤（展示用）
const workflowSteps = [
  { key: 'search', label: '检索景点数据', status: 'pending', icon: 'icon-search' },
  { key: 'filter', label: '筛选优质POI', status: 'pending', icon: 'icon-filter' },
  { key: 'route', label: '规划最优路线', status: 'pending', icon: 'icon-location' },
  { key: 'generate', label: '生成详细路书', status: 'pending', icon: 'icon-edit' }
]
const travelPlanning = ref(false)
  const travelPlanIndicator = reactive({
    visible: false,
    status: 'idle', // running | success | error
    text: '',
    steps: JSON.parse(JSON.stringify(workflowSteps)),
    expanded: false,
    hintVisible: false,
    hintText: ''
  })

// 技能面板相关
const isSkillPanelOpen = ref(false)
const activeTab = ref('plan') // plan | history
const tripPlan = reactive({
  destination: '',
  days: 3,
  people: '情侣',
  budget: '适中',
  preferences: []
})
const preferencesOptions = ['自然风光', '人文古迹', '美食探店', '休闲度假', '极限运动', '网红打卡']

// 技能历史
const historyLoading = ref(false)
const historyList = ref([])

const loadHistory = async () => {
  historyLoading.value = true
  try {
    const data = await fetchSkillHistory(roleId.value)
    historyList.value = data || []
  } catch (e) {
    // ignore
  } finally {
    historyLoading.value = false
  }
}

const handleDownloadMd = async (item) => {
  try {
    const res = await downloadSkillMd(item.id) // 可能返回 Blob 或 { data: Blob }
    const data = res instanceof Blob ? res : (res?.data instanceof Blob ? res.data : res)
    const blob = data instanceof Blob ? data : new Blob([data], { type: 'text/markdown;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${item.destination || '旅行路书'}.md`
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (e) {
    Message.error('下载失败，请稍后重试')
  }
}

const handlePreviewMd = async (item) => {
  try {
    const url = item.mdUrl || item.mdPath
    if (!url) {
      Message.error('未获取到预览地址')
      return
    }
    window.open(url, '_blank')
  } catch (e) {
    Message.error('预览失败，请稍后重试')
  }
}

// 提交旅行规划
const submitTripPlan = async () => {
  if (travelPlanning.value) return
  isSkillPanelOpen.value = false
  travelPlanning.value = true
  travelPlanIndicator.visible = true
  travelPlanIndicator.status = 'running'
  travelPlanIndicator.text = '行程规划生成中...'
  travelPlanIndicator.steps = JSON.parse(JSON.stringify(workflowSteps))
  // 初始将第一个节点设为进行中
  if (travelPlanIndicator.steps.length > 0) {
    travelPlanIndicator.steps[0].status = 'process'
  }
  ensureRunningStep()
  travelPlanIndicator.expanded = false
  showTravelHint('行程规划生成中...')

  // 调用 SSE 版本的旅行规划
  const payload = {
    destination: tripPlan.destination,
    days: tripPlan.days,
    people: tripPlan.people,
    budget: tripPlan.budget,
    preferences: tripPlan.preferences,
    rawRequirement: `Destination:${tripPlan.destination};Days:${tripPlan.days};People:${tripPlan.people};Budget:${tripPlan.budget};Tags:${tripPlan.preferences.join(',')}`
  }

  const controller = runTravelPlanStream(roleId.value, payload, {
    onProgress: (data) => {
      travelPlanIndicator.visible = true
      travelPlanIndicator.status = 'running'
      const steps = travelPlanIndicator.steps
      if (data?.step) {
        const idx = steps.findIndex(s => s.key === data.step)
        if (idx >= 0) {
          steps[idx].status = 'finish'
          // 将下一个待开始的节点标记为进行中
          const next = steps.find(s => s.status === 'pending')
          if (next) next.status = 'process'
        }
      }
      ensureRunningStep()
      travelPlanIndicator.text = '行程规划执行中...'
      showTravelHint(travelPlanIndicator.text)
      },
    onMessage: (data) => {
      if (typeof data === 'string' && data) {
        travelPlanIndicator.text = data
        showTravelHint(data)
      } else if (data?.message) {
        travelPlanIndicator.text = data.message
        showTravelHint(data.message)
      }
    },
    onDone: (data) => {
      travelPlanIndicator.status = 'success'
      travelPlanIndicator.text = data?.message || '行程规划已生成，可在历史记录下载。'
      travelPlanIndicator.steps.forEach(s => s.status = 'finish')
      showTravelHint(travelPlanIndicator.text)
      setTimeout(() => { travelPlanIndicator.visible = false }, 8000)
      loadHistory()
      travelPlanning.value = false
    },
    onError: () => {
      travelPlanIndicator.status = 'error'
      travelPlanIndicator.text = '规划生成失败，请稍后重试。'
      travelPlanIndicator.steps.forEach((s, idx) => {
        s.status = idx === 0 ? 'finish' : 'pending'
      })
      ensureRunningStep()
      showTravelHint(travelPlanIndicator.text)
      setTimeout(() => { travelPlanIndicator.visible = false }, 8000)
      travelPlanning.value = false
    }
  })

  // 兜底：20 分钟后主动中断
  setTimeout(() => {
    if (travelPlanning.value) {
      controller.abort()
      travelPlanIndicator.status = 'error'
      travelPlanIndicator.text = '规划超时，请稍后重试。'
      ensureRunningStep()
      showTravelHint(travelPlanIndicator.text)
      setTimeout(() => { travelPlanIndicator.visible = false }, 8000)
      travelPlanning.value = false
  }
  }, 20 * 60 * 1000)
}

const showTravelHint = (text) => {
  travelPlanIndicator.hintText = text
  travelPlanIndicator.hintVisible = true
  setTimeout(() => {
    travelPlanIndicator.hintVisible = false
  }, 3000)
}

// 保证始终有一个“进行中”节点（除非全部完成/错误）
const ensureRunningStep = () => {
  if (travelPlanIndicator.status !== 'running') return
  const steps = travelPlanIndicator.steps
  const hasProcess = steps.some(s => s.status === 'process')
  if (!hasProcess) {
    const next = steps.find(s => s.status === 'pending')
    if (next) next.status = 'process'
  }
}

// 辅助函数：更新步骤状态（预留未来细粒度进度需要）
const updateWorkflowStep = (msg, key, status) => {
  const step = msg.workflow?.steps?.find(s => s.key === key)
  if (step) step.status = status
}


// 语音播报相关
const isVoiceEnabled = ref(false)
const audioContext = ref(null)
const nextAudioTime = ref(0)
const audioSources = ref([])
// 采样率，根据后端 QwenRealtimeTtsService 默认值设定，通常为 24000 或 16000
const AUDIO_SAMPLE_RATE = 24000 

const voiceOptions = [
  { label: '芊悦', value: 'Cherry', desc: '亲切自然' },
  { label: '苏瑶', value: 'Serena', desc: '温柔小姐姐' },
  { label: '晨煦', value: 'Ethan', desc: '阳光活力' },
  { label: '千雪', value: 'Chelsie', desc: '二次元' },
]
const selectedVoice = ref(localStorage.getItem('tripdog_voice') || 'Cherry')

watch(selectedVoice, (val) => {
  localStorage.setItem('tripdog_voice', val)
})

// 初始化音频上下文
const initAudioContext = () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!audioContext.value) {
    audioContext.value = new AudioContext()
  }
  if (audioContext.value.state === 'suspended') {
    audioContext.value.resume()
  }
}

// 播放 PCM 音频分片
const resetAudioPlayback = () => {
  // 停止现有的源，重置播放指针
  audioSources.value.forEach(src => {
    try { src.stop() } catch (e) { /* ignore */ }
  })
  audioSources.value = []
  nextAudioTime.value = 0
}

const playPcmChunk = (base64Data) => {
  if (!audioContext.value) return

  try {
    const binaryString = window.atob(base64Data)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    // 16-bit PCM little endian -> Float32
    const int16Data = new Int16Array(bytes.buffer)
    const float32Data = new Float32Array(int16Data.length)
    for (let i = 0; i < int16Data.length; i++) {
      // 归一化到 [-1.0, 1.0]
      float32Data[i] = int16Data[i] / 32768.0
    }

    const buffer = audioContext.value.createBuffer(1, float32Data.length, AUDIO_SAMPLE_RATE)
    buffer.getChannelData(0).set(float32Data)

    const source = audioContext.value.createBufferSource()
    source.buffer = buffer
    source.connect(audioContext.value.destination)
    audioSources.value.push(source)

    const currentTime = audioContext.value.currentTime
    // 如果下一次播放时间小于当前时间，说明发生了延迟或刚开始，立即播放
    if (nextAudioTime.value < currentTime) {
      nextAudioTime.value = currentTime
    }
    
    source.start(nextAudioTime.value)
    nextAudioTime.value += buffer.duration
  } catch (e) {
    console.error('Audio decode error:', e)
  }
}

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

// 返回角色列表
const backToRoles = () => {
  if (route.name !== 'roles') {
    router.push('/roles')
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
  if (isVoiceEnabled.value) {
    resetAudioPlayback()
  }

  // 初始化音频环境
  if (isVoiceEnabled.value) {
    initAudioContext()
    nextAudioTime.value = 0 // 重置播放时间戳
  }
  
  messages.value.push({
    id: Date.now(),
    role: 'user',
    content: text,
    loading: false
  })
  
  inputText.value = ''
  scrollToBottom()
  
  sending.value = true
  
  // 使用 reactive 对象确保深层响应式，并直接引用
  const aiMsg = reactive({
    id: Date.now() + 1,
    role: 'assistant',
    content: '',
    loading: true,
    toolCalls: [] 
  })
  messages.value.push(aiMsg)
  
  scrollToBottom()

  const token = localStorage.getItem('token')
  const formData = new FormData()
  formData.append('message', text)
  if (isVoiceEnabled.value) {
    formData.append('streamAudio', true)
    formData.append('voice', selectedVoice.value)
  }
  
  try {
    await fetchEventSource(`/api/chat/${roleId.value}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData,
      async onopen(response) {
        if (response.ok) {
          aiMsg.loading = false
          return
        } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
           throw new Error('Client Error')
        }
      },
      onmessage(msg) {
        // 优先处理音频事件
        if (msg.event === 'audio') {
           if (isVoiceEnabled.value) {
             try {
                const audioData = JSON.parse(msg.data)
                if (audioData.audio_delta) {
                    playPcmChunk(audioData.audio_delta)
                }
             } catch(e) { /* ignore */ }
           }
           return
        }

        // 亲密度提示事件：不进入聊天气泡，触发 UI 提示
        if (msg.event === 'intimacy') {
          try {
            const dataObj = JSON.parse(msg.data)
            if (dataObj && typeof dataObj === 'object') {
              const delta = dataObj.delta ?? 0
              const intimacy = dataObj.intimacy
              // 更新当前角色的亲密度展示（若有）
              if (typeof intimacy === 'number' && currentRole.value && currentRole.value.id === Number(roleId.value)) {
                currentRole.value.intimacy = intimacy
              }
              // 触发头像气泡提示（假设前端有全局事件或本地状态，这里用简单消息提示代替）
              Message.success(`亲密度 +${delta}`)
            }
          } catch (e) {
            // ignore parsing errors
          }
          return
        }

        if (msg.data === '[DONE]') {
          sending.value = false
          return
        }
        
        const dataStr = msg.data
        let isToolMsg = false
        
        // 尝试解析 JSON
        try {
            // 不再限制以 { 开头，直接尝试解析
            const dataObj = JSON.parse(dataStr)
            
            // 检查是否为对象
            if (dataObj && typeof dataObj === 'object') {
                // 检查是否包含工具相关字段 (兼容驼峰和下划线)
                const toolCallRaw = dataObj.toolCall || dataObj.tool_call
                const toolResultRaw = dataObj.toolExecResult || dataObj.tool_exec_result || dataObj.toolResult || dataObj.tool_result

                if (toolCallRaw || toolResultRaw) {
                    isToolMsg = true
                    
                    // 1. 处理工具调用 (Tool Call)
                    if (toolCallRaw) {
                        let toolName = 'Tool Call'
                        let toolArgs = toolCallRaw
                        
                        // 如果是字符串，尝试二次解析
                        if (typeof toolCallRaw === 'string') {
                            try {
                                // 尝试解析内部的 JSON 字符串
                                const parsed = JSON.parse(toolCallRaw)
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                    toolName = parsed[0].name || toolName
                                    toolArgs = parsed[0].arguments || toolArgs
                                } else if (!Array.isArray(parsed)) {
                                    toolName = parsed.name || toolName
                                    toolArgs = parsed.arguments || toolArgs
                                }
                            } catch (e) {
                                // 二次解析失败，使用原始字符串
                            }
                        } else if (typeof toolCallRaw === 'object') {
                             // 如果直接传回了对象
                             if (Array.isArray(toolCallRaw) && toolCallRaw.length > 0) {
                                 toolName = toolCallRaw[0].name || toolName
                                 toolArgs = toolCallRaw[0].arguments || toolArgs
                             } else {
                                 toolName = toolCallRaw.name || toolName
                                 toolArgs = toolCallRaw.arguments || toolArgs
                             }
                        }

                        // 推入数组
                        aiMsg.toolCalls.push({
                            name: toolName,
                            args: toolArgs,
                            result: null
                        })
                    }

                    // 2. 处理工具结果 (Tool Result)
                    if (toolResultRaw) {
                        const tools = aiMsg.toolCalls
                        // 将结果绑定到最近的一个工具调用上
                        if (tools.length > 0) {
                            tools[tools.length - 1].result = toolResultRaw
                        }
                    }
                }
            }
        } catch (e) {
            // JSON 解析失败，说明是普通文本
        }

        // 如果不是工具消息，则认为是 AI 的普通回复文本
        if (!isToolMsg) {
           aiMsg.content += dataStr
        }
        scrollToBottom()
      },
      onerror(err) {
        console.error('SSE Error:', err)
        sending.value = false
        throw err
      }
    })
  } catch (err) {
    aiMsg.loading = false
    if (!aiMsg.content) {
        aiMsg.content = '连接断开，请重试。'
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

/* 工具调用样式 - 附属标签风格 (优化版) */
.tool-calls-container {
  margin-top: 2px; 
  margin-left: 0;
  margin-bottom: 8px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
  overflow: hidden;
  border: none; 
  min-width: 120px; /* 给一个最小宽度 */
  width: fit-content; 
  max-width: 100%;
  font-size: 12px;
  z-index: 0;
}

.tool-calls-container:hover {
    background: rgba(0, 0, 0, 0.06);
}

/* 极简折叠面板 */
.minimal-collapse :deep(.arco-collapse-item-header) {
  background: transparent;
  border-bottom: none;
  font-size: 12px;
  color: #999;
  padding: 4px 8px; /* 增加垂直padding */
  min-height: 28px; /* 增加最小高度 */
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

/* 调整图标和标题 */
.minimal-collapse :deep(.arco-collapse-item-header-title) {
  font-weight: normal;
  margin-right: 24px; /* 增加右边距，防止与箭头重叠 */
  font-family: monospace;
  line-height: 20px;
}

/* 内容区域优化 */
.minimal-collapse :deep(.arco-collapse-item-content) {
  background: transparent;
  padding: 0 8px 6px 8px;
  font-size: 12px;
  border-top: none;
}

.tool-detail {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 2px;
}

.tool-row {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    overflow: hidden;
}

.tool-key {
    color: #999;
    flex-shrink: 0;
    font-size: 11px;
    width: 32px; /* 对齐标签 */
    text-align: right;
}

/* 移除Input/Output标签，改用更自然的文本流 */
.tool-tag {
    display: none;
}

.tool-text {
    font-family: monospace;
    color: #777;
    white-space: pre-wrap;
    word-break: break-all;
    line-height: 1.3;
    font-size: 11px;
}

.tool-text.input {
    color: #666;
}

.tool-text.result {
    color: #444;
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

/* 语音配置面板样式 */
.voice-config-panel {
  width: 200px;
  padding: 4px;
}

.panel-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.panel-label {
  font-size: 14px;
  color: #1d2129;
}

.panel-divider {
  height: 1px;
  background-color: #f2f3f5;
  margin: 8px 0;
}

.option-title {
  font-size: 12px;
  color: #86909c;
  margin-bottom: 8px;
}

.voice-radio-group {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.voice-radio-group :deep(.arco-radio) {
  margin-right: 0;
  padding: 4px 0;
}

.voice-name {
  font-size: 14px;
  color: #1d2129;
  margin-right: 8px;
}

.voice-desc {
  font-size: 12px;
  color: #86909c;
}

/* 旅行规划浮层 */
.travel-floating {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 20;
}
.travel-chip {
  display: none; /* placeholder old style removed */
}
.travel-floating {
  position: fixed;
  bottom: 88px;
  right: 90px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
.travel-hint {
  background: rgba(0,0,0,0.78);
  color: #fff;
  padding: 6px 10px;
  border-radius: 10px;
  font-size: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  max-width: 260px;
}
.travel-ball {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  box-shadow: 0 6px 18px rgba(0,0,0,0.12);
  border: 1px solid #ebedf0;
  cursor: pointer;
  transition: transform 0.15s ease;
}
.travel-ball:hover {
  transform: scale(1.04);
}
.travel-ball.running { color: #165dff; }
.travel-ball.success { color: #00b42a; }
.travel-ball.error { color: #f53f3f; }
.ball-icon { font-size: 20px; }
.travel-ball-caption {
  font-size: 11px;
  color: #666;
  margin-top: -4px;
}
.travel-panel {
  width: 260px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.12);
  border: 1px solid #ebedf0;
  overflow: hidden;
}
.panel-header {
  padding: 10px 12px;
  font-weight: 600;
  font-size: 13px;
  color: #1d2129;
  border-bottom: 1px solid #f2f3f5;
  display: flex;
  gap: 6px;
  align-items: center;
}
.panel-body {
  padding: 12px 12px 6px 12px;
}
.panel-step {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  position: relative;
}
.panel-step + .panel-step {
  margin-top: 10px;
}
.panel-step-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f2f3f5;
  color: #b4b8bf;
  font-size: 14px;
}
.panel-step-icon.process {
  background: #e8f3ff;
  color: #165dff;
}
.panel-step-icon.finish {
  background: #e8ffea;
  color: #00b42a;
}
.panel-step-content {
  flex: 1;
}
.panel-step-title {
  font-size: 13px;
  color: #1d2129;
}
.panel-step-status {
  font-size: 11px;
  color: #86909c;
}
.panel-step-status.process {
  color: #165dff;
}
.panel-step-status.finish {
  color: #00b42a;
}
.panel-step-line {
  position: absolute;
  left: 12px;
  top: 24px;
  width: 1px;
  height: calc(100% - 24px);
  background: #f2f3f5;
}
.panel-footer {
  padding: 10px 12px;
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  border-top: 1px solid #f2f3f5;
}
.panel-footer.running { color: #165dff; }
.panel-footer.success { color: #00b42a; }
.panel-footer.error { color: #f53f3f; }
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* 技能抽屉样式 */
.drawer-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
}

.drawer-icon {
  color: var(--primary-6);
  font-size: 20px;
}

.skill-form {
  padding: 8px 4px;
}

.drawer-actions {
  margin-top: 32px;
}

.history-panel {
  padding: 8px 4px;
}

.history-empty {
  color: #86909c;
  font-size: 13px;
  padding: 12px;
  text-align: center;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  border: 1px solid #f2f3f5;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
}

.history-title {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
}

.history-meta {
  font-size: 12px;
  color: #86909c;
}

.history-tags {
  margin-top: 6px;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.history-tags .tag {
  background: #f2f3f5;
  color: #4e5969;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.history-actions {
  display: flex;
  gap: 8px;
}

/* 技能请求卡片 (用户侧) */
.skill-request-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.05);
  overflow: hidden;
  width: 240px;
  border: 1px solid #f2f3f5;
}

.skill-request-card .card-header {
  background: var(--primary-1);
  color: var(--primary-6);
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.skill-request-card .card-body {
  padding: 12px;
  font-size: 13px;
  color: #4e5969;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.info-row .label {
  color: #86909c;
}

.info-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.info-tags .tag {
  background: #f2f3f5;
  color: #4e5969;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}

/* 工作流状态卡片 (AI侧) */
.workflow-card {
  background: #fff;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  width: 100%;
  border: 1px solid #e5e6eb;
}

.workflow-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #1d2129;
}

.workflow-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: #e8ffea;
  color: #00b42a;
}
.workflow-status.running {
  background: #e8f3ff;
  color: #165dff;
}
.workflow-status.error {
  background: #ffece8;
  color: #f53f3f;
}

.workflow-steps {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  position: relative;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
  position: relative;
  z-index: 1;
}

.step-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f2f3f5;
  color: #86909c;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.3s;
}

.step-item.process .step-icon {
  background: #e8f3ff;
  color: #165dff;
  box-shadow: 0 0 0 4px rgba(22,93,255,0.1);
}

.step-item.finish .step-icon {
  background: #e8ffea;
  color: #00b42a;
}

.step-label {
  font-size: 11px;
  color: #86909c;
  transform: scale(0.9);
  white-space: nowrap;
}

.step-item.process .step-label {
  color: #165dff;
  font-weight: 600;
}

.step-line {
  position: absolute;
  top: 12px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: #f2f3f5;
  z-index: -1;
}

.step-item.finish .step-line {
  background: #e8ffea; 
}
/* 修正线段颜色逻辑：只有当当前节点和下一个节点都完成时，线段才变绿。这里简化处理，不做太复杂 */
</style>
