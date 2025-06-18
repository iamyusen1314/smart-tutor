/**
 * 学习报告0对6错问题 - 数据流完整调试脚本
 * 目标：找出真正的数据断点，避免重复修复已正确的逻辑
 */

const axios = require('axios');

const baseURL = 'http://localhost:3000/api';
const testUserId = 'debug_user_comprehensive';
const testPlanId = 'plan_comprehensive_2025';

// 测试数据配置
const mathQuestions = [
    { question: '5 + 3 = ?', answer: '8', isCorrect: true },
    { question: '7 + 4 = ?', answer: '11', isCorrect: true },
    { question: '9 + 2 = ?', answer: '10', isCorrect: false }, // 故意错误，正确答案是11
    { question: '6 + 1 = ?', answer: '7', isCorrect: true }
];

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function debugStep(stepName, fn) {
    console.log(`\n🔍 调试步骤: ${stepName}`);
    console.log('='.repeat(50));
    try {
        const result = await fn();
        console.log(`✅ ${stepName} - 成功`);
        return result;
    } catch (error) {
        console.error(`❌ ${stepName} - 失败:`, error.message);
        if (error.response?.data) {
            console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
        }
        return null;
    }
}

async function step1_checkInitialState() {
    console.log('检查系统初始状态...');
    
    // 检查全局记录
    const globalResponse = await axios.get(`${baseURL}/ai-chat/debug-records`);
    console.log('📊 全局记录状态:', {
        总记录数: globalResponse.data?.data?.globalRecordsCount || 0,
        当前用户记录数: globalResponse.data?.data?.userRecordsCount || 0
    });
    
    // 检查报告API当前状态
    try {
        const reportResponse = await axios.post(`${baseURL}/report/generate`, {
            userId: testUserId,
            planId: testPlanId
        });
        console.log('📊 当前报告状态:', reportResponse.data);
    } catch (error) {
        console.log('📊 当前报告API错误:', error.response?.data?.message || error.message);
    }
    
    return true;
}

async function step2_simulateLearningSession() {
    console.log('模拟完整学习会话...');
    
    const sessionResults = [];
    
    for (let i = 0; i < mathQuestions.length; i++) {
        const q = mathQuestions[i];
        console.log(`\n📝 处理第${i+1}题: ${q.question}`);
        
        // 1. AI聊天开始
        const chatStartResponse = await axios.post(`${baseURL}/ai-chat/answer`, {
            userId: testUserId,
            userInput: q.question,
            planId: testPlanId,
            currentStep: 'start'
        });
        
        console.log(`  📤 AI聊天开始响应:`, {
            状态: chatStartResponse.status,
            消息: chatStartResponse.data?.message || 'N/A'
        });
        
        // 2. 提交答案
        const answerResponse = await axios.post(`${baseURL}/ai-chat/answer`, {
            userId: testUserId,
            userInput: q.answer,
            planId: testPlanId,
            currentStep: 'answer_verification'
        });
        
        console.log(`  📤 答案验证响应:`, {
            状态: answerResponse.status,
            是否正确: answerResponse.data?.isCorrect,
            消息: answerResponse.data?.message?.substring(0, 100) + '...'
        });
        
        sessionResults.push({
            题目: q.question,
            答案: q.answer,
            预期正确性: q.isCorrect,
            实际响应: answerResponse.data?.isCorrect
        });
        
        await sleep(500); // 避免请求过快
    }
    
    console.log('\n📋 学习会话完整结果:');
    sessionResults.forEach((result, index) => {
        console.log(`  ${index+1}. ${result.题目} = ${result.答案} | 预期:${result.预期正确性} | 实际:${result.实际响应}`);
    });
    
    return sessionResults;
}

async function step3_checkDataPersistence() {
    console.log('检查数据持久化状态...');
    
    // 检查全局记录
    const globalResponse = await axios.get(`${baseURL}/ai-chat/debug-records`);
    const globalData = globalResponse.data?.data;
    
    console.log('📊 数据持久化状态:', {
        全局记录总数: globalData?.globalRecordsCount || 0,
        当前用户记录数: globalData?.userRecordsCount || 0,
        最新记录时间: globalData?.latestRecord?.timestamp,
        最新记录planId: globalData?.latestRecord?.planId
    });
    
    // 显示详细记录
    if (globalData?.userRecords && globalData.userRecords.length > 0) {
        console.log('\n📋 用户学习记录详情:');
        globalData.userRecords.forEach((record, index) => {
            console.log(`  ${index+1}. ${record.userInput} | 正确:${record.isCorrect} | planId:${record.planId}`);
        });
    } else {
        console.log('⚠️ 警告: 未找到用户学习记录');
    }
    
    return globalData;
}

