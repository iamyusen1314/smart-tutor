/**
 * 🔍 调试服务器环境变量配置
 * 检查API密钥是否正确传递
 */

const axios = require('axios');

async function debugEnvironmentVars() {
  console.log('🔍 检查服务器环境变量配置...\n');
  
  // 检查本地环境变量
  console.log('📋 本地环境变量:');
  console.log('   DASHSCOPE_API_KEY:', process.env.DASHSCOPE_API_KEY ? 'sk-f4b8***' : '❌ 未设置');
  console.log('');
  
  try {
    // 创建调试接口来获取服务器环境信息
    console.log('🌐 请求服务器调试信息...');
    
    const response = await axios.get('http://172.25.100.114:3000/api/speech/status');
    const data = response.data.data;
    
    console.log('📊 服务器语音服务状态:');
    console.log('   配置状态:', data.configured ? '✅ 已配置' : '❌ 未配置');
    console.log('   提供商:', data.speechSynthesis?.provider);
    console.log('   版本:', data.version);
    console.log('');
    
    // 测试语音合成配置检查
    if (!data.configured) {
      console.log('🚨 API密钥配置问题检测:');
      console.log('   1. 环境变量 DASHSCOPE_API_KEY 未传递到服务器进程');
      console.log('   2. 或者API密钥格式不符合验证逻辑');
      console.log('');
      
      console.log('🔧 解决方案:');
      console.log('   1. 重新启动服务器，确保环境变量正确传递:');
      console.log('      cd server && DASHSCOPE_API_KEY="sk-f4b85b5d7f084e5fb3c5bb0c0bb57aa4" npm start');
      console.log('   2. 或者在代码中临时硬编码API密钥进行测试');
      
      return false;
    } else {
      console.log('✅ API密钥配置正确，问题可能在API调用逻辑');
      return true;
    }
    
  } catch (error) {
    console.error('❌ 无法获取服务器状态:', error.message);
    return false;
  }
}

// 运行调试
debugEnvironmentVars().then(configOk => {
  console.log('\n' + '='.repeat(50));
  if (configOk) {
    console.log('✅ 环境变量配置正确');
    console.log('问题可能在WebSocket或API调用逻辑');
  } else {
    console.log('❌ 环境变量配置有问题');
    console.log('需要先修复API密钥传递问题');
  }
  console.log('='.repeat(50));
}); 