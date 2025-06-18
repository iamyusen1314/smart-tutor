/**
 * 🔍 检查DashScope API密钥权限和服务可用性
 * 验证各项服务的权限范围
 */

const axios = require('axios');

const API_KEY = 'sk-f4b85b5d7f084e5fb3c5bb0c0bb57aa4';

async function checkDashScopePermissions() {
  console.log('🔍 检查DashScope API权限和服务可用性...\n');
  
  const services = [
    {
      name: '大语言模型 (qwen-turbo)',
      url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      method: 'POST',
      data: {
        model: 'qwen-turbo',
        input: { messages: [{ role: 'user', content: '你好' }] }
      }
    },
    {
      name: '语音识别 (paraformer)',
      url: 'https://dashscope.aliyuncs.com/api/v1/services/audio/asr',
      method: 'POST',
      data: {
        model: 'paraformer-realtime-v2',
        input: {
          format: 'mp3',
          sample_rate: 16000,
          audio: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
        }
      }
    },
    {
      name: '语音合成 (cosyvoice)',
      url: 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts',
      method: 'POST',
      data: {
        model: 'cosyvoice-v1',
        input: { text: '你好' },
        parameters: {
          voice: 'longxiaobai',
          format: 'mp3'
        }
      }
    }
  ];
  
  for (const service of services) {
    try {
      console.log(`🧪 测试 ${service.name}...`);
      
      const response = await axios({
        method: service.method,
        url: service.url,
        data: service.data,
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log(`✅ ${service.name}: 权限正常`);
      console.log(`   状态码: ${response.status}`);
      console.log(`   请求ID: ${response.data.request_id || 'N/A'}`);
      
    } catch (error) {
      console.log(`❌ ${service.name}: 权限异常`);
      console.log(`   状态码: ${error.response?.status || 'N/A'}`);
      console.log(`   错误代码: ${error.response?.data?.code || 'N/A'}`);
      console.log(`   错误消息: ${error.response?.data?.message || error.message}`);
      
      if (error.response?.status === 401) {
        console.log(`   🔑 建议: 检查API密钥是否有${service.name}服务权限`);
      } else if (error.response?.status === 403) {
        console.log(`   🚫 建议: 当前账户可能没有该服务的使用权限`);
      } else if (error.response?.status === 400) {
        console.log(`   📝 建议: 请求格式可能有问题，但权限应该正常`);
      }
    }
    
    console.log('');
  }
  
  // 检查WebSocket权限
  console.log('🔗 检查WebSocket权限...');
  try {
    const WebSocket = require('ws');
    const ws = new WebSocket('wss://dashscope.aliyuncs.com/api-ws/v1/inference/', {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });
    
    ws.on('open', () => {
      console.log('✅ WebSocket: 连接成功，权限正常');
      ws.close();
    });
    
    ws.on('error', (error) => {
      console.log('❌ WebSocket: 连接失败');
      console.log(`   错误: ${error.message}`);
      if (error.message.includes('401')) {
        console.log('   🔑 建议: API密钥可能没有WebSocket权限');
      }
    });
    
    // 等待连接结果
    await new Promise(resolve => {
      setTimeout(resolve, 3000);
    });
    
  } catch (error) {
    console.log('❌ WebSocket测试失败:', error.message);
  }
}

// 运行检查
checkDashScopePermissions().then(() => {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 权限检查完成');
  console.log('');
  console.log('📋 后续建议:');
  console.log('1. 如果所有服务都报401错误 → 重新生成API密钥');
  console.log('2. 如果只有WebSocket报401错误 → 可能需要升级账户权限');
  console.log('3. 如果只有语音服务报错 → 检查语音服务是否已开通');
  console.log('4. 如果都正常 → 问题可能在代码实现上');
  console.log('='.repeat(60));
}); 