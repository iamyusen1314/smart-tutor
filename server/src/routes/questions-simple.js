const express = require('express');
const router = express.Router();

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
router.post('/import', async (req, res) => {
  try {
    const { aiReview, autoClassify } = req.body;

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
 * @api {get} /api/questions/export 导出题库
 */
router.get('/export', async (req, res) => {
  try {
    res.json({
      success: true,
      message: '导出功能正在开发中',
      data: {
        exportUrl: '/downloads/questions_export.xlsx',
        totalQuestions: 156
      }
    });
  } catch (error) {
    console.error('导出题库失败:', error);
    res.status(500).json({
      success: false,
      message: '导出失败'
    });
  }
});

module.exports = router; 