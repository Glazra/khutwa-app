/**
 * نظام إدارة العادات، العمل، تمرين الضغط، شرب الماء، والصلوات
 * 100% محلي وبدون إنترنت
 */

class HabitManager {
    constructor(storageKey = 'khutwa_habits_data') {
        this.storageKey = storageKey;
        this.data = this.loadData();
    }

    // البيانات الافتراضية المحدثة وفق رغبة المستخدم
    getDefaultData() {
        return {
            // العادات اليومية الإيجابية الأساسية
            dailyHabits: [
                {
                    id: 'h_pushups',
                    title: 'تمرين الضغط (Push-ups)',
                    category: 'لياقة وقوة',
                    icon: '💪',
                    type: 'counter', // عداد تكرار
                    target: 50,
                    createdDate: new Date().toISOString(),
                    logs: {} // 'YYYY-MM-DD': number or boolean
                },
                {
                    id: 'h_work',
                    title: 'إنجاز شغل ومهام اليوم',
                    category: 'عمل وإنتاجية',
                    icon: '💼',
                    type: 'work',
                    createdDate: new Date().toISOString(),
                    logs: {}
                }
            ],

            // سجلات شرب الماء اليومية: 'YYYY-MM-DD': { cups: 4, target: 8 }
            waterLogs: {},

            // سجلات العمل التفصيلية: 'YYYY-MM-DD': { done: true, hours: 6, note: '' }
            workLogs: {},

            // سجلات تمرين الضغط التفصيلية: 'YYYY-MM-DD': count
            pushupLogs: {},

            // نظام تتبع وتجنب العادات غير المرغوبة (حصن النقاء)
            abstinenceHabits: [
                {
                    id: 'abs_1',
                    codeName: 'العادة (1)',
                    realName: 'تجنب العادة غير المرغوبة',
                    startDate: new Date().toISOString(),
                    isPrivate: true,
                    relapses: [],
                    highestStreakHours: 0
                }
            ],

            // متابعة الصلوات يومياً
            prayerLogs: {},

            // متابعة الأذكار يومياً
            athkarLogs: {},

            // تاريخ التعديلات على العادات (Audit History)
            historyLog: []
        };
    }

