/**
 * محرك التحليلات والتقارير الذكية - يومي، أسبوعي، شهري، سنوي
 * 100% محلي وبدون مكتبات خارجية
 */

class AnalyticsEngine {
    constructor(habitManager) {
        this.hm = habitManager;
    }

    // جلب بيانات آخر N أيام
    getLastNDays(n = 7) {
        const days = [];
        for (let i = n - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = this.hm.getTodayKey(d);
            const dayName = d.toLocaleDateString('ar-EG', { weekday: 'short' });
            const dayNum = d.getDate();
            days.push({ date: d, key, dayName, dayNum });
        }
        return days;
    }

    // تقرير الالتزام بالصلوات لفترة محددة
    getPrayerReport(daysCount = 7) {
        const days = this.getLastNDays(daysCount);
        return days.map(d => {
            const rate = this.hm.getDailyPrayerCompletionRate(d.key);
            const status = this.hm.getPrayerStatus(d.key);
            return {
                label: daysCount <= 14 ? d.dayName : `${d.dayNum}`,
                dateKey: d.key,
                rate: rate,
                count: ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].filter(p => status[p]).length
            };
        });
    }

    // تقرير الالتزام بالعادات لفترة محددة
    getHabitsReport(daysCount = 7) {
        const days = this.getLastNDays(daysCount);
        const habits = this.hm.data.dailyHabits || [];
        const totalHabits = habits.length;

        return days.map(d => {
            let completed = 0;
            if (totalHabits > 0) {
                habits.forEach(h => {
                    if (h.logs && h.logs[d.key]) completed++;
                });
            }
            const rate = totalHabits > 0 ? Math.round((completed / totalHabits) * 100) : 0;
            return {
                label: daysCount <= 14 ? d.dayName : `${d.dayNum}`,
                dateKey: d.key,
                rate: rate,
                completed: completed,
                total: totalHabits
            };
        });
    }

    // تقرير شرب الماء
    getWaterReport(daysCount = 7) {
        const days = this.getLastNDays(daysCount);
        return days.map(d => {
            const w = this.hm.getWaterData(d.key);
            return {
                label: daysCount <= 14 ? d.dayName : `${d.dayNum}`,
                cups: w.cups || 0,
                target: w.target || 8,
                rate: Math.min(100, Math.round(((w.cups || 0) / (w.target || 8)) * 100))
            };
        });
    }

    // إحصائيات عامة لليوم
    getSummaryStats() {
        const todayKey = this.hm.getTodayKey();
        const prayerRate = this.hm.getDailyPrayerCompletionRate(todayKey);
        
        const habits = this.hm.data.dailyHabits || [];
        let habitsCompletedToday = 0;
        habits.forEach(h => {
            if (h.logs && h.logs[todayKey]) habitsCompletedToday++;
        });

        const athkar = this.hm.getAthkarStatus(todayKey);
        const water = this.hm.getWaterData(todayKey);
        const work = this.hm.getWorkData(todayKey);
        const pushups = this.hm.getPushupsCount(todayKey);

        const abstinence = this.hm.data.abstinenceHabits || [];
        let maxCleanDays = 0;
        abstinence.forEach(item => {
            const stats = this.hm.getAbstinenceStats(item);
            if (stats.days > maxCleanDays) maxCleanDays = stats.days;
        });

        return {
            prayerRate,
            habitsCount: habits.length,
            habitsCompletedToday,
            habitsRate: habits.length > 0 ? Math.round((habitsCompletedToday / habits.length) * 100) : 0,
            morningAthkar: athkar.morning,
            eveningAthkar: athkar.evening,
            tasbeehCount: athkar.tasbeehCount || 0,
            waterCups: water.cups || 0,
            workDone: work.done,
            workHours: work.hours || 0,
            pushupsCount: pushups,
            maxCleanDays
        };
    }

    // توليد التقرير التحليلي الشامل للمرشد الذكي
    getSmartCoachAnalysis(periodType = 'week') {
        let days = 7;
        let title = 'التقرير الأسبوعي';
        if (periodType === 'day') { days = 1; title = 'تقرير اليوم'; }
        else if (periodType === 'month') { days = 30; title = 'التقرير الشهري'; }
        else if (periodType === 'year') { days = 365; title = 'التقرير السنوي'; }

        const raw = this.hm.generateSmartReport(days);
        return {
            title: title,
            periodType: periodType,
            ...raw
        };
    }

    // رسم مخطط بياني تفاعلي على Canvas
    renderBarChart(canvasId, dataset, color = '#10b981', labelKey = 'rate') {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        const padding = 25;
        const count = dataset.length;
        const itemWidth = (width - padding * 2) / count;
        const barWidth = Math.max(4, itemWidth - (count > 15 ? 4 : 8));
        const maxHeight = height - padding * 2;

        dataset.forEach((item, index) => {
            const val = item[labelKey] || 0;
            const x = padding + index * itemWidth + (itemWidth - barWidth) / 2;
            const barHeight = Math.max(3, (val / 100) * maxHeight);
            const y = height - padding - barHeight;

            // خلفية العمود
            ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.beginPath();
            ctx.roundRect(x, padding, barWidth, maxHeight, 4);
            ctx.fill();

            // العمود الفعلي
            const gradient = ctx.createLinearGradient(0, y, 0, height - padding);
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, 'rgba(16, 185, 129, 0.2)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, 4);
            ctx.fill();

            // تسمية أسفل العمود (إذا كان عدد الأعمدة قليل)
            if (count <= 14 || index % Math.ceil(count / 10) === 0) {
                ctx.fillStyle = '#cbd5e1';
                ctx.font = '10px Cairo, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(item.label, x + barWidth / 2, height - 6);
            }
        });
    }
}

if (typeof window !== 'undefined') window.AnalyticsEngine = AnalyticsEngine;
if (typeof module !== 'undefined') module.exports = AnalyticsEngine;
