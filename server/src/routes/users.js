/**
 * 用户管理路由
 * 支持用户的增删改查、角色权限管理、学习数据统计等功能
 */
const express = require('express');
const router = express.Router();

/**
 * @api {get} /api/users/stats 获取用户统计信息
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      totalUsers: 1250,
      activeUsers: 890,
      newUsersToday: 15,
      avgLearningTime: 42,
      students: 980,
      parents: 200,
      teachers: 60,
      admins: 10
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取用户统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计信息失败'
    });
  }
});

/**
 * @api {get} /api/users/list 获取用户列表
 */
router.get('/list', async (req, res) => {
  try {
    const {
      page = 1,
      size = 20,
      keyword = '',
      role = '',
      status = '',
      grade = ''
    } = req.query;

    // 模拟用户数据
    const mockUsers = [
      {
        id: 1,
        username: 'student001',
        nickname: '小明',
        avatar: null,
        role: 'student',
        status: 'active',
        phone: '13812345678',
        email: 'xiaoming@example.com',
        grade: 3,
        school: '实验小学',
        learningStats: {
          totalDays: 45,
          completedQuestions: 328,
          totalTime: 52,
          accuracy: 0.85
        },
        lastLogin: '2024-01-20T08:30:00Z',
        registerDate: '2023-09-01T00:00:00Z'
      },
      {
        id: 2,
        username: 'parent001',
        nickname: '张妈妈',
        avatar: null,
        role: 'parent',
        status: 'active',
        phone: '13987654321',
        email: 'zhangmama@example.com',
        grade: null,
        school: null,
        learningStats: null,
        lastLogin: '2024-01-19T20:15:00Z',
        registerDate: '2023-09-01T00:00:00Z'
      },
      {
        id: 3,
        username: 'teacher001',
        nickname: '李老师',
        avatar: null,
        role: 'teacher',
        status: 'active',
        phone: '13765432109',
        email: 'liteacher@example.com',
        grade: null,
        school: '实验小学',
        learningStats: null,
        lastLogin: '2024-01-20T14:22:00Z',
        registerDate: '2023-08-15T00:00:00Z'
      },
      {
        id: 4,
        username: 'admin001',
        nickname: '系统管理员',
        avatar: null,
        role: 'admin',
        status: 'active',
        phone: '13512345678',
        email: 'admin@example.com',
        grade: null,
        school: null,
        learningStats: null,
        lastLogin: '2024-01-20T15:45:00Z',
        registerDate: '2023-08-01T00:00:00Z'
      }
    ];

    // 简单的筛选逻辑
    let filteredUsers = mockUsers;
    
    if (keyword) {
      filteredUsers = filteredUsers.filter(u => 
        u.username.includes(keyword) || 
        u.nickname.includes(keyword) ||
        (u.phone && u.phone.includes(keyword))
      );
    }
    
    if (role) {
      filteredUsers = filteredUsers.filter(u => u.role === role);
    }
    
    if (status) {
      filteredUsers = filteredUsers.filter(u => u.status === status);
    }
    
    if (grade) {
      filteredUsers = filteredUsers.filter(u => u.grade === parseInt(grade));
    }

    // 分页
    const total = filteredUsers.length;
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + parseInt(size);
    const users = filteredUsers.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        users,
        total,
        page: parseInt(page),
        size: parseInt(size)
      }
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
});

/**
 * @api {get} /api/users/permissions 获取权限配置
 */
router.get('/permissions', async (req, res) => {
  try {
    const data = {
      roles: [
        {
          key: 'admin',
          name: '管理员',
          permissions: [
            'materials.read',
            'materials.write',
            'questions.read',
            'questions.write',
            'users.read',
            'users.write',
            'analytics.read',
            'system.admin'
          ]
        },
        {
          key: 'teacher',
          name: '教师',
          permissions: [
            'materials.read',
            'materials.write',
            'questions.read',
            'questions.write',
            'users.read',
            'analytics.read'
          ]
        },
        {
          key: 'parent',
          name: '家长',
          permissions: [
            'materials.read',
            'analytics.read'
          ]
        },
        {
          key: 'student',
          name: '学生',
          permissions: [
            'materials.read'
          ]
        }
      ],
      checkedPermissions: [
        'materials.read',
        'materials.write',
        'questions.read'
      ]
    };

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('获取权限配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取权限配置失败'
    });
  }
});

/**
 * @api {post} /api/users 创建用户
 */