    loadData() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return this.getDefaultData();
            const parsed = JSON.parse(raw);
            const merged = Object.assign(this.getDefaultData(), parsed);
            // التأكد من توفر الكائنات
            if (!merged.waterLogs) merged.waterLogs = {};
            if (!merged.workLogs) merged.workLogs = {};
            if (!merged.pushupLogs) merged.pushupLogs = {};
            if (!merged.historyLog) merged.historyLog = [];
            return merged;
        } catch (e) {
            console.error('خطأ في تحميل بيانات العادات:', e);
            return this.getDefaultData();
        }
    }

    saveData() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
            return true;
        } catch (e) {
            console.error('فشل حفظ البيانات محلياً:', e);
            return false;
        }
    }

    getTodayKey(date = new Date()) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    /* ==================== إدارة العادات اليومية ==================== */

    addDailyHabit(title, category = 'تطوير شخصي', icon = '⭐', type = 'check') {
        const newHabit = {
            id: 'h_' + Date.now(),
            title: title.trim(),
            category: category,
            icon: icon,
            type: type,
            createdDate: new Date().toISOString(),
            logs: {}
        };
        this.data.dailyHabits.push(newHabit);
        this.logAudit('add_habit', `إضافة عادة جديدة: ${title}`);
        this.saveData();
        return newHabit;
    }

    deleteDailyHabit(habitId) {
        const habit = this.data.dailyHabits.find(h => h.id === habitId);
        if (habit) {
            this.logAudit('delete_habit', `حذف عادة: ${habit.title}`);
        }
        this.data.dailyHabits = this.data.dailyHabits.filter(h => h.id !== habitId);
        this.saveData();
    }

    toggleDailyHabit(habitId, dateKey = null) {
        dateKey = dateKey || this.getTodayKey();
        const habit = this.data.dailyHabits.find(h => h.id === habitId);
        if (habit) {
            if (!habit.logs) habit.logs = {};
            habit.logs[dateKey] = !habit.logs[dateKey];
            this.saveData();
            return habit.logs[dateKey];
        }
        return false;
    }

    calculateStreak(habit) {
        if (!habit.logs) return 0;
        let streak = 0;
        let checkDate = new Date();
        
        let todayKey = this.getTodayKey(checkDate);
        if (!habit.logs[todayKey]) {
            checkDate.setDate(checkDate.getDate() - 1);
        }

        while (true) {
            let key = this.getTodayKey(checkDate);
            if (habit.logs[key]) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        return streak;
    }

    /* ==================== مؤشرات شرب الماء (Water Tracker) ==================== */

    getWaterData(dateKey = null) {
        dateKey = dateKey || this.getTodayKey();
        if (!this.data.waterLogs[dateKey]) {
            this.data.waterLogs[dateKey] = { cups: 0, target: 8 };
        }
        return this.data.waterLogs[dateKey];
    }

    addWaterCup(dateKey = null) {
        dateKey = dateKey || this.getTodayKey();
        const w = this.getWaterData(dateKey);
        w.cups = (w.cups || 0) + 1;
        this.saveData();
        return w;
    }

    removeWaterCup(dateKey = null) {
        dateKey = dateKey || this.getTodayKey();
        const w = this.getWaterData(dateKey);
        if (w.cups > 0) w.cups--;
        this.saveData();
        return w;
    }

    /* ==================== متابعة العمل والشغل (Work Tracker) ==================== */

    getWorkData(dateKey = null) {
        dateKey = dateKey || this.getTodayKey();
        return this.data.workLogs[dateKey] || { done: false, hours: 0, note: '' };
    }

    setWorkStatus(done, hours = 0, note = '', dateKey = null) {
        dateKey = dateKey || this.getTodayKey();
        this.data.workLogs[dateKey] = {
            done: Boolean(done),
            hours: parseFloat(hours) || 0,
            note: note.trim()
        };

        // تحديث عادة العمل في dailyHabits لتتزامن معها
        const workHabit = this.data.dailyHabits.find(h => h.id === 'h_work');
        if (workHabit) {
            if (!workHabit.logs) workHabit.logs = {};
            workHabit.logs[dateKey] = Boolean(done);
        }

        this.saveData();
        return this.data.workLogs[dateKey];
    }

    /* ==================== تمرين الضغط (Push-ups) ==================== */

    getPushupsCount(dateKey = null) {
        dateKey = dateKey || this.getTodayKey();
        return this.data.pushupLogs[dateKey] || 0;
    }

    addPushups(count, dateKey = null) {
        dateKey = dateKey || this.getTodayKey();
        const cur = this.getPushupsCount(dateKey);
        const next = Math.max(0, cur + count);
        this.data.pushupLogs[dateKey] = next;

        // مزامنة مع عادة الضغط
        const pushHabit = this.data.dailyHabits.find(h => h.id === 'h_pushups');
        if (pushHabit) {
            if (!pushHabit.logs) pushHabit.logs = {};
            pushHabit.logs[dateKey] = next > 0;
        }

        this.saveData();
        return next;
    }

    /* ==================== متابعة الصلوات مع ميزة التثبيت والتأكيد ==================== */

    togglePrayer(prayerName, dateKey = null, force = false) {
        dateKey = dateKey || this.getTodayKey();
        if (!this.data.prayerLogs[dateKey]) {
            this.data.prayerLogs[dateKey] = {
                fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false,
                sunnahCount: 0, witr: false, jamaahCount: 0
            };
        }

        const log = this.data.prayerLogs[dateKey];
        const currentVal = Boolean(log[prayerName]);

        // إذا كانت الصلاة مكتملة بالفعل، لا يتم إلغاؤها إلا إذا طُلب force صراحة
        if (currentVal && !force) {
            return { changed: false, locked: true, currentVal: true };
        }

        log[prayerName] = !currentVal;
        this.saveData();
        return { changed: true, locked: false, currentVal: log[prayerName] };
    }

    getPrayerStatus(dateKey = null) {
        dateKey = dateKey || this.getTodayKey();
        return this.data.prayerLogs[dateKey] || {
            fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false,
            sunnahCount: 0, witr: false, jamaahCount: 0
        };
    }

    getDailyPrayerCompletionRate(dateKey = null) {
        const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
        const status = this.getPrayerStatus(dateKey);
        let done = 0;
        prayers.forEach(p => { if (status[p]) done++; });
        return Math.round((done / prayers.length) * 100);
    }

    /* ==================== متابعة الأذكار مع ميزة التثبيت ==================== */

    toggleAthkar(type, dateKey = null, force = false) {
        dateKey = dateKey || this.getTodayKey();
        if (!this.data.athkarLogs[dateKey]) {
            this.data.athkarLogs[dateKey] = {
                morning: false,
                evening: false,
                tasbeehCount: 0
            };
        }
        const log = this.data.athkarLogs[dateKey];
        if (type === 'morning' || type === 'evening') {
            const currentVal = Boolean(log[type]);
            if (currentVal && !force) {
                return { changed: false, locked: true, currentVal: true };
            }
            log[type] = !currentVal;
        } else if (type === 'tasbeeh') {
            log.tasbeehCount = (log.tasbeehCount || 0) + 1;
        }
        this.saveData();
        return { changed: true, locked: false, currentVal: log[type] };
    }

    getAthkarStatus(dateKey = null) {
        dateKey = dateKey || this.getTodayKey();
        return this.data.athkarLogs[dateKey] || { morning: false, evening: false, tasbeehCount: 0 };
    }

    /* ==================== سجل التعديلات والتدقيق (Audit) ==================== */

    logAudit(action, description) {
        if (!this.data.historyLog) this.data.historyLog = [];
        this.data.historyLog.unshift({
            timestamp: new Date().toISOString(),
            action: action,
            description: description
        });
        if (this.data.historyLog.length > 50) this.data.historyLog.pop();
    }

    /* ==================== حصن النقاء ==================== */

    getAbstinenceStats(item) {
        const start = new Date(item.startDate);
        const now = new Date();
        const diffMs = Math.max(0, now - start);

        const totalSeconds = Math.floor(diffMs / 1000);
        const totalMinutes = Math.floor(totalSeconds / 60);
        const totalHours = Math.floor(totalMinutes / 60);
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;
        const minutes = totalMinutes % 60;
        const seconds = totalSeconds % 60;

        let stage = { title: 'البداية والانطلاق', color: '#64748b', badge: '🌱' };
        if (days >= 90) stage = { title: 'إعادة ضبط الدوبامين (حرية تامة)', color: '#10b981', badge: '👑' };
        else if (days >= 60) stage = { title: 'ترسيخ الهوية الجديدة', color: '#059669', badge: '💎' };
        else if (days >= 30) stage = { title: 'كسر القيد القديم (شهر كامل)', color: '#3b82f6', badge: '🛡️' };
        else if (days >= 14) stage = { title: 'مرحلة الثبات والقوة', color: '#6366f1', badge: '⚡' };
        else if (days >= 7) stage = { title: 'أسبوع النقاء الأول', color: '#8b5cf6', badge: '🔥' };
        else if (days >= 3) stage = { title: 'تخطي أصعب أيام الانسحاب', color: '#ec4899', badge: '🌿' };
        else if (days >= 1) stage = { title: 'اليوم الأول بنجاح', color: '#f59e0b', badge: '☀️' };

        return {
            days, hours, minutes, seconds,
            totalHours,
            stage,
            startDateFormatted: start.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        };
    }

    recordRelapse(id, reason = '', trigger = '') {
        const item = this.data.abstinenceHabits.find(h => h.id === id);
        if (!item) return false;

        const start = new Date(item.startDate);
        const now = new Date();
        const durationHours = Math.floor((now - start) / (1000 * 60 * 60));

        if (durationHours > (item.highestStreakHours || 0)) {
            item.highestStreakHours = durationHours;
        }

        item.relapses.push({
            endedAt: now.toISOString(),
            durationHours: durationHours,
            reason: reason.trim(),
            trigger: trigger.trim()
        });

        item.startDate = now.toISOString();
        this.logAudit('relapse_reset', `تجديد العهد في حصن النقاء بعد ${Math.floor(durationHours/24)} يوم`);
        this.saveData();
        return true;
    }

    /* ==================== محرك التقارير الذكية (التحليلات المقارنة) ==================== */

    generateSmartReport(rangeDays = 7) {
        const days = [];
        for (let i = rangeDays - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(this.getTodayKey(d));
        }

        let totalPrayersDone = 0;
        let fajrDoneCount = 0;
        let totalWaterCups = 0;
        let workDaysCount = 0;
        let totalWorkHours = 0;
        let totalPushups = 0;
        let morningAthkarCount = 0;
        let eveningAthkarCount = 0;

        days.forEach(key => {
            const p = this.getPrayerStatus(key);
            if (p.fajr) { fajrDoneCount++; totalPrayersDone++; }
            if (p.dhuhr) totalPrayersDone++;
            if (p.asr) totalPrayersDone++;
            if (p.maghrib) totalPrayersDone++;
            if (p.isha) totalPrayersDone++;

            const w = this.getWaterData(key);
            totalWaterCups += (w.cups || 0);

            const work = this.getWorkData(key);
            if (work.done) {
                workDaysCount++;
                totalWorkHours += (work.hours || 0);
            }

            totalPushups += this.getPushupsCount(key);

            const ath = this.getAthkarStatus(key);
            if (ath.morning) morningAthkarCount++;
            if (ath.evening) eveningAthkarCount++;
        });

        const maxPrayers = rangeDays * 5;
        const prayerAdherence = Math.round((totalPrayersDone / maxPrayers) * 100);
        const fajrAdherence = Math.round((fajrDoneCount / rangeDays) * 100);
        const avgWater = (totalWaterCups / rangeDays).toFixed(1);
        const workAdherence = Math.round((workDaysCount / rangeDays) * 100);

        // تصنيف التطور ونقاط القوة
        const strengths = [];
        if (fajrAdherence >= 70) strengths.push(`ثبات رائع في صلاة الفجر بنسبة ${fajrAdherence}%`);
        if (prayerAdherence >= 80) strengths.push(`التزام إجمالي ممتاز بالصلوات الخمس بنسبة ${prayerAdherence}%`);
        if (workAdherence >= 60) strengths.push(`إنتاجية عالية في العمل وإنجاز المهام (${workDaysCount} أيام من أصل ${rangeDays})`);
        if (totalPushups > 0) strengths.push(`استمرار في تمرين الضغط بإجمالي ${totalPushups} ضغطة`);
        if (avgWater >= 6) strengths.push(`معدل شرب ماء صحي ومتوازن (متوسط ${avgWater} أكواب يومياً)`);
        if (morningAthkarCount >= rangeDays * 0.6) strengths.push(`مواظبة قوية على أذكار الصباح`);

        // تصنيف التقصير والتنبيه
        const weaknesses = [];
        if (fajrAdherence < 50) weaknesses.push(`تقصير في صلاة الفجر (حُققت في ${fajrDoneCount} أيام فقط من أصل ${rangeDays})`);
        if (avgWater < 5) weaknesses.push(`معدل شرب الماء منخفض (متوسط ${avgWater} أكواب فقط، والهدف 8 أكواب)`);
        if (workAdherence < 40) weaknesses.push(`أيام العمل والإنتاجية بحاجة لزيادة الالتزام (${workDaysCount} أيام فقط)`);
        if (eveningAthkarCount < morningAthkarCount / 2) weaknesses.push(`إهمال ملحوظ لأذكار المساء مقارنة بأذكار الصباح`);
        if (totalPushups === 0) weaknesses.push(`لم تسجل أي تكرارات في تمرين الضغط خلال هذه الفترة`);

        return {
            rangeDays,
            prayerAdherence,
            fajrAdherence,
            totalPushups,
            totalWaterCups,
            avgWater,
            workDaysCount,
            totalWorkHours,
            strengths,
            weaknesses,
            auditLog: this.data.historyLog || []
        };
    }

    exportBackup() {
        const backupStr = JSON.stringify(this.data, null, 2);
        const blob = new Blob([backupStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = this.getTodayKey();
        a.href = url;
        a.download = `khutwa_backup_${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importBackup(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            if (parsed && typeof parsed === 'object') {
                this.data = Object.assign(this.getDefaultData(), parsed);
                this.saveData();
                return true;
            }
        } catch (e) {
            console.error('فشل استيراد النسخة الاحتياطية:', e);
        }
        return false;
    }
}

if (typeof window !== 'undefined') window.HabitManager = HabitManager;
if (typeof module !== 'undefined') module.exports = HabitManager;
