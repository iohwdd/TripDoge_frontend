import axios from 'axios'
import { Message } from '@arco-design/web-vue'
import router from '@/router'

const service = axios.create({
  // 当使用 mockjs 时，通常不需要设置 baseURL 为绝对路径，
  // 只要 url 匹配 mock 定义的规则即可。
  baseURL: '/api', 
  timeout: 15000
})

// 请求拦截器
service.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  response => {
    const res = response.data
    
    // 这里的 code 逻辑需要根据后端约定，假设 200 是成功
    // 后端文档显示：code 200 为成功
    if (res.code !== 200) {
      Message.error(res.message || 'Error')

      // 10105: 用户未登录, 10106: 会话过期
      if (res.code === 10105 || res.code === 10106) {
        localStorage.removeItem('token')
        localStorage.removeItem('userInfo')
        router.push('/login')
      }
      return Promise.reject(new Error(res.message || 'Error'))
    } else {
      return res.data
    }
  },
  error => {
    Message.error(error.message || 'Request Error')
    return Promise.reject(error)
  }
)

export default service

