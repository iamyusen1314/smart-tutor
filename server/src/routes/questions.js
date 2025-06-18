/**
 * 题库管理路由
 * 支持题目的增删改查、批量导入、智能审核等功能
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const XLSX = require('xlsx');

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/questions/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.includes('sheet') || file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('只支持Excel和JSON格式文件'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

/**
 * @api {get} /api/questions/stats 获取题库统计信息
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      totalQuestions: 156,
      pendingReview: 23,
      approved: 120,
      rejected: 13,
      todayReviewed: 8,
      aiAccuracy: 0.89
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取题库统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计信息失败'
    });
  }
});

/**
 * @api {get} /api/questions/list 获取题目列表
 */
router.get('/list', async (req, res) => {
  try {
    const {
      page = 1,
      size = 20,
      keyword = '',
      subject = '',
      grade = '',
      difficulty = '',
      reviewStatus = ''
    } = req.query;

    // 模拟题目数据
    const mockQuestions = [
      {
        id: 1,
        content: '计算：125 + 78 = ?',
        type: 'calculation',
        subject: 'math',
        grade: 3,
        difficulty: 'easy',
        reviewStatus: 'approved',
        qualityScore: 0.95,
        knowledgePoints: ['加法运算', '三位数加法'],
        aiReviewed: true,
        createDate: '2024-01-15T10:30:00Z'
      },
      {
        id: 2,
        content: '下列词语中读音正确的是（）',
        type: 'choice',
        subject: 'chinese',
        grade: 4,
        difficulty: 'medium',
        reviewStatus: 'pending',
        qualityScore: 0.78,
        knowledgePoints: ['拼音', '声母韵母'],
        aiReviewed: false,
        createDate: '2024-01-14T14:20:00Z'
      },
      {
        id: 3,
        content: 'What color is the sky?',
        type: 'choice',
        subject: 'english',
        grade: 2,
        difficulty: 'easy',
        reviewStatus: 'approved',
        qualityScore: 0.88,
        knowledgePoints: ['颜色词汇', '日常对话'],
        aiReviewed: true,
        createDate: '2024-01-13T09:15:00Z'
      }
    ];

    // 简单的筛选逻辑
    let filteredQuestions = mockQuestions;
    
    if (keyword) {
      filteredQuestions = filteredQuestions.filter(q => 
        q.content.includes(keyword) || 
        q.knowledgePoints.some(kp => kp.includes(keyword))
      );
    }
    
    if (subject) {
      filteredQuestions = filteredQuestions.filter(q => q.subject === subject);
    }

    // 分页
    const total = filteredQuestions.length;
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + parseInt(size);
    const questions = filteredQuestions.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        questions,
        total,
        page: parseInt(page),
        size: parseInt(size)
      }
    });
  } catch (error) {
    console.error('获取题目列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取题目列表失败'
    });
  }
});

/**
 * @api {post} /api/questions/import 批量导入题目
 */
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    const { file } = req;
    const { aiReview, autoClassify } = req.body;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: '请上传文件'
      });
    }

    // 模拟导入处理
    const importedCount = Math.floor(Math.random() * 50) + 10; // 10-60道题
    const approvedCount = Math.floor(importedCount * 0.8);
    const pendingCount = importedCount - approvedCount;

    res.json({
      success: true,
      data: {
        importedCount,
        approvedCount,
        pendingCount
      },
      message: `成功导入 ${importedCount} 道题目`
    });
  } catch (error) {
    console.error('导入题目失败:', error);
    res.status(500).json({
      success: false,
      message: '导入失败: ' + error.message
    });
  }
});

/**
 * @api {get} /api/questions/template 下载导入模板
 */
router.get('/template', (req, res) => {
  try {
    // 创建模板数据
    const templateData = [
      {
        '题目内容': '示例：计算 25 + 37 = ?',
        '题型': 'calculation',
        '学科': 'math',
        '年级': 2,
        '难度': 'easy',
        '答案': '62',
        '解答思路': '先算个位数：5+7=12，写2进1；再算十位数：2+3+1=6',
        '知识点': '两位数加法,进位加法'
      },
      {
        '题目内容': '示例：下列词语中"的"字读音正确的是（）',
        '题型': 'choice',
        '学科': 'chinese', 
        '年级': 3,
        '难度': 'medium',
        '答案': 'A',
        '解答思路': '"的"在不同语境中有不同读音',
        '知识点': '多音字,词语读音'
      }
    ];

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // 设置列宽
    ws['!cols'] = [
      { wch: 30 }, // 题目内容
      { wch: 15 }, // 题型
      { wch: 10 }, // 学科
      { wch: 8 },  // 年级
      { wch: 10 }, // 难度
      { wch: 20 }, // 答案
      { wch: 40 }, // 解答思路
      { wch: 20 }  // 知识点
    ];

    XLSX.utils.book_append_sheet(wb, ws, '题目模板');

    // 生成Excel缓冲区
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=questions_template.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('生成模板失败:', error);
    res.status(500).json({
      success: false,
      message: '生成模板失败'
    });
  }
});

