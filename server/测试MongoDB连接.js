const mongoose = require('mongoose')

async function 测试MongoDB连接() {
  console.log('🔧 测试MongoDB直接连接')
  console.log('='.repeat(50))
  
  try {
    console.log('1. 尝试连接到MongoDB...')
    
    // 设置Mongoose配置
    mongoose.set('strictQuery', false)
    
    // 连接到MongoDB
    const connection = await mongoose.connect('mongodb://localhost:27017/smart_tutor', {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      maxPoolSize: 5
    })
    
    console.log('✅ MongoDB连接成功!')
    console.log('   Host:', connection.connection.host)
    console.log('   Port:', connection.connection.port)
    console.log('   Database:', connection.connection.name)
    console.log('   State:', connection.connection.readyState)
    
    // 测试ping
    console.log('\n2. 测试数据库ping...')
    const admin = connection.connection.db.admin()
    const pingResult = await admin.ping()
    console.log('✅ Ping成功:', pingResult)
    
    // 测试集合操作
    console.log('\n3. 测试集合操作...')
    const db = connection.connection.db
    
    // 列出所有集合
    const collections = await db.listCollections().toArray()
    console.log('📋 现有集合:', collections.map(c => c.name))
    
    // 测试LearningRecord模型
    console.log('\n4. 测试LearningRecord查询...')
    const LearningRecord = require('./src/models/LearningRecord')
    
    // 测试简单查询
    const testQuery = await LearningRecord.findOne().limit(1).lean()
    console.log('✅ LearningRecord查询成功:', testQuery ? '找到记录' : '无记录')
    
    // 测试计数
    const count = await LearningRecord.countDocuments()
    console.log('✅ LearningRecord总数:', count)
    
    console.log('\n🎉 MongoDB连接测试完全成功!')
    
    // 关闭连接
    await mongoose.connection.close()
    console.log('✅ 连接已关闭')
    
  } catch (error) {
    console.error('❌ MongoDB连接测试失败:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack?.split('\\n').slice(0, 5).join('\\n')
    })
  }
}

// 运行测试
测试MongoDB连接().catch(console.error) 