router.post('/', async (req, res) => {
  try {
    const { username, nickname, role, status, phone, email, grade, school } = req.body;

    // 验证必填字段
    if (!username || !role) {
      return res.status(400).json({
        success: false,
        message: '用户名和角色为必填项'
      });
    }

    // 模拟创建用户
    const newUser = {
      id: Date.now(),
      username,
      nickname: nickname || username,
      role,
      status: status || 'active',
      phone,
      email,
      grade: role === 'student' ? grade : null,
      school: role === 'student' ? school : null,
      registerDate: new Date().toISOString()
    };

    res.json({
      success: true,
      data: newUser,
      message: '用户创建成功'
    });
  } catch (error) {
    console.error('创建用户失败:', error);
    res.status(500).json({
      success: false,
      message: '创建用户失败'
    });
  }
});

/**
 * @api {put} /api/users/:id 更新用户信息
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // 模拟更新用户
    console.log(`更新用户 ${id}:`, updateData);

    res.json({
      success: true,
      data: {
        id,
        ...updateData,
        updateDate: new Date().toISOString()
      },
      message: '用户信息更新成功'
    });
  } catch (error) {
    console.error('更新用户失败:', error);
    res.status(500).json({
      success: false,
      message: '更新用户失败'
    });
  }
});

/**
 * @api {post} /api/users/batch-update 批量更新用户
 */
router.post('/batch-update', async (req, res) => {
  try {
    const { userIds, action, data } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要操作的用户'
      });
    }

    const actionMap = {
      enable: '启用',
      disable: '禁用',
      setRole: '设置角色',
      delete: '删除'
    };

    if (!actionMap[action]) {
      return res.status(400).json({
        success: false,
        message: '无效的操作类型'
      });
    }

    // 模拟批量操作
    console.log(`批量${actionMap[action]}用户:`, userIds);

    res.json({
      success: true,
      data: {
        processedCount: userIds.length,
        action: actionMap[action]
      },
      message: `已${actionMap[action]} ${userIds.length} 个用户`
    });
  } catch (error) {
    console.error('批量操作失败:', error);
    res.status(500).json({
      success: false,
      message: '批量操作失败'
    });
  }
});

/**
 * @api {get} /api/users/:id/learning-data 获取用户学习数据
 */
router.get('/:id/learning-data', async (req, res) => {
  try {
    const { id } = req.params;

    // 模拟学习数据
    const learningData = {
      userId: id,
      overview: {
        totalDays: 45,
        completedQuestions: 328,
        totalTime: 52.5,
        accuracy: 0.85,
        streak: 7
      },
      subjectStats: [
        {
          subject: 'math',
          completedQuestions: 156,
          accuracy: 0.87,
          totalTime: 25.2
        },
        {
          subject: 'chinese',
          completedQuestions: 98,
          accuracy: 0.82,
          totalTime: 16.8
        },
        {
          subject: 'english',
          completedQuestions: 74,
          accuracy: 0.88,
          totalTime: 10.5
        }
      ],
      recentActivity: [
        {
          date: '2024-01-20',
          questions: 12,
          time: 25,
          accuracy: 0.83
        },
        {
          date: '2024-01-19',
          questions: 8,
          time: 18,
          accuracy: 0.87
        }
      ]
    };

    res.json({
      success: true,
      data: learningData
    });
  } catch (error) {
    console.error('获取学习数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取学习数据失败'
    });
  }
});

/**
 * @api {post} /api/users/:id/reset-password 重置用户密码
 */
router.post('/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;

    // 生成临时密码
    const tempPassword = Math.random().toString(36).slice(-8);

    // 模拟重置密码
    console.log(`重置用户 ${id} 密码:`, tempPassword);

    res.json({
      success: true,
      data: {
        tempPassword,
        message: '请将临时密码发送给用户，用户首次登录时需修改密码'
      },
      message: '密码重置成功'
    });
  } catch (error) {
    console.error('重置密码失败:', error);
    res.status(500).json({
      success: false,
      message: '重置密码失败'
    });
  }
});

/**
 * @api {get} /api/users/export 导出用户数据
 */
router.get('/export', async (req, res) => {
  try {
    // 模拟导出
    res.json({
      success: true,
      message: '用户导出功能正在开发中'
    });
  } catch (error) {
    console.error('导出用户失败:', error);
    res.status(500).json({
      success: false,
      message: '导出失败'
    });
  }
});

/**
 * @api {delete} /api/users/:id 删除用户
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 模拟删除用户
    console.log(`删除用户 ${id}`);

    res.json({
      success: true,
      message: '用户删除成功'
    });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({
      success: false,
      message: '删除用户失败'
    });
  }
});

module.exports = router; 