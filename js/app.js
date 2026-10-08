/**
 * تطبيق خُطـوة (Khutwa) - المحرك التنسيقي الرئيسي (App Controller)
 * يعمل أوفلاين 100% مع تشغيل محلي فوري
 */

class KhutwaApp {
    constructor() {
        this.calculator = new OfflinePrayerCalculator();
        this.habitManager = new HabitManager();
        this.analytics = new AnalyticsEngine(this.habitManager);
        this.notifications = new NotificationManager();

        // إعدادات التطبيق
        this.settings = this.loadSettings();
        this.currentPrayerTimes = null;
        this.nextPrayerInfo = null;
        this.prayerTimer = null;

        // حالة السبحة الإلكترونية
        this.currentTasbeehIndex = 0;
        this.currentTasbeehCount = 0;

        // حالة الخصوصية (Discreet Mode)
        this.isDiscreet = false;

        // التصنيف النشط للأذكار
        this.activeAthkarCategory = 'morning';

        // فترة التحليلات النشطة (يومي | أسبوعي | شهري | سنوي)
        this.selectedPeriod = 'week';

        // دالة التأكيد المؤجلة لفك قفل الصلاة أو الذكر
        this.pendingUnlockCallback = null;

        this.init();
    }

    loadSettings() {
        const defaultSettings = {
            cityIndex: 0,
            calculationMethod: 'Egypt',
            theme: 'dark',
            notificationsEnabled: false,
            waterReminder: true
        };
        try {
            const raw = localStorage.getItem('khutwa_settings');
            if (raw) return Object.assign(defaultSettings, JSON.parse(raw));
        } catch (e) {
            console.error('فشل قراءة الإعدادات:', e);
        }
        return defaultSettings;
    }

    saveSettings() {
        try {
            localStorage.setItem('khutwa_settings', JSON.stringify(this.settings));
        } catch (e) {
            console.error('فشل حفظ الإعدادات:', e);
        }
    }

    init() {
        this.applyTheme(this.settings.theme);
        this.populateCitySelector();
        this.setupEventListeners();
        this.updateDates();
        this.updatePrayerTimes();
        this.renderTodayDashboard();
        this.renderSpiritualTab();
        this.renderHabitsTab();
        this.renderShieldTab();
        this.renderAnalyticsTab();
        this.startTimers();
        this.setupPWAInstall();
    }

