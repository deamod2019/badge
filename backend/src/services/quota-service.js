import db from '../models/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * 配额服务
 * 处理徽章发放配额的检查和消费
 */
class QuotaService {
    /**
     * 获取当前周期标识
     * @param {string} periodType - daily/weekly/monthly/yearly
     * @returns {string} 周期标识，如 "2026-01" (monthly)
     */
    getPeriodKey(periodType) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        switch (periodType) {
            case 'daily':
                return `${year}-${month}-${day}`;
            case 'weekly':
                // ISO week number
                const firstThursday = new Date(year, 0, 4);
                const daysSinceFirstThursday = Math.floor((now - firstThursday) / 86400000);
                const weekNumber = Math.ceil((daysSinceFirstThursday + firstThursday.getDay() + 1) / 7);
                return `${year}-W${String(weekNumber).padStart(2, '0')}`;
            case 'monthly':
                return `${year}-${month}`;
            case 'yearly':
                return `${year}`;
            default:
                return `${year}-${month}`;
        }
    }

    /**
     * 检查用户发放徽章是否在配额内
     * @param {string} granterId - 发放者用户ID
     * @param {string} badgeCategory - 徽章分类
     * @param {string} scopeType - 范围类型 organization/tag
     * @param {string} scopeId - 组织或标签ID
     * @returns {object} { allowed: boolean, quota: object|null, remaining: number, message: string }
     */
    checkQuota(granterId, badgeCategory, scopeType = null, scopeId = null) {
        // 查找适用的配额定义
        let quotaQuery = `
            SELECT * FROM quota_definitions 
            WHERE owner_user_id = ? AND is_active = 1
        `;
        const params = [granterId];

        // 如果指定了范围，按范围筛选
        if (scopeType && scopeId) {
            quotaQuery += ` AND scope_type = ? AND scope_id = ?`;
            params.push(scopeType, scopeId);
        }

        const quotas = db.prepare(quotaQuery).all(...params);

        if (quotas.length === 0) {
            // 没有配额限制，允许发放
            return { allowed: true, quota: null, remaining: -1, message: '无配额限制' };
        }

        // 检查每个配额规则
        for (const quota of quotas) {
            // 检查分类是否匹配（null 表示所有分类）
            if (quota.badge_category && quota.badge_category !== badgeCategory) {
                continue;
            }

            const periodKey = this.getPeriodKey(quota.period_type);
            const usage = this.getQuotaUsage(quota.id, periodKey);
            const remaining = quota.max_grants - usage;

            if (remaining <= 0) {
                return {
                    allowed: false,
                    quota,
                    remaining: 0,
                    message: `配额已用完：${quota.badge_category || '所有类别'} 本${this.getPeriodLabel(quota.period_type)}最多发放 ${quota.max_grants} 个`
                };
            }

            // 找到匹配的配额且有余量
            return { allowed: true, quota, remaining, message: `剩余配额: ${remaining}` };
        }

        // 没有匹配的配额规则，允许发放
        return { allowed: true, quota: null, remaining: -1, message: '无匹配配额规则' };
    }

    /**
     * 获取配额使用量
     */
    getQuotaUsage(quotaId, periodKey) {
        const usage = db.prepare(`
            SELECT used_count FROM quota_usage 
            WHERE quota_id = ? AND period_key = ?
        `).get(quotaId, periodKey);

        return usage?.used_count || 0;
    }

    /**
     * 消费配额（发放成功后调用）
     */
    consumeQuota(quotaId, periodKey) {
        const existing = db.prepare(`
            SELECT * FROM quota_usage WHERE quota_id = ? AND period_key = ?
        `).get(quotaId, periodKey);

        if (existing) {
            db.prepare(`
                UPDATE quota_usage 
                SET used_count = used_count + 1, last_updated = datetime('now')
                WHERE quota_id = ? AND period_key = ?
            `).run(quotaId, periodKey);
        } else {
            const id = uuidv4();
            db.prepare(`
                INSERT INTO quota_usage (id, quota_id, period_key, used_count)
                VALUES (?, ?, ?, 1)
            `).run(id, quotaId, periodKey);
        }
    }

    /**
     * 获取用户的配额概览
     */
    getUserQuotaSummary(userId) {
        const quotas = db.prepare(`
            SELECT q.*, 
                   o.name as scope_name
            FROM quota_definitions q
            LEFT JOIN organizations o ON q.scope_type = 'organization' AND q.scope_id = o.id
            WHERE q.owner_user_id = ? AND q.is_active = 1
        `).all(userId);

        return quotas.map(quota => {
            const periodKey = this.getPeriodKey(quota.period_type);
            const used = this.getQuotaUsage(quota.id, periodKey);
            const remaining = quota.max_grants - used;

            // 如果是标签范围，获取标签名称
            let scopeName = quota.scope_name;
            if (quota.scope_type === 'tag' && !scopeName) {
                const tag = db.prepare('SELECT name FROM tags WHERE id = ?').get(quota.scope_id);
                scopeName = tag?.name || quota.scope_id;
            }

            return {
                ...quota,
                scope_name: scopeName || quota.scope_id,
                period_key: periodKey,
                used_count: used,
                remaining_count: remaining,
                period_label: this.getPeriodLabel(quota.period_type)
            };
        });
    }

    /**
     * 获取周期类型的中文标签
     */
    getPeriodLabel(periodType) {
        const labels = {
            daily: '日',
            weekly: '周',
            monthly: '月',
            yearly: '年'
        };
        return labels[periodType] || periodType;
    }

    /**
     * 检查并消费配额（发放时调用）
     * @returns {object} { allowed, quota, remaining, message }
     */
    checkAndConsumeQuota(granterId, badgeCategory, scopeType = null, scopeId = null) {
        const result = this.checkQuota(granterId, badgeCategory, scopeType, scopeId);

        if (result.allowed && result.quota) {
            const periodKey = this.getPeriodKey(result.quota.period_type);
            this.consumeQuota(result.quota.id, periodKey);
            result.remaining = result.remaining - 1;
        }

        return result;
    }
}

export default new QuotaService();
