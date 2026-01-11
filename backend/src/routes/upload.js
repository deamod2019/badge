import { Router } from 'express';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadDir = join(__dirname, '../../uploads');

// 确保上传目录存在
if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
}

const router = Router();

// 上传图片
router.post('/image', (req, res) => {
    try {
        const { image, filename } = req.body;

        if (!image) {
            return res.status(400).json({ success: false, error: '请提供图片数据' });
        }

        // 解析 base64 图片
        const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
            return res.status(400).json({ success: false, error: '无效的图片格式' });
        }

        const ext = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        // 生成文件名
        const id = uuidv4().slice(0, 8);
        const savedFilename = filename ? `${id}-${filename}.${ext}` : `${id}.${ext}`;
        const filePath = join(uploadDir, savedFilename);

        // 保存文件
        writeFileSync(filePath, buffer);

        const url = `/uploads/${savedFilename}`;

        res.json({
            success: true,
            data: {
                filename: savedFilename,
                url,
                size: buffer.length,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