    setupPWAInstall() {
        this.deferredInstallPrompt = null;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredInstallPrompt = e;
            const banner = document.getElementById('pwaInstallBanner');
            if (banner) banner.style.display = 'flex';
        });

        window.addEventListener('appinstalled', () => {
            this.dismissInstallBanner();
            this.showToast('أصبح تطبيق خُطوة الآن على شاشتك الرئيسية! 🚀');
        });
    }

    installPWA() {
        if (this.deferredInstallPrompt) {
            this.deferredInstallPrompt.prompt();
            this.deferredInstallPrompt.userChoice.then((choice) => {
                if (choice.outcome === 'accepted') {
                    this.showToast('تمت الإضافة إلى الشاشة الرئيسية 📲');
                    this.dismissInstallBanner();
                }
                this.deferredInstallPrompt = null;
            });
        } else {
            this.openModal('modalInstallGuide');
        }
    }

    dismissInstallBanner() {
        const banner = document.getElementById('pwaInstallBanner');
        if (banner) banner.style.display = 'none';
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(reg => console.log('تم تسجيل Service Worker بنجاح'))
                    .catch(err => console.log('تعذر تسجيل Service Worker محلياً:', err));
            });
        }
    }

    setupEventListeners() {
        const btnPrivacy = document.getElementById('btnPrivacyToggle');
        if (btnPrivacy) btnPrivacy.addEventListener('click', () => this.toggleDiscreetMode());

        const btnTheme = document.getElementById('btnThemeToggle');
        if (btnTheme) btnTheme.addEventListener('click', () => this.toggleTheme());
    }

    toggleTheme() {
        const newTheme = this.settings.theme === 'dark' ? 'light' : 'dark';
        this.settings.theme = newTheme;
        this.saveSettings();
        this.applyTheme(newTheme);
        this.showToast(newTheme === 'dark' ? 'الوضع الليلي 🌙' : 'الوضع الفاتح ☀️');
    }

    applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-theme');
            const btn = document.getElementById('btnThemeToggle');
            if (btn) btn.textContent = '☀️';
        } else {
            document.body.classList.remove('light-theme');
            const btn = document.getElementById('btnThemeToggle');
            if (btn) btn.textContent = '🌙';
        }
    }

    toggleDiscreetMode() {
        this.isDiscreet = !this.isDiscreet;
        const icon = document.getElementById('privacyIcon');
        const text = document.getElementById('privacyText');
        if (icon && text) {
            icon.textContent = this.isDiscreet ? '👁️' : '🔒';
            text.textContent = this.isDiscreet ? 'إظهار التفاصيل' : 'وضع الخصوصية';
        }
        this.renderShieldTab();
        this.showToast(this.isDiscreet ? 'تم تفعيل وضع الخصوصية 🛡️' : 'تم إظهار التفاصيل 👁️');
    }

    updateDates() {
        const now = new Date();
        const txtHijri = document.getElementById('txtHijriDate');
        const txtGreg = document.getElementById('txtGregorianDate');

        if (txtHijri) {
            txtHijri.textContent = this.calculator.getHijriDate(now);
        }

        if (txtGreg) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            txtGreg.textContent = now.toLocaleDateString('ar-EG', options);
        }
    }

    populateCitySelector() {
        const sel = document.getElementById('selCity');
        if (!sel) return;
        sel.innerHTML = '';
        this.calculator.popularCities.forEach((city, index) => {
            const opt = document.createElement('option');
            opt.value = index;
            opt.textContent = city.name;
            if (index === this.settings.cityIndex) opt.selected = true;
            sel.appendChild(opt);
        });

        const selMethod = document.getElementById('selCalculationMethod');
        if (selMethod) {
            selMethod.value = this.settings.calculationMethod;
        }
    }

    changeCity(cityIndex) {
        this.settings.cityIndex = parseInt(cityIndex, 10);
        this.saveSettings();
        this.updatePrayerTimes();
        this.renderTodayDashboard();
        this.renderSpiritualTab();
        this.showToast('تم تحديث المدينة بنجاح 📍');
    }

    changeMethod(methodName) {
        this.settings.calculationMethod = methodName;
        this.saveSettings();
        this.updatePrayerTimes();
        this.renderTodayDashboard();
        this.renderSpiritualTab();
        this.showToast('تم تحديث طريقة الحساب 🕌');
    }

    updatePrayerTimes() {
        const city = this.calculator.popularCities[this.settings.cityIndex] || this.calculator.popularCities[0];
        const now = new Date();
        this.currentPrayerTimes = this.calculator.getTimes(
            now,
            city.lat,
            city.lng,
            city.timezone,
            this.settings.calculationMethod
        );

        const badge = document.getElementById('prayerLocationBadge');
        if (badge) badge.textContent = city.name.split('،')[0];

        this.calculateNextPrayer();
    }

    calculateNextPrayer() {
        if (!this.currentPrayerTimes) return;
        const now = new Date();
        const currentHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;

        const raw = this.currentPrayerTimes.rawTimes;
        const prayerList = [
            { key: 'fajr', name: 'الفجر', hours: raw.fajr },
            { key: 'sunrise', name: 'الشروق', hours: raw.sunrise, isShorooq: true },
            { key: 'dhuhr', name: 'الظهر', hours: raw.dhuhr },
            { key: 'asr', name: 'العصر', hours: raw.asr },
            { key: 'maghrib', name: 'المغرب', hours: raw.maghrib },
            { key: 'isha', name: 'العشاء', hours: raw.isha }
        ];

        let next = null;
        for (let p of prayerList) {
            if (p.hours > currentHours) {
                next = p;
                break;
            }
        }

        if (!next) {
            next = {
                key: 'fajr',
                name: 'فجر الغد',
                hours: raw.fajr + 24
            };
        }

        this.nextPrayerInfo = next;

        const lbl = document.getElementById('nextPrayerLabel');
        const nameEl = document.getElementById('nextPrayerName');
        const timeEl = document.getElementById('nextPrayerTime');

        if (lbl) lbl.textContent = next.isShorooq ? 'الموعد القادم' : 'الصلاة القادمة';
        if (nameEl) nameEl.textContent = next.name;
        if (timeEl) {
            const formattedTime = this.calculator.formatTime(next.hours % 24);
            timeEl.textContent = formattedTime.time12;
        }
    }

    startTimers() {
        if (this.prayerTimer) clearInterval(this.prayerTimer);
        this.prayerTimer = setInterval(() => {
            this.tickPrayerCountdown();
            this.tickAbstinenceTimer();
        }, 1000);
    }

    tickPrayerCountdown() {
        if (!this.nextPrayerInfo) return;
        const now = new Date();
        const currentHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;

        let diffHours = this.nextPrayerInfo.hours - currentHours;
        if (diffHours < 0) diffHours += 24;

        const totalSec = Math.floor(diffHours * 3600);
        const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
        const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
        const s = String(totalSec % 60).padStart(2, '0');

        const cdEl = document.getElementById('prayerCountdown');
        if (cdEl) cdEl.textContent = `${h}:${m}:${s}`;

        if (totalSec <= 1) {
            this.updatePrayerTimes();
        }
    }

    tickAbstinenceTimer() {
        const item = this.habitManager.data.abstinenceHabits[0];
        if (!item) return;
        const stats = this.habitManager.getAbstinenceStats(item);

        const qDays = document.getElementById('quickDays');
        const qHours = document.getElementById('quickHours');
        const qMins = document.getElementById('quickMins');
        const qSecs = document.getElementById('quickSecs');
        if (qDays) qDays.textContent = stats.days;
        if (qHours) qHours.textContent = stats.hours;
        if (qMins) qMins.textContent = stats.minutes;
        if (qSecs) qSecs.textContent = stats.seconds;

        const sDays = document.getElementById('shieldDays');
        const sHours = document.getElementById('shieldHours');
        const sMins = document.getElementById('shieldMins');
        const sSecs = document.getElementById('shieldSecs');
        if (sDays) sDays.textContent = stats.days;
        if (sHours) sHours.textContent = stats.hours;
        if (sMins) sMins.textContent = stats.minutes;
        if (sSecs) sSecs.textContent = stats.seconds;
    }

    // ==================== لوحة اليوم الرئيسية ====================
    renderTodayDashboard() {
        this.renderTodayPrayersGrid();
        this.renderWaterWidget();
        this.renderWorkWidget();
        this.renderPushupsWidget();
        this.renderTodayHabitsList();
        this.updateDailyProgress();
        this.updateQuickAthkarStatus();

        const item = this.habitManager.data.abstinenceHabits[0];
        if (item) {
            const stats = this.habitManager.getAbstinenceStats(item);
            const pill = document.getElementById('quickStagePill');
            if (pill) pill.innerHTML = `${stats.stage.badge} ${stats.stage.title}`;
        }
    }

    // مربعات الصلوات مع الحماية من الإلغاء العفوي
    renderTodayPrayersGrid() {
        const grid = document.getElementById('todayPrayersGrid');
        if (!grid || !this.currentPrayerTimes) return;

        const prayers = [
            { key: 'fajr', name: 'الفجر', time: this.currentPrayerTimes.fajr.time12 },
            { key: 'dhuhr', name: 'الظهر', time: this.currentPrayerTimes.dhuhr.time12 },
            { key: 'asr', name: 'العصر', time: this.currentPrayerTimes.asr.time12 },
            { key: 'maghrib', name: 'المغرب', time: this.currentPrayerTimes.maghrib.time12 },
            { key: 'isha', name: 'العشاء', time: this.currentPrayerTimes.isha.time12 }
        ];

        const status = this.habitManager.getPrayerStatus();
        grid.innerHTML = '';

        prayers.forEach(p => {
            const isDone = Boolean(status[p.key]);
            const isNext = this.nextPrayerInfo && this.nextPrayerInfo.key === p.key;

            const box = document.createElement('div');
            box.className = `prayer-box ${isDone ? 'done' : ''} ${isNext ? 'active-now' : ''}`;
            box.innerHTML = `
                <span class="p-name">${p.name}</span>
                <span class="p-time">${p.time.split(' ')[0]}</span>
                <span class="p-check">${isDone ? '✓ 🔒' : '○'}</span>
            `;

            box.onclick = () => {
                this.handlePrayerClick(p);
            };
            grid.appendChild(box);
        });
    }

    handlePrayerClick(p) {
        const status = this.habitManager.getPrayerStatus();
        const isDone = Boolean(status[p.key]);

        if (isDone) {
            // الصلاة مسجلة بالفعل: نطلب التأكيد قبل الإلغاء حتى لا تُلغى بالخطأ
            this.askUnlockConfirmation(
                `لقد سجلت صلاة (${p.name}) بالفعل بفضل الله. هل تريد بالتأكيد إلغاء تسجيلها؟`,
                () => {
                    this.habitManager.togglePrayer(p.key, null, true);
                    this.renderTodayDashboard();
                    this.renderSpiritualTab();
                    this.showToast(`تم إلغاء تسجيل صلاة ${p.name}`);
                }
            );
        } else {
            // تسجيل الصلاة مباشرة وتثبيتها
            this.notifications.triggerHaptic(50);
            this.notifications.playNotificationSound();
            this.habitManager.togglePrayer(p.key, null, true);
            this.renderTodayDashboard();
            this.renderSpiritualTab();
            this.showToast(`تقبل الله صلاة ${p.name} 🕌`);
        }
    }

    // ==================== ويدجت شرب الماء ====================
    renderWaterWidget() {
        const w = this.habitManager.getWaterData();
        const txtCups = document.getElementById('txtWaterCups');
        const txtTarget = document.getElementById('txtWaterTarget');
        const txtLiters = document.getElementById('txtWaterLiters');
        const glassesContainer = document.getElementById('waterGlassesContainer');
        const chkReminder = document.getElementById('chkWaterReminder');

        if (txtCups) txtCups.textContent = w.cups || 0;
        if (txtTarget) txtTarget.textContent = w.target || 8;
        if (txtLiters) txtLiters.textContent = ((w.cups || 0) * 0.25).toFixed(1);
        if (chkReminder) chkReminder.checked = this.notifications.waterReminderEnabled;

        if (glassesContainer) {
            glassesContainer.innerHTML = '';
            const total = w.target || 8;
            for (let i = 1; i <= total; i++) {
                const isFilled = (w.cups || 0) >= i;
                const icon = document.createElement('span');
                icon.className = `water-cup-icon ${isFilled ? 'filled' : ''}`;
                icon.textContent = '🥛';
                icon.title = `كوب ${i}`;
                icon.onclick = () => {
                    this.setWaterTo(i);
                };
                glassesContainer.appendChild(icon);
            }
        }
    }

    addWaterCup() {
        const w = this.habitManager.addWaterCup();
        this.notifications.playWaterSound();
        this.notifications.triggerHaptic(35);
        this.renderWaterWidget();
        this.updateDailyProgress();
        this.showToast(`كوب ماء منعش 💧 (${w.cups} / 8)`);
    }

    removeWaterCup() {
        const w = this.habitManager.removeWaterCup();
        this.notifications.triggerHaptic(25);
        this.renderWaterWidget();
        this.updateDailyProgress();
    }

    setWaterTo(cups) {
        const w = this.habitManager.getWaterData();
        w.cups = cups;
        this.habitManager.saveData();
        this.notifications.playWaterSound();
        this.notifications.triggerHaptic(30);
        this.renderWaterWidget();
        this.updateDailyProgress();
        this.showToast(`تم ضبط شرب الماء على ${cups} أكواب 💧`);
    }

    toggleWaterReminder(checked) {
        this.notifications.waterReminderEnabled = checked;
        this.settings.waterReminder = checked;
        this.saveSettings();
        this.showToast(checked ? 'تم تفعيل تذكير شرب الماء 🔔' : 'تم إيقاف تذكير الماء');
    }

    // ==================== ويدجت العمل والإنتاجية ====================
    renderWorkWidget() {
        const work = this.habitManager.getWorkData();
        const btnToggle = document.getElementById('btnToggleWorkDone');
        const badge = document.getElementById('workStatusBadge');
        const inpHours = document.getElementById('inputWorkHours');
        const inpNote = document.getElementById('inputWorkNote');

        if (btnToggle) {
            if (work.done) {
                btnToggle.classList.add('active');
                btnToggle.textContent = 'نعم، أنجزت عملي اليوم ✓';
            } else {
                btnToggle.classList.remove('active');
                btnToggle.textContent = 'اضغط لتأكيد إنجاز الشغل';
            }
        }

        if (badge) {
            if (work.done) {
                badge.textContent = `مكتمل (${work.hours || 0} س) 💼`;
                badge.style.color = '#34d399';
            } else {
                badge.textContent = 'لم يسجل بعد';
                badge.style.color = '#94a3b8';
            }
        }

        if (inpHours && !inpHours.matches(':focus')) inpHours.value = work.hours || 0;
        if (inpNote && !inpNote.matches(':focus')) inpNote.value = work.note || '';
    }

    toggleWorkStatus() {
        const cur = this.habitManager.getWorkData();
        const next = !cur.done;
        const hours = parseFloat(document.getElementById('inputWorkHours')?.value) || (next ? 6 : 0);
        const note = document.getElementById('inputWorkNote')?.value || '';

        this.notifications.triggerHaptic(40);
        this.habitManager.setWorkStatus(next, hours, note);
        this.renderWorkWidget();
        this.updateDailyProgress();
        this.showToast(next ? 'عاش! تم توثيق إنجاز عملك اليوم 💼' : 'تم تعديل حالة العمل');
    }

    saveWorkHours(val) {
        const cur = this.habitManager.getWorkData();
        this.habitManager.setWorkStatus(cur.done, parseFloat(val) || 0, cur.note);
        this.renderWorkWidget();
    }

    saveWorkNote(val) {
        const cur = this.habitManager.getWorkData();
        this.habitManager.setWorkStatus(cur.done, cur.hours, val);
    }

    // ==================== ويدجت تمرين الضغط ====================
    renderPushupsWidget() {
        const count = this.habitManager.getPushupsCount();
        const txtToday = document.getElementById('txtPushupsToday');
        const badge = document.getElementById('pushupsBadge');

        if (txtToday) txtToday.innerHTML = `${count} <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: normal;">/ 50 ضغطة</span>`;
        if (badge) {
            badge.textContent = `${count} ضغطة 💪`;
            badge.style.color = count >= 50 ? '#34d399' : (count > 0 ? '#fbbf24' : '#94a3b8');
        }
    }

    addPushupReps(n) {
        const next = this.habitManager.addPushups(n);
        this.notifications.triggerHaptic(40);
        if (next >= 50) {
            this.notifications.playNotificationSound();
            this.showToast(`بطل! حققت هدف تمرين الضغط (${next} ضغطة) 💪🔥`);
        } else {
            this.showToast(`+${n} ضغطة! المجموع: ${next}`);
        }
        this.renderPushupsWidget();
        this.updateDailyProgress();
    }

    resetPushups() {
        if (confirm('هل تريد تصفير عداد الضغط لليوم؟')) {
            const dateKey = this.habitManager.getTodayKey();
            this.habitManager.data.pushupLogs[dateKey] = 0;
            this.habitManager.saveData();
            this.renderPushupsWidget();
            this.updateDailyProgress();
            this.showToast('تم تصفير عداد الضغط');
        }
    }

    // ==================== قائمة العادات اليومية ====================
    renderTodayHabitsList() {
        const list = document.getElementById('todayHabitsList');
        if (!list) return;

        // استبعاد عادات الضغط والعمل لأن لها ويدجات مخصصة في الأعلى
        const habits = (this.habitManager.data.dailyHabits || []).filter(h => h.id !== 'h_work' && h.id !== 'h_pushups');
        const todayKey = this.habitManager.getTodayKey();

        if (habits.length === 0) {
            list.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 12px; font-size: 0.84rem;">لا توجد عادات إضافية. اضغط "+ إضافة عادة" إن أردت إضافة عادة خاصة.</div>`;
            return;
        }

        list.innerHTML = '';
        habits.forEach(h => {
            const isDone = Boolean(h.logs && h.logs[todayKey]);
            const streak = this.habitManager.calculateStreak(h);

            const item = document.createElement('div');
            item.className = `habit-item ${isDone ? 'done' : ''}`;
            item.innerHTML = `
                <div class="habit-left">
                    <div class="habit-icon-box">${h.icon || '⭐'}</div>
                    <div class="habit-details">
                        <h4 class="habit-title">${h.title}</h4>
                        <p>${h.category} • <span class="habit-streak-badge">🔥 ${streak} ${streak === 1 ? 'يوم' : 'أيام'}</span></p>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button class="btn-icon" style="width: 30px; height: 30px; font-size: 0.8rem; color: #f43f5e;" onclick="event.stopPropagation(); khutwaApp.deleteHabit('${h.id}')" title="حذف العادة">✕</button>
                    <div class="check-circle">${isDone ? '✓' : ''}</div>
                </div>
            `;
            item.onclick = () => {
                this.notifications.triggerHaptic(40);
                this.habitManager.toggleDailyHabit(h.id);
                this.renderTodayDashboard();
                this.renderHabitsTab();
            };
            list.appendChild(item);
        });
    }

    updateDailyProgress() {
        const prayerRate = this.habitManager.getDailyPrayerCompletionRate();
        const water = this.habitManager.getWaterData();
        const waterRate = Math.min(100, Math.round(((water.cups || 0) / 8) * 100));
        const work = this.habitManager.getWorkData();
        const workScore = work.done ? 100 : 0;
        const pushups = this.habitManager.getPushupsCount();
        const pushupScore = Math.min(100, Math.round((pushups / 50) * 100));

        const athkar = this.habitManager.getAthkarStatus();
        let athkarScore = (athkar.morning ? 50 : 0) + (athkar.evening ? 50 : 0);

        // معدل الإنجاز التراكمي لليوم
        const overallRate = Math.round(
            (prayerRate * 0.35) + 
            (workScore * 0.25) + 
            (waterRate * 0.15) + 
            (pushupScore * 0.15) + 
            (athkarScore * 0.10)
        );

        const txtRate = document.getElementById('txtDailyRate');
        const barRate = document.getElementById('barDailyRate');

        if (txtRate) txtRate.textContent = `${overallRate}%`;
        if (barRate) barRate.style.width = `${overallRate}%`;
    }

    updateQuickAthkarStatus() {
        const status = this.habitManager.getAthkarStatus();
        const mornBox = document.getElementById('quickMorningAthkar');
        const eveBox = document.getElementById('quickEveningAthkar');
        const mornCheck = document.getElementById('quickMorningCheck');
        const eveCheck = document.getElementById('quickEveningCheck');
        const badge = document.getElementById('athkarSummaryBadge');

        if (status.morning) {
            if (mornBox) mornBox.classList.add('done');
            if (mornCheck) mornCheck.textContent = '✓ 🔒';
        } else {
            if (mornBox) mornBox.classList.remove('done');
            if (mornCheck) mornCheck.textContent = '○';
        }

        if (status.evening) {
            if (eveBox) eveBox.classList.add('done');
            if (eveCheck) eveCheck.textContent = '✓ 🔒';
        } else {
            if (eveBox) eveBox.classList.remove('done');
            if (eveCheck) eveCheck.textContent = '○';
        }

        if (badge) {
            if (status.morning && status.evening) {
                badge.textContent = 'مكتمل بالكامل 🌟';
                badge.style.color = '#34d399';
            } else if (status.morning || status.evening) {
                badge.textContent = 'مكتمل جزئياً ⏳';
                badge.style.color = '#fbbf24';
            } else {
                badge.textContent = 'غير مكتمل';
                badge.style.color = '#94a3b8';
            }
        }
    }

    toggleQuickAthkar(type) {
        const status = this.habitManager.getAthkarStatus();
        const isDone = Boolean(status[type]);

        if (isDone) {
            const name = type === 'morning' ? 'أذكار الصباح' : 'أذكار المساء';
            this.askUnlockConfirmation(
                `لقد أتممت (${name}) بالفعل. هل تريد بالتأكيد إلغاء التحديد؟`,
                () => {
                    this.habitManager.toggleAthkar(type, null, true);
                    this.updateQuickAthkarStatus();
                    this.updateDailyProgress();
                    this.showToast(`تم إلغاء تحديد ${name}`);
                }
            );
        } else {
            this.notifications.triggerHaptic(40);
            this.notifications.playNotificationSound();
            this.habitManager.toggleAthkar(type, null, true);
            this.updateQuickAthkarStatus();
            this.updateDailyProgress();
            this.showToast(type === 'morning' ? 'تقبل الله أذكار الصباح ☀️' : 'تقبل الله أذكار المساء 🌆');
        }
    }

    askUnlockConfirmation(msg, callback) {
        const txtEl = document.getElementById('txtConfirmUnlockMsg');
        if (txtEl) txtEl.textContent = msg;
        this.pendingUnlockCallback = callback;
        this.openModal('modalConfirmUnlock');
    }

    confirmUnlockAction() {
        if (this.pendingUnlockCallback) {
            this.pendingUnlockCallback();
            this.pendingUnlockCallback = null;
        }
        this.closeModal('modalConfirmUnlock');
    }

    // ==================== رسم تبويب الصلوات والأذكار ====================
    renderSpiritualTab() {
        this.renderDetailedPrayersList();
        this.initTasbeeh();
        this.showAthkarCategory(this.activeAthkarCategory);
    }

    renderDetailedPrayersList() {
        const list = document.getElementById('detailedPrayersList');
        if (!list || !this.currentPrayerTimes) return;

        const status = this.habitManager.getPrayerStatus();
        const pt = this.currentPrayerTimes;

        const detailed = [
            { key: 'fajr', name: 'صلاة الفجر', time: pt.fajr.time12, sunnah: 'ركعتا الفجر (خير من الدنيا وما فيها)', isFard: true },
            { key: 'sunrise', name: 'الشروق', time: pt.sunrise.time12, sunnah: 'صلاة الضحى (ركعتان إلى ثمان)', isFard: false },
            { key: 'dhuhr', name: 'صلاة الظهر', time: pt.dhuhr.time12, sunnah: '٤ قبلها واثنتان بعدها', isFard: true },
            { key: 'asr', name: 'صلاة العصر', time: pt.asr.time12, sunnah: '٤ ركعات سنة غير مؤكدة', isFard: true },
            { key: 'maghrib', name: 'صلاة المغرب', time: pt.maghrib.time12, sunnah: 'ركعتان بعد المغرب', isFard: true },
            { key: 'isha', name: 'صلاة العشاء', time: pt.isha.time12, sunnah: 'ركعتان بعدها + الشفع والوتر', isFard: true },
            { key: 'lastThird', name: 'الثلث الأخير والقيام', time: pt.lastThird.time12, sunnah: 'وقت استجابة الدعاء والنزول الإلهي', isFard: false }
        ];

        list.innerHTML = '';
        detailed.forEach(d => {
            const isDone = Boolean(status[d.key]);
            const row = document.createElement('div');
            row.className = `athkar-card-item ${isDone ? 'done' : ''}`;
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';

            row.innerHTML = `
                <div>
                    <div style="font-weight: 700; font-size: 0.95rem; color: ${isDone ? 'var(--accent-emerald-light)' : 'var(--text-main)'}">
                        ${d.name} <span style="font-size: 0.8rem; color: var(--accent-gold-light); font-weight: normal; margin-right: 6px;">(${d.time})</span>
                    </div>
                    <div style="font-size: 0.74rem; color: var(--text-dim); margin-top: 2px;">
                        ${d.sunnah}
                    </div>
                </div>
                ${d.isFard ? `
                    <button class="athkar-counter-btn ${isDone ? 'completed' : ''}" onclick="khutwaApp.handlePrayerClick({ key: '${d.key}', name: '${d.name}' })">
                        ${isDone ? 'تمت ✓ 🔒' : 'تسجيل'}
                    </button>
                ` : `
                    <span style="font-size: 0.75rem; color: var(--accent-emerald-light);">فضيلة</span>
                `}
            `;
            list.appendChild(row);
        });
    }

    // السبحة الإلكترونية
    initTasbeeh() {
        const sel = document.getElementById('selTasbeehPreset');
        if (!sel || sel.children.length > 0) return;

        AthkarData.tasbeehOptions.forEach((opt, idx) => {
            const el = document.createElement('option');
            el.value = idx;
            el.textContent = `${opt.title} (${opt.target})`;
            sel.appendChild(el);
        });

        this.updateTasbeehUI();
    }

    changeTasbeehPreset(index) {
        this.currentTasbeehIndex = parseInt(index, 10);
        this.currentTasbeehCount = 0;
        this.updateTasbeehUI();
    }

    incrementTasbeeh() {
        this.currentTasbeehCount++;
        const preset = AthkarData.tasbeehOptions[this.currentTasbeehIndex];
        
        this.notifications.triggerHaptic(25);
        this.habitManager.toggleAthkar('tasbeeh');

        if (this.currentTasbeehCount === preset.target) {
            this.notifications.playNotificationSound();
            this.notifications.triggerHaptic(80);
            this.showToast(`أتممت ${preset.target} من ${preset.title}! تقبل الله 🤲`);
        }

        this.updateTasbeehUI();
    }

    resetTasbeeh() {
        this.currentTasbeehCount = 0;
        this.updateTasbeehUI();
        this.showToast('تم تصفير السبحة 🔄');
    }

    updateTasbeehUI() {
        const preset = AthkarData.tasbeehOptions[this.currentTasbeehIndex] || AthkarData.tasbeehOptions[0];
        const phraseEl = document.getElementById('tasbeehCurrentPhrase');
        const countEl = document.getElementById('tasbeehCountDisplay');
        const targetEl = document.getElementById('tasbeehTargetDisplay');
        const badge = document.getElementById('totalTasbeehBadge');

        if (phraseEl) phraseEl.textContent = preset.title;
        if (countEl) countEl.textContent = this.currentTasbeehCount;
        if (targetEl) targetEl.textContent = `الهدف: ${preset.target}`;

        const athkar = this.habitManager.getAthkarStatus();
        if (badge) badge.textContent = `اليوم: ${athkar.tasbeehCount || 0}`;
    }

    showAthkarCategory(cat) {
        this.activeAthkarCategory = cat;
        const btnMorn = document.getElementById('btnShowMorningAthkar');
        const btnEve = document.getElementById('btnShowEveningAthkar');
        const btnAfter = document.getElementById('btnShowAfterPrayerAthkar');
        const container = document.getElementById('fullAthkarListContainer');

        if (btnMorn) btnMorn.style.opacity = cat === 'morning' ? '1' : '0.6';
        if (btnEve) btnEve.style.opacity = cat === 'evening' ? '1' : '0.6';
        if (btnAfter) btnAfter.style.opacity = cat === 'afterPrayer' ? '1' : '0.6';

        if (!container) return;

        const items = AthkarData[cat] || [];
        container.innerHTML = '';

        items.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'athkar-card-item';
            card.innerHTML = `
                <div class="athkar-text">${item.text}</div>
                <div class="athkar-benefit">✨ ${item.benefit}</div>
                <div style="display: flex; justify-content: flex-end;">
                    <button class="athkar-counter-btn" id="athkar_btn_${item.id}" onclick="khutwaApp.handleAthkarItemClick('${item.id}', ${item.count})">
                        <span>العدد:</span> <strong id="athkar_num_${item.id}">${item.count}</strong>
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    handleAthkarItemClick(itemId, totalCount) {
        const numEl = document.getElementById(`athkar_num_${itemId}`);
        const btnEl = document.getElementById(`athkar_btn_${itemId}`);
        if (!numEl || !btnEl) return;

        let cur = parseInt(numEl.textContent, 10);
        if (cur > 1) {
            cur--;
            numEl.textContent = cur;
            this.notifications.triggerHaptic(25);
        } else if (cur === 1) {
            numEl.textContent = 'تم ✓';
            btnEl.classList.add('completed');
            this.notifications.triggerHaptic(50);
            this.notifications.playNotificationSound();
        }
    }

    // ==================== رسم تبويب بناء العادات ====================
    renderHabitsTab() {
        const list = document.getElementById('manageHabitsList');
        if (!list) return;

        const habits = this.habitManager.data.dailyHabits || [];
        const todayKey = this.habitManager.getTodayKey();

        list.innerHTML = '';
        habits.forEach(h => {
            const isDone = Boolean(h.logs && h.logs[todayKey]);
            const streak = this.habitManager.calculateStreak(h);

            const item = document.createElement('div');
            item.className = `habit-item ${isDone ? 'done' : ''}`;
            item.innerHTML = `
                <div class="habit-left">
                    <div class="habit-icon-box">${h.icon || '⭐'}</div>
                    <div class="habit-details">
                        <h4 class="habit-title">${h.title}</h4>
                        <p>${h.category} • سلسلة: ${streak} أيام</p>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button class="btn-icon" style="width: 32px; height: 32px; font-size: 0.85rem; color: #f43f5e;" onclick="event.stopPropagation(); khutwaApp.deleteHabit('${h.id}')" title="حذف العادة">✕</button>
                    <div class="check-circle">${isDone ? '✓' : ''}</div>
                </div>
            `;
            item.onclick = () => {
                this.notifications.triggerHaptic(30);
                this.habitManager.toggleDailyHabit(h.id);
                this.renderTodayDashboard();
                this.renderHabitsTab();
            };
            list.appendChild(item);
        });
    }

    submitNewHabit(event) {
        event.preventDefault();
        const title = document.getElementById('inputHabitTitle').value;
        const category = document.getElementById('selectHabitCategory').value;
        const icon = document.getElementById('inputHabitIcon').value || '⭐';

        if (title.trim()) {
            this.habitManager.addDailyHabit(title, category, icon);
            this.closeModal('modalAddHabit');
            document.getElementById('inputHabitTitle').value = '';
            this.renderTodayDashboard();
            this.renderHabitsTab();
            this.showToast('تمت إضافة العادة بنجاح 🌱');
        }
    }

    deleteHabit(id) {
        if (confirm('هل أنت متأكد من حذف هذه العادة نهائياً؟')) {
            this.habitManager.deleteDailyHabit(id);
            this.renderTodayDashboard();
            this.renderHabitsTab();
            this.showToast('تم حذف العادة بنجاح 🗑️');
        }
    }

    // ==================== رسم تبويب حصن النقاء ====================
    renderShieldTab() {
        const item = this.habitManager.data.abstinenceHabits[0];
        if (!item) return;

        const stats = this.habitManager.getAbstinenceStats(item);

        const titleEl = document.getElementById('shieldDisplayTitle');
        if (titleEl) {
            titleEl.innerHTML = `<span>🛡️</span> ${this.isDiscreet ? item.codeName : item.realName}`;
        }

        const dateEl = document.getElementById('shieldStartDateText');
        if (dateEl) {
            dateEl.textContent = `انطلقت المسيرة: ${stats.startDateFormatted}`;
        }

        const pill = document.getElementById('shieldStagePill');
        const badge = document.getElementById('shieldStageBadge');
        const stTitle = document.getElementById('shieldStageTitle');

        if (badge) badge.textContent = stats.stage.badge;
        if (stTitle) stTitle.textContent = stats.stage.title;
        if (pill) pill.style.borderColor = stats.stage.color;

        const stagesList = document.getElementById('stagesProgressList');
        if (stagesList) {
            const milestones = [
                { days: 1, title: 'اليوم الأول: كسر الاندفاع اللحظي', badge: '☀️' },
                { days: 3, title: '3 أيام: تخطي ذروة الرغبة الأولى', badge: '🌿' },
                { days: 7, title: 'أسبوع كامل: استعادة السيطرة الذهنية', badge: '🔥' },
                { days: 14, title: 'أسبوعان: بدء تعافي مستقبلات الدماغ', badge: '⚡' },
                { days: 30, title: 'شهر كامل: بناء العقلية الحرة والواعية', badge: '🛡️' },
                { days: 60, title: 'شهران: ثبات تام وترسيخ الهوية النقية', badge: '💎' },
                { days: 90, title: '90 يوماً: إعادة ضبط الدوبامين بالكامل', badge: '👑' }
            ];

            stagesList.innerHTML = '';
            milestones.forEach(m => {
                const passed = stats.days >= m.days;
                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.alignItems = 'center';
                row.style.justifyContent = 'space-between';
                row.style.padding = '8px 12px';
                row.style.borderRadius = 'var(--radius-md)';
                row.style.background = passed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.02)';
                row.style.border = passed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)';

                row.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span>${m.badge}</span>
                        <span style="font-weight: ${passed ? '700' : 'normal'}; color: ${passed ? 'var(--accent-emerald-light)' : 'var(--text-muted)'}">${m.title}</span>
                    </div>
                    <span style="font-size: 0.75rem; color: ${passed ? 'var(--accent-emerald-light)' : 'var(--text-dim)'};">${passed ? 'تم الاجتياز ✓' : `${m.days} يوم`}</span>
                `;
                stagesList.appendChild(row);
            });
        }
    }

    openUrgeSurfingModal() {
        this.openModal('modalUrgeSurfing');
        this.startBreathingAnimation();
    }

    startBreathingAnimation() {
        const circle = document.getElementById('breathCircle');
        const prompt = document.getElementById('breathPrompt');
        if (!circle || !prompt) return;

        let phase = 0;
        if (this.breathTimer) clearInterval(this.breathTimer);

        const updateBreath = () => {
            if (phase === 0) {
                circle.textContent = 'شهيق 🌿';
                prompt.textContent = 'استنشق الهواء ببطء واملأ رئتيك (4 ثوان)...';
                phase = 1;
            } else if (phase === 1) {
                circle.textContent = 'احبس ⏳';
                prompt.textContent = 'احبس أنفاسك بهدوء وسكينة (4 ثوان)...';
                phase = 2;
            } else {
                circle.textContent = 'زفير 💨';
                prompt.textContent = 'أخرج الهواء ببطء وتخلص من أي توتر (6 ثوان)...';
                phase = 0;
            }
        };

        updateBreath();
        this.breathTimer = setInterval(updateBreath, 4000);
    }

    openRelapseModal() {
        this.openModal('modalRelapse');
    }

    submitRelapse(event) {
        event.preventDefault();
        const trigger = document.getElementById('inputRelapseTrigger').value;
        const note = document.getElementById('inputRelapseNote').value;

        const item = this.habitManager.data.abstinenceHabits[0];
        if (item) {
            this.habitManager.recordRelapse(item.id, note, trigger);
            this.closeModal('modalRelapse');
            document.getElementById('inputRelapseTrigger').value = '';
            document.getElementById('inputRelapseNote').value = '';
            this.renderTodayDashboard();
            this.renderShieldTab();
            this.showToast('بداية جديدة أقوى وأكثر حكمة، لا تيأس أبداً! ❤️‍🩹');
        }
    }

    // ==================== رسم تبويب التحليلات والإحصائيات ====================
    switchAnalyticsPeriod(period, btnEl) {
        this.selectedPeriod = period;
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        if (btnEl) btnEl.classList.add('active');

        this.notifications.triggerHaptic(20);
        this.renderAnalyticsTab();
    }

    renderAnalyticsTab() {
        const summary = this.analytics.getSummaryStats();
        
        const prEl = document.getElementById('statPrayerRate');
        const hrEl = document.getElementById('statHabitsRate');
        const clEl = document.getElementById('statMaxCleanDays');
        const tsEl = document.getElementById('statTotalTasbeeh');

        if (prEl) prEl.textContent = `${summary.prayerRate}%`;
        if (hrEl) hrEl.textContent = `${summary.habitsRate}%`;
        if (clEl) clEl.textContent = summary.maxCleanDays;
        if (tsEl) tsEl.textContent = summary.tasbeehCount;

        // توليد تقرير المرشد الذكي
        const analysis = this.analytics.getSmartCoachAnalysis(this.selectedPeriod);
        this.renderCoachAnalysisUI(analysis);

        // عدد الأيام للمخططات
        let daysCount = 7;
        let label = '7 أيام';
        if (this.selectedPeriod === 'day') { daysCount = 1; label = 'اليوم'; }
        else if (this.selectedPeriod === 'month') { daysCount = 30; label = '30 يوماً'; }
        else if (this.selectedPeriod === 'year') { daysCount = 365; label = 'عام كامل'; }

        const pLabel = document.getElementById('chartPrayersPeriodLabel');
        const hLabel = document.getElementById('chartHabitsPeriodLabel');
        if (pLabel) pLabel.textContent = label;
        if (hLabel) hLabel.textContent = label;

        setTimeout(() => {
            const prayersData = this.analytics.getPrayerReport(daysCount);
            this.analytics.renderBarChart('chartWeeklyPrayers', prayersData, '#10b981', 'rate');

            const habitsData = this.analytics.getHabitsReport(daysCount);
            this.analytics.renderBarChart('chartWeeklyHabits', habitsData, '#3b82f6', 'rate');

            const waterData = this.analytics.getWaterReport(daysCount);
            this.analytics.renderBarChart('chartWeeklyWater', waterData, '#06b6d4', 'rate');
        }, 100);
    }

    renderCoachAnalysisUI(analysis) {
        const badge = document.getElementById('coachPeriodBadge');
        if (badge) badge.textContent = analysis.title;

        // نقاط القوة
        const strengthsList = document.getElementById('coachStrengthsList');
        if (strengthsList) {
            strengthsList.innerHTML = '';
            if (analysis.strengths && analysis.strengths.length > 0) {
                analysis.strengths.forEach(s => {
                    const li = document.createElement('li');
                    li.className = 'insight-item strength';
                    li.innerHTML = `<span>✓</span> <span>${s}</span>`;
                    strengthsList.appendChild(li);
                });
            } else {
                strengthsList.innerHTML = `<li class="insight-item neutral"><span>•</span> <span>لا توجد بيانات كافية بعد. ابدأ بتسجيل صلواتك وعاداتك لتظهر نقاط تفوقك!</span></li>`;
            }
        }

        // نقاط التقصير
        const weaknessesList = document.getElementById('coachWeaknessesList');
        if (weaknessesList) {
            weaknessesList.innerHTML = '';
            if (analysis.weaknesses && analysis.weaknesses.length > 0) {
                analysis.weaknesses.forEach(w => {
                    const li = document.createElement('li');
                    li.className = 'insight-item warning';
                    li.innerHTML = `<span>⚠</span> <span>${w}</span>`;
                    weaknessesList.appendChild(li);
                });
            } else {
                weaknessesList.innerHTML = `<li class="insight-item strength"><span>🎉</span> <span>ما شاء الله! لا يوجد تقصير ملحوظ في هذه الفترة، استمر على هذا المستوى الرائع.</span></li>`;
            }
        }

        // سجل التغييرات على العادات
        const auditList = document.getElementById('coachAuditHistoryList');
        if (auditList) {
            auditList.innerHTML = '';
            const logs = analysis.auditLog || [];
            if (logs.length > 0) {
                logs.slice(0, 5).forEach(log => {
                    const d = new Date(log.timestamp);
                    const timeStr = d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
                    const li = document.createElement('li');
                    li.className = 'insight-item neutral';
                    li.innerHTML = `<span>🗓️ ${timeStr}:</span> <span>${log.description}</span>`;
                    auditList.appendChild(li);
                });
            } else {
                auditList.innerHTML = `<li class="insight-item neutral"><span>•</span> <span>سجل العادات ثابت ومستقر ولم تطرأ تعديلات أو حذف مؤخراً.</span></li>`;
            }
        }
    }

    // ==================== الإشعارات ====================
    async requestNotificationPermission() {
        const granted = await this.notifications.requestPermission();
        if (granted) {
            this.showToast('تم تفعيل نظام التنبيهات 🔔');
        }
    }

    saveReminderTimes() {
        const morn = document.getElementById('inputMorningTime')?.value || '06:30';
        const eve = document.getElementById('inputEveningTime')?.value || '17:00';
        const rev = document.getElementById('inputReviewTime')?.value || '21:30';

        this.settings.morningAthkarTime = morn;
        this.settings.eveningAthkarTime = eve;
        this.settings.dailyReviewTime = rev;
        this.saveSettings();
        this.showToast('تم حفظ مواعيد التنبيهات ⏰');
    }

    toggleAdhanPreview() {
        if (this.notifications.isAdhanPlaying) {
            this.notifications.stopAdhan();
        } else {
            this.notifications.playFullAdhan();
            this.showToast('صوت الأذان يصدح الآن 🕌');
        }
    }

    testChimeAudio() {
        this.notifications.playChimeSound();
        this.showToast('رنة الأذكار والتنبيهات 🔔');
    }

    testNotification() {
        this.notifications.sendNotification('اختبار إشعار من خُطوة 🚀', {
            body: 'نظام التنبيهات والأصوات يعمل بنجاح!',
            type: 'chime'
        });
        this.showToast('تم إرسال إشعار تجريبي 🔔');
    }

    // ==================== النسخ الاحتياطي ====================
    exportData() {
        this.habitManager.exportBackup();
        this.showToast('تم تصدير ملف النسخة الاحتياطية 💾');
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const success = this.habitManager.importBackup(content);
            if (success) {
                this.renderTodayDashboard();
                this.renderSpiritualTab();
                this.renderHabitsTab();
                this.renderShieldTab();
                this.renderAnalyticsTab();
                this.showToast('تمت استعادة بياناتك بنجاح 📂');
            } else {
                alert('ملف النسخة الاحتياطية غير صالح.');
            }
        };
        reader.readAsText(file);
    }

    // ==================== التنقل بين التبويبات ====================
    switchTab(tabId, navBtn) {
        this.notifications.triggerHaptic(20);

        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.remove('active');
        });

        const targetTab = document.getElementById(tabId);
        if (targetTab) targetTab.classList.add('active');
        if (navBtn) navBtn.classList.add('active');

        if (tabId === 'tabToday') this.renderTodayDashboard();
        else if (tabId === 'tabSpiritual') this.renderSpiritualTab();
        else if (tabId === 'tabHabits') this.renderHabitsTab();
        else if (tabId === 'tabShield') this.renderShieldTab();
        else if (tabId === 'tabAnalytics') this.renderAnalyticsTab();

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
        if (modalId === 'modalUrgeSurfing' && this.breathTimer) {
            clearInterval(this.breathTimer);
        }
    }

    showToast(message, icon = '✨') {
        const toast = document.getElementById('toastMessage');
        const txt = document.getElementById('toastText');
        const ic = document.getElementById('toastIcon');

        if (!toast) return;
        if (txt) txt.textContent = message;
        if (ic) ic.textContent = icon;

        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2600);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.khutwaApp = new KhutwaApp();
});
