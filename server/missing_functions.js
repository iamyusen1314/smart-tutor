/**
 * 生成模拟AI响应 - 根据场景和提示词返回相应的JSON格式响应
 */
function generateMockResponse(prompt, scenario) {
  console.log(`🎭 生成${scenario}场景的模拟AI响应`)
  
  // 根据不同场景生成不同格式的响应
  switch (scenario) {
    case 'QUESTION_GENERATION':
      return JSON.stringify({
        questions: [
          {
            content: "小明买了3包糖果，每包有8颗，一共买了多少颗糖果？",
            type: "application",
            options: [],
            answer: "24颗",
            explanation: "这是一道乘法应用题。3包糖果，每包8颗，用乘法计算：3 × 8 = 24颗。",
            difficulty: "medium",
            knowledgePoints: ["乘法运算", "应用题"],
            estimatedTime: 3,
            hints: ["想一想，每包8颗，3包是多少颗？", "可以用乘法来计算"]
          },
          {
            content: "计算：15 ÷ 3 = ?",
            type: "calculation",
            options: [],
            answer: "5",
            explanation: "15除以3等于5。可以这样想：5 × 3 = 15，所以15 ÷ 3 = 5。",
            difficulty: "easy",
            knowledgePoints: ["除法运算"],
            estimatedTime: 2,
            hints: ["想想几乘以3等于15？", "除法是乘法的逆运算"]
          },
          {
            content: "小红有20元钱，买了一本书花了12元，还剩多少钱？",
            type: "application",
            options: [],
            answer: "8元",
            explanation: "这是减法应用题。小红原来有20元，花了12元，用减法计算：20 - 12 = 8元。",
            difficulty: "easy",
            knowledgePoints: ["减法运算", "应用题"],
            estimatedTime: 2,
            hints: ["原来有20元，花了12元，用什么方法计算？", "想想减法的意义"]
          }
        ]
      })
      
    case 'CHAT':
    case 'QUICK_ASSIST':
      return "你好！我是你的AI小老师。我看到你提出了问题，让我来帮助你一步步解决。请告诉我你遇到了什么困难，我会耐心引导你找到答案的。"
      
    case 'DEEP_ANALYSIS':
      return JSON.stringify({
        overallAssessment: "学生整体表现良好，在基础运算方面较为扎实",
        strengths: ["基础加减法熟练", "对简单应用题理解正确"],
        weaknesses: ["乘除法运算需要加强", "复杂应用题分析能力有待提高"],
        improvementSuggestions: {
          immediate: ["加强乘法口诀练习", "多做简单的乘除法题目"],
          longTerm: ["培养数学思维能力", "提高解题分析能力"]
        },
        focusAreas: ["乘除法运算", "应用题分析"],
        practiceRecommendations: ["每天练习10道乘除法", "结合生活实际理解应用题"]
      })
      
    default:
      return "AI服务正在为您分析，请稍等..."
  }
}

// 还需要添加其他缺失的函数
function buildRegenerationPrompt(originalQuestion, reason, currentAccuracy) {
  return `请基于原题目重新生成一道类似的题目：${originalQuestion.content}。原因：${reason}，当前正确率：${currentAccuracy}`
}

function getImprovementStrategy(reason) {
  const strategies = {
    'too_easy': '增加题目难度，添加更多计算步骤',
    'too_hard': '降低题目难度，提供更多提示',
    'unclear': '优化题目表述，使语言更清晰'
  }
  return strategies[reason] || '根据学生反馈调整题目'
}

function buildChatPrompt(question, studentInput, chatHistory) {
  let prompt = `你是一位耐心的小学老师，正在与学生对话。`
  
  if (question) {
    prompt += `\n学生遇到的题目：${question}`
  }
  
  if (studentInput) {
    prompt += `\n学生的想法/回答：${studentInput}`
  }
  
  if (chatHistory && chatHistory.length > 0) {
    prompt += `\n之前的对话历史：${chatHistory.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n')}`
  }
  
  prompt += `\n请以鼓励和引导的方式回复学生，不要直接给出答案，而是引导学生思考。`
  
  return prompt
}

function buildAnalysisPrompt(learningData, timeRange) {
  return `请分析学生在${timeRange}内的学习数据：${JSON.stringify(learningData)}`
}

function parseAnalysisResponse(aiResponse) {
  try {
    return JSON.parse(aiResponse)
  } catch (error) {
    return {
      overallAssessment: aiResponse,
      strengths: ["数据分析中..."],
      weaknesses: ["数据分析中..."],
      improvementSuggestions: {
        immediate: ["数据分析中..."],
        longTerm: ["数据分析中..."]
      }
    }
  }
} 