async function step4_testReportGeneration() {
    console.log('测试报告生成...');
    
    // 测试有planId的报告生成
    console.log('\n🔎 测试有planId的报告生成:');
    try {
        const reportWithPlan = await axios.post(`${baseURL}/report/generate`, {
            userId: testUserId,
            planId: testPlanId
        });
        
        console.log('✅ 有planId报告结果:', {
            总题数: reportWithPlan.data?.data?.totalQuestions,
            正确数: reportWithPlan.data?.data?.correctAnswers,
            错误数: reportWithPlan.data?.data?.wrongAnswers,
            正确率: reportWithPlan.data?.data?.accuracyRate,
            详细记录数: reportWithPlan.data?.data?.detailedRecords?.length
        });
        
        if (reportWithPlan.data?.data?.detailedRecords) {
            console.log('📋 详细记录:');
            reportWithPlan.data.data.detailedRecords.forEach((record, index) => {
                console.log(`  ${index+1}. ${record.userInput} | 正确:${record.isCorrect}`);
            });
        }
    } catch (error) {
        console.error('❌ 有planId报告失败:', error.response?.data?.message || error.message);
    }
    
    // 测试无planId的报告生成
    console.log('\n🔎 测试无planId的报告生成:');
    try {
        const reportWithoutPlan = await axios.post(`${baseURL}/report/generate`, {
            userId: testUserId
        });
        
        console.log('✅ 无planId报告结果:', {
            总题数: reportWithoutPlan.data?.data?.totalQuestions,
            正确数: reportWithoutPlan.data?.data?.correctAnswers,
            错误数: reportWithoutPlan.data?.data?.wrongAnswers,
            正确率: reportWithoutPlan.data?.data?.accuracyRate,
            详细记录数: reportWithoutPlan.data?.data?.detailedRecords?.length
        });
    } catch (error) {
        console.error('❌ 无planId报告失败:', error.response?.data?.message || error.message);
    }
}

async function step5_identifyRootCause() {
    console.log('问题根因分析...');
    
    // 重新检查全局状态
    const globalResponse = await axios.get(`${baseURL}/ai-chat/debug-records`);
    const globalData = globalResponse.data?.data;
    
    console.log('\n🎯 根因分析结果:');
    
    // 分析1: 数据保存问题
    if (!globalData || globalData.globalRecordsCount === 0) {
        console.log('❌ 问题1: 学习记录根本没有保存到系统');
        console.log('   可能原因: AI聊天接口没有正确调用保存逻辑');
        return 'DATA_NOT_SAVED';
    }
    
    // 分析2: 用户隔离问题
    if (globalData.globalRecordsCount > 0 && globalData.userRecordsCount === 0) {
        console.log('❌ 问题2: 有全局记录但用户记录为0，用户ID不匹配');
        console.log('   可能原因: 保存时用户ID与查询时用户ID不一致');
        return 'USER_ID_MISMATCH';
    }
    
    // 分析3: planId匹配问题
    if (globalData.userRecordsCount > 0) {
        const userRecords = globalData.userRecords || [];
        const planIds = userRecords.map(r => r.planId);
        const uniquePlanIds = [...new Set(planIds)];
        
        console.log('📊 planId分析:', {
            用户记录总数: userRecords.length,
            不同planId数量: uniquePlanIds.length,
            planIds: uniquePlanIds,
            目标planId: testPlanId,
            是否匹配: uniquePlanIds.includes(testPlanId)
        });
        
        if (!uniquePlanIds.includes(testPlanId)) {
            console.log('❌ 问题3: planId不匹配，保存的planId与查询的planId不同');
            return 'PLAN_ID_MISMATCH';
        }
    }
    
    // 分析4: 统计逻辑问题
    const validRecords = globalData.userRecords?.filter(r => r.isCorrect !== null) || [];
    const correctCount = validRecords.filter(r => r.isCorrect === true).length;
    const wrongCount = validRecords.filter(r => r.isCorrect === false).length;
    
    console.log('📊 统计分析:', {
        有效记录数: validRecords.length,
        正确记录数: correctCount,
        错误记录数: wrongCount,
        预期正确数: 3,
        预期错误数: 1
    });
    
    if (validRecords.length > 0 && correctCount === 0 && wrongCount > 0) {
        console.log('❌ 问题4: 数据存在但统计异常，所有答案都被标记为错误');
        return 'STATISTICS_LOGIC_ERROR';
    }
    
    console.log('✅ 数据流基础正常，可能是报告生成逻辑问题');
    return 'REPORT_GENERATION_ERROR';
}

async function main() {
    console.log('🚀 开始学习报告数据流完整调试');
    console.log('目标: 找出0对6错问题的真正根源\n');
    
    await debugStep('步骤1: 检查初始状态', step1_checkInitialState);
    await debugStep('步骤2: 模拟学习会话', step2_simulateLearningSession);
    await debugStep('步骤3: 检查数据持久化', step3_checkDataPersistence);
    await debugStep('步骤4: 测试报告生成', step4_testReportGeneration);
    const rootCause = await debugStep('步骤5: 根因分析', step5_identifyRootCause);
    
    console.log('\n🎯 调试总结:');
    console.log('='.repeat(50));
    console.log(`根因分析结果: ${rootCause}`);
    
    if (rootCause) {
        console.log('\n🔧 下一步修复建议:');
        switch (rootCause) {
            case 'DATA_NOT_SAVED':
                console.log('- 检查ai-chat.js中学习记录保存逻辑');
                console.log('- 验证保存函数是否被正确调用');
                break;
            case 'USER_ID_MISMATCH':
                console.log('- 检查前端传递的userId参数');
                console.log('- 验证保存和查询时userId的一致性');
                break;
            case 'PLAN_ID_MISMATCH':
                console.log('- 检查planId生成和传递逻辑');
                console.log('- 确认前端和后端planId的同步机制');
                break;
            case 'STATISTICS_LOGIC_ERROR':
                console.log('- 检查isCorrect字段的赋值逻辑');
                console.log('- 验证答案验证算法的正确性');
                break;
            case 'REPORT_GENERATION_ERROR':
                console.log('- 检查report.js中的数据查询逻辑');
                console.log('- 验证统计计算的准确性');
                break;
        }
    }
    
    console.log('\n✅ 调试完成，请根据根因分析结果进行针对性修复');
}

main().catch(error => {
    console.error('💥 调试脚本执行失败:', error.message);
    process.exit(1);
}); 