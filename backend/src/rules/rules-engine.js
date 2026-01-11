import db from '../models/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * 徽章规则引擎
 * 处理事件并根据规则自动授予徽章
 */
class RulesEngine {
    constructor() {
        this.operators = {
            '>=': (a, b) => a >= b,
            '<=': (a, b) => a <= b,
            '>': (a, b) => a > b,
            '<': (a, b) => a < b,
            '==': (a, b) => a === b,
            '!=': (a, b) => a !== b,
            'contains': (a, b) => String(a).includes(b),
        };
    }

    /**
     * 处理事件并检查是否满足徽章授予条件
     */
    processEvent(event) {
        const rules = db.prepare(`
      SELECT * FROM rules WHERE is_enabled = 1 ORDER BY priority DESC
    `).all();

        const results = [];

        for (const rule of rules) {
            const condition = JSON.parse(rule.condition_json);
            const action = JSON.parse(rule.action_json);

            if (this.evaluateCondition(condition, event)) {
                // 检查冷却期
                if (this.isInCooldown(event.user_id, action.grant_badge, rule.cooldown_days)) {
                    continue;
                }

                // 授予徽章
                const result = this.grantBadge(event.user_id, action.grant_badge, event.id, action.points);
                if (result) {
                    results.push({
                        rule_id: rule.id,
                        rule_name: rule.name,
                        badge_id: action.grant_badge,
                        points: action.points,
                    });
                }
            }
        }

        // 标记事件为已处理
        db.prepare(`
      UPDATE events SET processed = 1, processed_at = datetime('now') WHERE id = ?
    `).run(event.id);

        return results;
    }

    /**
     * 评估条件是否满足
     */
    evaluateCondition(condition, event) {
        // 处理 AND 条件
        if (condition.and) {
            return condition.and.every(cond => this.evaluateSingleCondition(cond, event));
        }

        // 处理 OR 条件
        if (condition.or) {
            return condition.or.some(cond => this.evaluateSingleCondition(cond, event));
        }

        // 单个条件
        return this.evaluateSingleCondition(condition, event);
    }

    /**
     * 评估单个条件
     */
    evaluateSingleCondition(condition, event) {
        // 事件名称匹配
        if (condition.event && event.name !== condition.event) {
            return false;
        }

        // 指标条件匹配
        if (condition.metric) {
            const attributes = typeof event.attributes_json === 'string'
                ? JSON.parse(event.attributes_json)
                : event.attributes_json || {};

            // 解析 metric 表达式，如 "deliverable_score >= 90"
            const match = condition.metric.match(/^(\w+)\s*(>=|<=|>|<|==|!=|contains)\s*(.+)$/);
            if (match) {
                const [, field, operator, value] = match;
                const actualValue = attributes[field];
                const expectedValue = isNaN(value) ? value.replace(/['"]/g, '') : Number(value);

                if (!this.operators[operator](actualValue, expectedValue)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * 检查是否在冷却期内
     */
    isInCooldown(userId, badgeId, cooldownDays) {
        if (!cooldownDays || cooldownDays <= 0) return false;

        const lastBadge = db.prepare(`
      SELECT granted_at FROM user_badges 
      WHERE user_id = ? AND badge_id = ? 
      ORDER BY granted_at DESC LIMIT 1
    `).get(userId, badgeId);

        if (!lastBadge) return false;

        const lastGranted = new Date(lastBadge.granted_at);
        const cooldownEnd = new Date(lastGranted);
        cooldownEnd.setDate(cooldownEnd.getDate() + cooldownDays);

        return new Date() < cooldownEnd;
    }

    /**
     * 授予徽章
     */
    grantBadge(userId, badgeId, sourceEventId, points = 0) {
        const badge = db.prepare('SELECT * FROM badge_definitions WHERE id = ?').get(badgeId);
        if (!badge) return null;

        const userBadgeId = uuidv4();
        let expiresAt = null;

        if (badge.expires_days) {
            const expDate = new Date();
            expDate.setDate(expDate.getDate() + badge.expires_days);
            expiresAt = expDate.toISOString();
        }

        // 插入用户徽章记录
        db.prepare(`
      INSERT INTO user_badges (id, user_id, badge_id, source_event_id, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userBadgeId, userId, badgeId, sourceEventId, expiresAt);

        // 添加积分
        const actualPoints = points || badge.points || 0;
        if (actualPoints > 0) {
            this.addPoints(userId, actualPoints, 'badge', userBadgeId, `获得徽章: ${badge.name}`);
        }

        // 记录审计日志
        this.logAudit('badge_granted', 'user_badge', userBadgeId, userId, {
            badge_id: badgeId,
            badge_name: badge.name,
            points: actualPoints,
        });

        return {
            user_badge_id: userBadgeId,
            badge,
            points: actualPoints,
        };
    }

    /**
     * 添加积分
     */
    addPoints(userId, amount, referenceType, referenceId, description) {
        const transactionId = uuidv4();

        db.prepare(`
      INSERT INTO point_transactions (id, user_id, amount, type, reference_type, reference_id, description)
      VALUES (?, ?, ?, 'earn', ?, ?, ?)
    `).run(transactionId, userId, amount, referenceType, referenceId, description);

        db.prepare(`
      UPDATE users SET total_points = total_points + ?, updated_at = datetime('now') WHERE id = ?
    `).run(amount, userId);

        return transactionId;
    }

    /**
     * 记录审计日志
     */
    logAudit(action, entityType, entityId, userId, details) {
        const logId = uuidv4();
        db.prepare(`
      INSERT INTO audit_logs (id, action, entity_type, entity_id, user_id, details_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(logId, action, entityType, entityId, userId, JSON.stringify(details));
    }
}

export default new RulesEngine();
