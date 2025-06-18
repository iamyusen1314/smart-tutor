/**
 * 🔍 详细调试WebSocket语音合成调用
 * 分析WebSocket失败的具体原因
 */

const axios = require('axios');

async function debugWebSocketTTS() {
  console.log('🔍 详细调试WebSocket语音合成...\n');
  
  const baseUrl = 'http://172.25.100.114:3000';
  
  try {
    console.log('🎯 发送语音合成请求（启用详细日志）...');
    
    const requestData = {
      text: '测试WebSocket调试',
      voice: 'longxiaobai',
      speed: 1.0,
      pitch: 0
    };
    
    console.log('📝 请求参数:', requestData);
    console.log('');
    
    // 发送请求并监控详细响应
    const startTime = Date.now();
    const response = await axios.post(`${baseUrl}/api/speech/synthesis`, requestData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 20000  // 更长的超时时间以观察WebSocket行为
    });
    
    const responseTime = Date.now() - startTime;
    const result = response.data;
    
    console.log('📊 语音合成详细结果:');
    console.log('   成功状态:', result.success ? '✅' : '❌');
    console.log('   客户端响应时间:', responseTime + 'ms');
    console.log('   服务器处理时间:', result.data?.responseTime + 'ms');
    console.log('   提供商:', result.data?.provider);
    console.log('   模型:', result.data?.model);
    console.log('   音色:', result.data?.voice);
    console.log('   处理后文本:', result.data?.processedText);
    console.log('   音频大小:', result.data?.audioSize, '字节');
    console.log('   音频URL类型:', result.data?.audioUrl ? result.data.audioUrl.substring(0, 30) + '...' : 'N/A');
    console.log('');
    
    console.log('🔍 质量检查详情:');
    if (result.data?.qualityCheck) {
      const qc = result.data.qualityCheck;
      console.log('   文件大小有效:', qc.isValidSize ? '✅' : '❌');
      console.log('   MP3格式有效:', qc.isValidMP3 ? '✅' : '❌');
      console.log('   音频质量:', qc.quality);
      console.log('   预估时长:', qc.estimatedDuration + 's');
    } else {
      console.log('   ❌ 无质量检查数据');
    }
    console.log('');
    
    // 分析失败原因
    if (result.data?.provider === 'mock') {
      console.log('🚨 分析：WebSocket调用失败，降级到模拟数据');
      console.log('');
      console.log('🔍 可能的WebSocket失败原因:');
      console.log('   1. 🔐 API权限问题 - 密钥可能没有语音合成权限');
      console.log('   2. 🌐 网络连接问题 - WebSocket握手失败');
      console.log('   3. 🎛️ 参数格式问题 - 请求格式不符合WebSocket API要求');
      console.log('   4. ⏰ 超时问题 - WebSocket连接或数据传输超时');
      console.log('   5. 🎵 音频数据问题 - 接收音频数据时出错');
      console.log('');
      
      console.log('🔧 建议的调试步骤:');
      console.log('   1. 检查阿里云控制台的API调用日志和错误信息');
      console.log('   2. 验证API密钥是否有cosyvoice服务权限');
      console.log('   3. 测试简化的WebSocket连接（最小参数）');
      console.log('   4. 检查网络防火墙是否阻止WebSocket连接');
      
      return {
        success: false,
        reason: 'websocket_failed',
        provider: result.data?.provider
      };
      
    } else if (result.data?.provider === 'alibaba-cloud') {
      console.log('🎉 WebSocket语音合成成功！');
      console.log('✅ 验证指标:');
      console.log(`   - 真实阿里云API调用 (${result.data.provider})`);
      console.log(`   - 音频大小: ${result.data.audioSize} 字节`);
      console.log(`   - 响应时间: ${responseTime}ms`);
      console.log(`   - 音频质量: ${result.data.qualityCheck?.quality}`);
      
      return {
        success: true,
        reason: 'websocket_success',
        provider: result.data?.provider,
        audioSize: result.data?.audioSize
      };
      
    } else {
      console.log('⚠️ 异常响应，提供商:', result.data?.provider);
      return {
        success: false,
        reason: 'unknown_provider',
        provider: result.data?.provider
      };
    }
    
  } catch (error) {
    console.error('❌ 调试过程失败:');
    console.error('   错误类型:', error.name);
    console.error('   错误消息:', error.message);
    
    if (error.response) {
      console.error('   HTTP状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   🔌 服务器连接被拒绝');
    } else if (error.code === 'TIMEOUT') {
      console.error('   ⏰ 请求超时');
    }
    
    return {
      success: false,
      reason: 'request_failed',
      error: error.message
    };
  }
}

// 运行详细调试
debugWebSocketTTS().then(result => {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 WebSocket语音合成调试总结:');
  console.log('   成功状态:', result.success ? '✅' : '❌');
  console.log('   失败原因:', result.reason);
  console.log('   提供商:', result.provider || 'N/A');
  if (result.audioSize) {
    console.log('   音频大小:', result.audioSize + ' 字节');
  }
  console.log('='.repeat(60));
  
  if (!result.success) {
    console.log('\n📋 下一步行动计划:');
    console.log('1. 检查阿里云百炼控制台的错误日志');
    console.log('2. 验证API密钥权限范围');
    console.log('3. 测试网络连接和防火墙设置');
    console.log('4. 考虑使用HTTP API作为备选方案');
  }
}); 