import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 导入数据库初始化
import { initDatabase } from './models/database.js';

// 导入路由
import usersRouter from './routes/users.js';
import badgesRouter from './routes/badges.js';
import eventsRouter from './routes/events.js';
import rulesRouter from './routes/rules.js';
import statsRouter from './routes/stats.js';
import organizationsRouter from './routes/organizations.js';
import tagsRouter from './routes/tags.js';
import uploadRouter from './routes/upload.js';
import quotasRouter from './routes/quotas.js';
import configRouter from './routes/config.js';

// 初始化示例数据
import { initSeedData } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' })); // 增加限制以支持图片上传

// 静态文件服务（用于上传的图片）
app.use('/uploads', express.static(join(__dirname, '../uploads')));

// 请求日志
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// API 路由
app.use('/api/users', usersRouter);
app.use('/api/badges', badgesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/stats', statsRouter);
app.use('/api/organizations', organizationsRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/quotas', quotasRouter);
app.use('/api/config', configRouter);

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: '2.1.0',
        timestamp: new Date().toISOString(),
    });
});

// 404 处理
app.use((req, res) => {
    res.status(404).json({ success: false, error: '接口不存在' });
});

// 错误处理
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ success: false, error: '服务器内部错误' });
});

// 初始化数据库并启动服务器
async function start() {
    try {
        console.log('🔧 正在初始化数据库...');
        await initDatabase();

        console.log('🌱 正在初始化种子数据...');
        initSeedData();

        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🏅 微徽章体系 2.0 后端服务已启动                          ║
║                                                            ║
║   服务地址: http://localhost:${PORT}                         ║
║   API 文档: http://localhost:${PORT}/api/health              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        console.error('启动失败:', error);
        process.exit(1);
    }
}

start();
