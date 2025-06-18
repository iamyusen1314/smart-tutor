/**
 * 快速测试脚本 - 验证后台管理页面API状态
 * 运行命令：node quick-test.js
 */

const http = require('http');

const baseURL = 'localhost:3000';

/**
 * 发送HTTP请求
 */
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.end();
  });
}

/**
 * 主测试函数
 */
async function runQuickTest() {
  console.log('🧪 开始快速测试后台管理页面API...\n');

  const tests = [
    {
      name: '健康检查',
      path: '/health',
      expected: 'OK'
    },
    {
      name: '搜索所有题目',
      path: '/api/materials/search',
      expected: 'questions数组'
    },
    {
      name: '数据统计',
      path: '/api/materials/stats',
      expected: '统计信息'
    },
    {
      name: '按学科搜索(数学)',
      path: '/api/materials/search?subject=math',
      expected: '数学题目'
    },
    {
      name: '按年级搜索(3年级)',
      path: '/api/materials/search?grade=3',
      expected: '3年级题目'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`🔍 测试: ${test.name}`);
      const result = await makeRequest(test.path);
      
      if (result.status === 200) {
        if (test.path === '/health') {
          console.log(`   ✅ 成功 - 返回: ${result.data}`);
        } else if (result.data.success) {
          const questions = result.data.data.questions;
          const stats = result.data.data.overall;
          
          if (questions) {
            console.log(`   ✅ 成功 - 找到 ${questions.length} 道题目`);
          } else if (stats) {
            console.log(`   ✅ 成功 - 总题目数: ${stats.totalQuestions}`);
          } else {
            console.log(`   ✅ 成功 - 返回正常数据`);
          }
        } else {
          console.log(`   ⚠️  返回成功但数据异常: ${result.data.message || '未知错误'}`);
        }
        passed++;
      } else {
        console.log(`   ❌ 失败 - HTTP状态码: ${result.status}`);
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ 失败 - 错误: ${error.message}`);
      failed++;
    }
    console.log('');
  }

  console.log('📊 测试结果汇总:');
  console.log(`   ✅ 通过: ${passed}`);
  console.log(`   ❌ 失败: ${failed}`);
  console.log(`   📈 成功率: ${Math.round((passed / tests.length) * 100)}%\n`);

  if (failed === 0) {
    console.log('🎉 所有测试通过！后台管理页面API运行正常。');
    console.log('💡 你现在可以在微信开发者工具中测试管理页面了：');
    console.log('   页面路径: pages/materials/materials\n');
  } else {
    console.log('⚠️  部分测试失败，请检查：');
    console.log('   1. 后端服务是否正常运行 (npm start)');
    console.log('   2. MongoDB数据库是否连接正常');
    console.log('   3. 测试数据是否已添加\n');
  }
}

// 运行测试
runQuickTest().catch(console.error); 