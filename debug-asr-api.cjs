/**
 * 🎤 直接测试阿里云语音识别API
 * 用于调试API调用问题
 */

const axios = require('axios');

async function testDashScopeASRAPI() {
  console.log('🔍 直接测试阿里云DashScope ASR API...\n');
  
  const apiKey = 'sk-f4b85b5d7f084e5fb3c5bb0c0bb57aa4';
  const baseUrl = 'https://dashscope.aliyuncs.com/api/v1/services/audio/asr';
  
  // 创建测试用的音频数据（模拟MP3格式）
  const mockAudioData = Buffer.from([
    0xFF, 0xFB, 0x90, 0x00, // MP3 header
    ...Array(2000).fill(0).map(() => Math.floor(Math.random() * 256))
  ]).toString('base64');
  
  console.log('🔑 API密钥:', 'sk-f4b8***');
  console.log('🌐 API端点:', baseUrl);
  console.log('📝 音频数据长度:', mockAudioData.length, '字符');
  console.log('');
  
  // 测试请求数据
  const requestData = {
    model: 'paraformer-realtime-v2',
    input: {
      format: 'mp3',
      sample_rate: 16000,
      audio: mockAudioData
    },
    parameters: {
      enable_words: true,
      enable_punctuation: true,
      enable_vad: true
    }
  };
  
  console.log('📤 请求配置:');
  console.log('   模型:', requestData.model);
  console.log('   格式:', requestData.input.format);
  console.log('   采样率:', requestData.input.sample_rate);
  console.log('   音频长度:', requestData.input.audio.length);
  console.log('');
  
  try {
    console.log('🚀 发送API请求...');
    const startTime = Date.now();
    
    const response = await axios.post(baseUrl, requestData, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });
    
    const responseTime = Date.now() - startTime;
    
    console.log('✅ API调用成功!');
    console.log('📊 响应信息:');
    console.log('   状态码:', response.status);
    console.log('   响应时间:', responseTime + 'ms');
    console.log('   响应头:', JSON.stringify(response.headers, null, 2));
    console.log('');
    
    console.log('📥 响应数据:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // 解析识别结果
    if (response.data && response.data.output) {
      const result = response.data.output;
      if (result.sentence) {
        console.log('\n🎉 识别成功!');
        console.log('   识别文字:', result.sentence);
        return true;
      } else if (result.text) {
        console.log('\n🎉 识别成功!');
        console.log('   识别文字:', result.text);
        return true;
      } else {
        console.log('\n⚠️ 响应格式异常，但API调用成功');
        return false;
      }
    } else {
      console.log('\n⚠️ 响应数据格式异常');
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ API调用失败:');
    console.error('   错误类型:', error.name);
    console.error('   错误消息:', error.message);
    
    if (error.response) {
      console.error('   HTTP状态:', error.response.status);
      console.error('   状态文本:', error.response.statusText);
      console.error('   响应头:', JSON.stringify(error.response.headers, null, 2));
      console.error('   响应数据:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('   请求错误:', error.request.response || '无响应');
    }
    
    if (error.code) {
      console.error('   错误代码:', error.code);
    }
    
    console.log('\n🔍 可能的解决方案:');
    if (error.response?.status === 401) {
      console.log('   - 检查API密钥是否正确');
      console.log('   - 确认API密钥权限是否包含语音识别服务');
    } else if (error.response?.status === 400) {
      console.log('   - 检查请求格式是否正确');
      console.log('   - 确认音频数据格式是否支持');
      console.log('   - 检查模型名称是否正确');
    } else if (error.response?.status === 429) {
      console.log('   - API调用频率过高，需要等待或升级配额');
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.log('   - 检查网络连接');
      console.log('   - 确认API端点URL是否正确');
    } else {
      console.log('   - 查看阿里云DashScope控制台获取更多信息');
      console.log('   - 检查账户余额和服务状态');
    }
    
    return false;
  }
}

// 运行测试
testDashScopeASRAPI().then(success => {
  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('🎉 阿里云ASR API测试: 成功 ✅');
    console.log('API配置正确，可以正常识别语音！');
  } else {
    console.log('❌ 阿里云ASR API测试: 失败');
    console.log('请根据上述错误信息进行修复...');
  }
  console.log('='.repeat(60));
  
  process.exit(success ? 0 : 1);
}); 