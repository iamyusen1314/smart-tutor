# 自动IP检测功能禁用说明

## 📌 修改概述

根据您的要求，我已经禁用了自动IP地址检测功能，以节省系统资源和时间。

## 🚫 已禁用的功能

1. **小程序启动时的自动IP检测** - 不再在启动时自动扫描网络
2. **定期IP地址扫描** - 停止了后台自动检测IP变化
3. **网络IP段扫描** - 禁用了耗时的IP地址范围扫描

## ✅ 保留的功能

1. **手动IP检测** - 仍可通过按钮手动触发
2. **直接IP设置** - 新增了快速设置IP的方法
3. **IP状态显示** - 调试页面仍显示当前IP状态

## 🔧 如何手动设置IP地址

### 方法1：使用代码设置（推荐）
```javascript
// 在小程序中调用
const app = getApp()
app.setServerIP('192.168.31.180')  // 替换为您的新IP
```

### 方法2：直接修改配置
在 `miniprogram/app.js` 文件中：
```javascript
globalData: {
  apiHost: 'http://YOUR_NEW_IP:3000',  // 改为您的新IP
  API_BASE_URL: 'http://YOUR_NEW_IP:3000/api'
}
```

### 方法3：通过调试页面
1. 打开调试页面：`pages/debug/data-test`
2. 点击"刷新IP"按钮进行手动检测

## 📝 修改的文件

1. **miniprogram/app.js**
   - 禁用了启动时的自动IP检测
   - 添加了 `setServerIP()` 方法
   - 增加了 `autoIPDetectionEnabled: false` 标志

2. **miniprogram/utils/network.js** 
   - 添加了 `ENABLE_AUTO_IP_DETECTION = false` 开关
   - 修改了 `autoDetectAndUpdateIP()` 函数逻辑
   - 增强了手动刷新功能的提示

3. **miniprogram/pages/debug/data-test.js**
   - 在调试页面显示自动检测状态
   - 增加了使用提示

## 💡 使用建议

1. **首次设置**：手动设置正确的IP地址
2. **IP变化时**：直接告知新IP，我帮您更新代码
3. **测试连接**：使用调试页面的连接测试功能

## 🔄 如需重新启用自动检测

如果将来需要重新启用，只需修改：
```javascript
// 在 miniprogram/utils/network.js 中
const ENABLE_AUTO_IP_DETECTION = true

// 在 miniprogram/app.js 中
autoIPDetectionEnabled: true
// 并取消注释 await this.autoDetectServerIP()
```

## 📊 性能改进

禁用自动IP检测后：
- ✅ 小程序启动速度提升
- ✅ 减少网络请求数量  
- ✅ 降低CPU和内存使用
- ✅ 节省电池消耗

---

*当您的IP地址发生变化时，请直接告知新IP，我会协助您快速更新配置。* 