/**
 * @api {post} /api/questions/batch-review 批量审核题目
 */
router.post('/batch-review', async (req, res) => {
  try {
    const { questionIds, action, comments } = req.body;

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要审核的题目'
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: '无效的审核操作'
      });
    }

    // 这里应该实现数据库批量更新逻辑
    console.log(`批量${action === 'approve' ? '通过' : '驳回'}题目:`, questionIds);

    res.json({
      success: true,
      data: {
        processedCount: questionIds.length,
        action: action === 'approve' ? '通过' : '驳回'
      },
      message: `已${action === 'approve' ? '通过' : '驳回'} ${questionIds.length} 道题目`
    });
  } catch (error) {
    console.error('批量审核失败:', error);
    res.status(500).json({
      success: false,
      message: '批量审核失败'
    });
  }
});

/**
 * @api {put} /api/questions/:id/review 单个题目审核
 */
router.put('/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comments, suggestions } = req.body;

    if (!['approved', 'rejected', 'needsRevision'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的审核状态'
      });
    }

    // 这里应该实现数据库更新逻辑
    console.log(`审核题目 ${id}:`, { status, comments, suggestions });

    res.json({
      success: true,
      data: {
        id,
        reviewStatus: status,
        reviewComments: comments,
        reviewSuggestions: suggestions,
        reviewTime: new Date().toISOString()
      },
      message: '审核完成'
    });
  } catch (error) {
    console.error('题目审核失败:', error);
    res.status(500).json({
      success: false,
      message: '审核失败'
    });
  }
});

/**
 * @api {get} /api/questions/export 导出题库
 */
router.get('/export', async (req, res) => {
  try {
    // 模拟导出
    res.json({
      success: true,
      message: '导出功能正在开发中'
    });
  } catch (error) {
    console.error('导出题库失败:', error);
    res.status(500).json({
      success: false,
      message: '导出失败'
    });
  }
});

/**
 * AI审核函数
 */
async function performAIReview(question) {
  // 模拟AI审核逻辑
  return new Promise((resolve) => {
    setTimeout(() => {
      const quality = Math.random() * 0.4 + 0.6; // 0.6-1.0
      const difficultyMatch = Math.random() > 0.2; // 80% 匹配
      const suggestions = quality < 0.8 ? ['建议完善题目描述', '增加解答思路'] : null;

      resolve({
        quality,
        difficultyMatch,
        suggestions: suggestions ? suggestions.join('; ') : null,
        aiScore: Math.round(quality * 100),
        reviewTime: new Date().toISOString()
      });
    }, 1000); // 模拟AI处理时间
  });
}

/**
 * 生成知识点
 */
function generateKnowledgePoints(question) {
  const { subject, content, type } = question;
  
  // 简单的知识点生成逻辑
  const knowledgePointsMap = {
    math: {
      calculation: ['四则运算', '计算题'],
      choice: ['数学概念', '选择题'],
      fillBlank: ['数学应用', '填空题']
    },
    chinese: {
      choice: ['语文基础', '选择题'],
      essay: ['语文写作', '问答题'],
      fillBlank: ['语文应用', '填空题']
    },
    english: {
      choice: ['英语词汇', '选择题'],
      fillBlank: ['英语语法', '填空题'],
      essay: ['英语写作', '问答题']
    }
  };

  return knowledgePointsMap[subject]?.[type] || ['基础知识'];
}

/**
 * 计算题目质量分数
 */
function calculateQualityScore(question) {
  let score = 0.5; // 基础分

  // 检查必填字段
  if (question.content && question.content.length > 5) score += 0.2;
  if (question.answer && question.answer.length > 0) score += 0.2;
  if (question.knowledgePoints && question.knowledgePoints.length > 0) score += 0.1;
  
  // 随机浮动
  score += Math.random() * 0.1 - 0.05;
  
  return Math.min(Math.max(score, 0), 1);
}

module.exports = router; 