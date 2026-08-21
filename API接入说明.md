# SeeDance2 API 接入说明

本文档详细说明了 SeeDance2 视频生成 API 的接入方式和使用方法。

## 📋 API 基础信息

- **Base URL**: `https://ark.cn-beijing.volces.com/api/v3`
- **认证方式**: Bearer Token（API Key）
- **官方文档**: [火山引擎 SeeDance API](https://docs.volcengine.com/docs/82379/2298881)

## 🔑 获取 API Key

1. 访问 [火山引擎控制台](https://console.volcengine.com/ark/region:cn-beijing/apiKey)
2. 点击"创建 API Key"
3. 复制生成的 API Key（只显示一次，请妥善保管）
4. 确保账户余额 > 200 元或已购买资源包

## 🎯 主要 API 端点

### 1. 创建视频生成任务

**请求**
```http
POST /contents/generations/tasks
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "model": "doubao-seedance-2-5",
  "content": [
    {
      "type": "text",
      "text": "一只小猫在草地上玩耍"
    }
  ],
  "resolution": "720p",
  "ratio": "16:9",
  "duration": 5,
  "generate_audio": true
}
```

**响应**
```json
{
  "id": "task-xxxxx"
}
```

### 2. 查询任务状态

**请求**
```http
GET /contents/generations/tasks/{task_id}
Authorization: Bearer YOUR_API_KEY
```

**响应**
```json
{
  "id": "task-xxxxx",
  "status": "succeeded",
  "video_url": "https://...",
  "duration": 5,
  "created_at": 1234567890,
  "completed_at": 1234567900
}
```

## 📝 支持的模型

| 模型 ID | 名称 | 分辨率支持 | 时长范围 | 特点 |
|---------|------|-----------|---------|------|
| `doubao-seedance-2-5` | Seedance 2.5 | 480p/720p/1080p | 4-30s | 最新版本，支持30秒直出 |
| `doubao-seedance-2-0` | Seedance 2.0 | 480p/720p/1080p/4k | 4-15s | 高质量，支持4K |
| `doubao-seedance-2-0-fast` | Seedance 2.0 Fast | 480p/720p | 4-15s | 快速生成 |
| `doubao-seedance-2-0-mini` | Seedance 2.0 Mini | 480p/720p | 4-15s | 低成本 |

## 🎬 任务类型

### 1. 文生视频
最简单的方式，仅需提示词即可生成视频。

```json
{
  "model": "doubao-seedance-2-5",
  "content": [
    {
      "type": "text",
      "text": "夕阳下的海滩，海浪轻轻拍打着沙滩"
    }
  ],
  "resolution": "720p",
  "ratio": "adaptive",
  "duration": -1
}
```

### 2. 图生视频（首帧）
使用一张图片作为视频的首帧。

```json
{
  "model": "doubao-seedance-2-5",
  "content": [
    {
      "type": "text",
      "text": "镜头慢慢推进"
    },
    {
      "type": "image_url",
      "image_url": {
        "url": "https://example.com/image.jpg"
      },
      "role": "first_frame"
    }
  ],
  "resolution": "720p",
  "ratio": "adaptive"
}
```

### 3. 图生视频（首尾帧）
使用两张图片作为视频的首尾帧。

```json
{
  "model": "doubao-seedance-2-5",
  "content": [
    {
      "type": "text",
      "text": "从白天到黑夜的转换"
    },
    {
      "type": "image_url",
      "image_url": {
        "url": "https://example.com/start.jpg"
      },
      "role": "first_frame"
    },
    {
      "type": "image_url",
      "image_url": {
        "url": "https://example.com/end.jpg"
      },
      "role": "last_frame"
    }
  ],
  "resolution": "720p"
}
```

## ⚙️ 高级参数

### 分辨率和宽高比

| 分辨率 | 可选宽高比 | 像素值示例 |
|--------|-----------|-----------|
| 480p | 16:9, 4:3, 1:1, 3:4, 9:16, 21:9 | 854×480 (16:9) |
| 720p | 16:9, 4:3, 1:1, 3:4, 9:16, 21:9 | 1280×720 (16:9) |
| 1080p | 16:9, 4:3, 1:1, 3:4, 9:16, 21:9 | 1920×1080 (16:9) |

### 时长控制

- **具体秒数**: `duration: 5` （生成 5 秒视频）
- **自动选择**: `duration: -1` （模型自动决定）
- **Seedance 2.5**: 4-30 秒
- **Seedance 2.0 系列**: 4-15 秒

### 音频生成

```json
{
  "generate_audio": true  // 生成有声视频（含人声、音效、背景音乐）
}
```

### 优先级控制

```json
{
  "priority": 5  // 0-9，数值越大优先级越高
}
```

## 💡 提示词最佳实践

### 1. 中英文都支持
```
✅ "一只橘猫在阳光下打盹"
✅ "An orange cat napping in the sunlight"
```

### 2. 描述要具体
```
❌ "一只猫"
✅ "一只橘色短毛猫，蓝色眼睛，在木质地板上伸懒腰"
```

### 3. 包含镜头运动
```
✅ "镜头缓慢推进，聚焦到猫的眼睛"
✅ "航拍视角，镜头从高空俯冲而下"
```

### 4. 添加环境和氛围
```
✅ "温暖的下午阳光透过窗户洒进房间，一只橘猫在柔软的沙发上打盹"
```

### 5. 对话放在双引号内
```
✅ "一个男人对女孩说：\"你好，很高兴见到你。\""
```

### 6. 字数建议
- 中文：不超过 500 字
- 英文：不超过 1000 词

## 🔄 任务状态

| 状态 | 说明 |
|------|------|
| `queued` | 排队中 |
| `running` | 运行中 |
| `succeeded` | 成功完成 |
| `failed` | 失败 |
| `expired` | 超时 |

## 📊 轮询策略

建议使用以下轮询策略：

```typescript
async function pollTask(taskId: string): Promise<TaskResult> {
  const maxAttempts = 360;  // 30 分钟
  const intervalMs = 5000;   // 5 秒

  for (let i = 0; i < maxAttempts; i++) {
    const status = await getTaskStatus(taskId);
    
    if (status.status === 'succeeded') {
      return status;
    }
    
    if (status.status === 'failed' || status.status === 'expired') {
      throw new Error('Task failed');
    }
    
    await sleep(intervalMs);
  }
  
  throw new Error('Timeout');
}
```

## 💰 计费说明

### Seedance 2.5
- **1080p**: 约 2.7 元/秒（限时 72 折）
- **720p**: 按刊例价计费
- **480p**: 按刊例价计费

### Seedance 2.0 Mini
- **720p**: 约 0.2 元/秒（限时 4 折）
- **480p**: 约 0.2 元/秒（限时 4 折）

### Seedance 2.0 Fast
- **720p**: 约 0.6 元/秒（限时 75 折）
- **480p**: 约 0.6 元/秒（限时 75 折）

**注意**: 具体价格以官方文档为准。

## ⚠️ 注意事项

### 1. 人脸限制
- Seedance 2.5、2.0 系列 **不支持** 直接上传含有真人人脸的参考图/视频
- 可使用：
  - 模型生成的含人脸原始产物（本账号 30 天内）
  - 预置虚拟人像
  - 已授权真人素材

### 2. 图片要求
- **格式**: JPEG, PNG, WebP, BMP, TIFF, GIF
- **宽高比**: 0.4 - 2.5
- **宽高范围**: 300-6000 像素
- **大小**: 单张 < 30MB

### 3. 视频要求
- **格式**: MP4, MOV
- **编码**: H.264/AVC, H.265/HEVC
- **时长**: 2-30 秒（取决于模型）
- **大小**: 单个 < 200MB

### 4. 音频要求
- **格式**: WAV, MP3
- **时长**: 2-30 秒（取决于模型）
- **大小**: 单个 < 15MB

## 🔧 常见问题

### Q: 任务一直处于 queued 状态？
A: 这是正常的，说明当前请求量较大。建议：
- 使用更高的 `priority` 参数
- 避开高峰时段
- 考虑使用 Fast/Mini 版本

### Q: 如何提高生成质量？
A: 
1. 使用 Seedance 2.5 或 2.0（非 Fast/Mini）
2. 选择 1080p 分辨率
3. 提供详细的提示词
4. 使用参考图片/视频

### Q: 如何降低成本？
A:
1. 使用 Seedance 2.0 Mini
2. 选择 480p 分辨率
3. 缩短视频时长
4. 购买资源包或专属节省计划

### Q: 视频无法播放？
A: 1080p 和 4K 视频使用 H.265 编码和 10bit 位深，部分播放器可能不兼容。建议：
- macOS: IINA, VLC, mpv
- Windows: VLC, mpv, PotPlayer

## 📚 相关资源

- [官方文档](https://docs.volcengine.com/docs/82379/2298881)
- [控制台](https://console.volcengine.com/ark/region:cn-beijing/openManagement)
- [API Key 管理](https://console.volcengine.com/ark/region:cn-beijing/apiKey)
- [在线体验](https://console.volcengine.com/ark/region:cn-beijing/experience/gen_video)
