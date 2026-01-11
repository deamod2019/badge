const API_BASE = '/api';

/**
 * API 服务封装
 */
class ApiService {
    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '请求失败');
        }

        return data;
    }

    // 用户相关
    async getUsers(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/users${query ? `?${query}` : ''}`);
    }

    async getUser(id) {
        return this.request(`/users/${id}`);
    }

    async getUserBadges(userId) {
        return this.request(`/users/${userId}/badges`);
    }

    async getUserPoints(userId) {
        return this.request(`/users/${userId}/points`);
    }

    async getDepartmentLeaderboard() {
        return this.request('/users/leaderboard/departments');
    }

    async getIndividualLeaderboard(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/users/leaderboard/individuals${query ? `?${query}` : ''}`);
    }

    // 徽章相关
    async getBadges(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/badges${query ? `?${query}` : ''}`);
    }

    async getBadge(id) {
        return this.request(`/badges/${id}`);
    }

    async getBadgeCategories() {
        return this.request('/badges/categories');
    }

    async getBadgeStats() {
        return this.request('/badges/stats/overview');
    }

    async getBadgeHolders(badgeId) {
        return this.request(`/badges/${badgeId}/holders`);
    }

    async createBadge(badgeData) {
        return this.request('/badges', {
            method: 'POST',
            body: badgeData,
        });
    }

    async updateBadge(id, badgeData) {
        return this.request(`/badges/${id}`, {
            method: 'PUT',
            body: badgeData,
        });
    }

    async deleteBadge(id) {
        return this.request(`/badges/${id}`, {
            method: 'DELETE',
        });
    }

    async toggleBadge(id) {
        return this.request(`/badges/${id}/toggle`, {
            method: 'PATCH',
        });
    }

    async grantBadge(badgeId, userId, reason) {
        return this.request(`/badges/${badgeId}/grant`, {
            method: 'POST',
            body: { user_id: userId, reason },
        });
    }

    async batchGrantBadge(badgeId, selection, reason) {
        return this.request('/badges/batch-grant', {
            method: 'POST',
            body: {
                badge_id: badgeId,
                selection,
                reason,
                granted_by: 'admin',
            },
        });
    }

    // 组织架构相关
    async getOrganizationTree() {
        return this.request('/organizations/tree');
    }

    async getOrganizations() {
        return this.request('/organizations');
    }

    async getOrganizationUsers(orgId, includeChildren = true) {
        return this.request(`/organizations/${orgId}/users?include_children=${includeChildren}`);
    }

    // 标签相关
    async getTags(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/tags${query ? `?${query}` : ''}`);
    }

    async getTagCategories() {
        return this.request('/tags/categories');
    }

    async getTagUsers(tagId) {
        return this.request(`/tags/${tagId}/users`);
    }

    async createTag(tagData) {
        return this.request('/tags', {
            method: 'POST',
            body: tagData,
        });
    }

    // 上传相关
    async uploadImage(imageBase64, filename) {
        return this.request('/upload/image', {
            method: 'POST',
            body: { image: imageBase64, filename },
        });
    }

    // 事件相关
    async submitEvent(eventData) {
        return this.request('/events', {
            method: 'POST',
            body: eventData,
        });
    }

    async getEvents(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/events${query ? `?${query}` : ''}`);
    }

    // 规则相关
    async getRules(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/rules${query ? `?${query}` : ''}`);
    }

    async createRule(ruleData) {
        return this.request('/rules', {
            method: 'POST',
            body: ruleData,
        });
    }

    // 统计相关
    async getStatsOverview() {
        return this.request('/stats/overview');
    }

    async getBadgeTrend(days = 30) {
        return this.request(`/stats/badges/trend?days=${days}`);
    }

    async getBadgeDistribution() {
        return this.request('/stats/badges/distribution');
    }

    async getDepartmentStats() {
        return this.request('/stats/departments');
    }

    async getPopularBadges(limit = 10) {
        return this.request(`/stats/badges/popular?limit=${limit}`);
    }

    async getRecentActivity(limit = 20) {
        return this.request(`/stats/activity?limit=${limit}`);
    }

    // ==================== Drill-Down APIs ====================

    async getUsersList(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/stats/users${query ? `?${query}` : ''}`);
    }

    async getGrantedBadgesList(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/stats/granted-badges${query ? `?${query}` : ''}`);
    }

    async getUsersWithBadges(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/stats/users-with-badges${query ? `?${query}` : ''}`);
    }

    async getPointsLeaderboard(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/stats/points-leaderboard${query ? `?${query}` : ''}`);
    }

    // ==================== Quota APIs ====================

    async getQuotas(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/quotas${query ? `?${query}` : ''}`);
    }

    async getQuota(id) {
        return this.request(`/quotas/${id}`);
    }

    async createQuota(quotaData) {
        return this.request('/quotas', {
            method: 'POST',
            body: quotaData,
        });
    }

    async updateQuota(id, quotaData) {
        return this.request(`/quotas/${id}`, {
            method: 'PUT',
            body: quotaData,
        });
    }

    async deleteQuota(id) {
        return this.request(`/quotas/${id}`, {
            method: 'DELETE',
        });
    }

    async getMyQuotas(userId) {
        return this.request(`/quotas/my/${userId}`);
    }

    async getQuotaCategories() {
        return this.request('/quotas/meta/categories');
    }
}

export default new ApiService();
