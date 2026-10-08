/**
 * مدير الإشعارات والتنبيهات الصوتية والمحلية - مع الأذان الكامل ورنات التنبيه
 * 100% محلي وبدون إنترنت
 */

class NotificationManager {
    constructor() {
        this.permission = 'default';
        this.audioCtx = null;
        this.timerInterval = null;
        this.notifiedEvents = new Set();
        this.waterReminderEnabled = true;

        // ملفات الصوت الحقيقية
        this.adhanAudio = null;
        this.chimeAudio = null;
        this.waterAudio = null;
        this.isAdhanPlaying = false;

        this.init();
    }

    init() {
        if (typeof window !== 'undefined') {
            if ('Notification' in window) {
                this.permission = Notification.permission;
            }
            this.initAudioElements();
        }
        this.startScheduleChecker();
    }

    initAudioElements() {
        try {
            this.adhanAudio = new Audio('audio/adhan.mp3');
            this.adhanAudio.preload = 'auto';

            this.chimeAudio = new Audio('audio/notification.wav');
            this.chimeAudio.preload = 'auto';

            this.waterAudio = new Audio('audio/water.wav');
            this.waterAudio.preload = 'auto';

            this.adhanAudio.onended = () => {
                this.isAdhanPlaying = false;
                this.hideAdhanFloatingButton();
            };
        } catch (e) {
            console.log('Audio elements not initialized:', e);
        }
    }

    async requestPermission() {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            alert('متصفحك لا يدعم نظام الإشعارات. يرجى استخدام متصفح حديث مثل Chrome أو Edge أو Safari.');
            return false;
        }
        try {
            const res = await Notification.requestPermission();
            this.permission = res;
            if (res === 'granted') {
                this.sendNotification('تم تفعيل التنبيهات والأذان بنجاح 🔔', {
                    body: 'سنقوم بتنبيهك بمواقيت الصلاة بالأذان، والأذكار بالرنة، وشرب الماء وعاداتك اليومية.',
                    tag: 'welcome_notice',
                    type: 'chime'
                });
                return true;
            }
        } catch (e) {
            console.error('خطأ في طلب إذن الإشعارات:', e);
        }
        return false;
    }

    sendNotification(title, options = {}) {
        const soundType = options.type || 'chime'; // 'adhan' or 'chime' or 'water'
        const defaultOptions = {
            icon: 'icons/icon-192.png',
            badge: 'icons/icon-192.png',
            vibrate: [200, 100, 200],
            dir: 'rtl',
            lang: 'ar'
        };
        const finalOptions = Object.assign(defaultOptions, options);

        // تشغيل الصوت المناسب
        if (soundType === 'adhan') {
            this.playFullAdhan();
        } else if (soundType === 'water') {
            this.playWaterSound();
        } else {
            this.playChimeSound();
        }

        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try { navigator.vibrate([150, 80, 150]); } catch (e) {}
        }

        if (typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(reg => {
                reg.showNotification(title, finalOptions);
            }).catch(() => {
                if (this.permission === 'granted' && typeof Notification !== 'undefined') {
                    new Notification(title, finalOptions);
                }
            });
        } else if (this.permission === 'granted' && typeof Notification !== 'undefined') {
            new Notification(title, finalOptions);
        }
    }

    // تشغيل الأذان الحقيقي الكامل
    playFullAdhan() {
        try {
            if (this.adhanAudio) {
                this.adhanAudio.currentTime = 0;
                const promise = this.adhanAudio.play();
                if (promise !== undefined) {
                    promise.then(() => {
                        this.isAdhanPlaying = true;
                        this.showAdhanFloatingButton();
                    }).catch(err => {
                        console.log('Autoplay restriction, falling back to chime:', err);
                        this.playNotificationSound();
                    });
                }
            } else {
                this.playNotificationSound();
            }
        } catch (e) {
            this.playNotificationSound();
        }
    }

    // إيقاف الأذان
    stopAdhan() {
        try {
            if (this.adhanAudio) {
                this.adhanAudio.pause();
                this.adhanAudio.currentTime = 0;
            }
            this.isAdhanPlaying = false;
            this.hideAdhanFloatingButton();
            if (window.khutwaApp) window.khutwaApp.showToast('تم إيقاف صوت الأذان ⏹️');
        } catch (e) {}
    }

    showAdhanFloatingButton() {
        let el = document.getElementById('adhanStopFloatingBtn');
        if (!el) {
            el = document.createElement('div');
            el.id = 'adhanStopFloatingBtn';
            el.style.cssText = `
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #059669 0%, #10b981 100%);
                color: #fff;
                padding: 10px 20px;
                border-radius: 9999px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                font-weight: 800;
                font-size: 0.9rem;
                cursor: pointer;
                z-index: 999;
                display: flex;
                align-items: center;
                gap: 8px;
                animation: pulse 1.5s infinite;
            `;
            el.innerHTML = `<span>🕌 الأذان يصدح الآن...</span> <span style="background: rgba(0,0,0,0.25); padding: 2px 8px; border-radius: 6px;">إيقاف ⏹️</span>`;
            el.onclick = () => this.stopAdhan();
            document.body.appendChild(el);
        } else {
            el.style.display = 'flex';
        }
    }

    hideAdhanFloatingButton() {
        const el = document.getElementById('adhanStopFloatingBtn');
        if (el) el.style.display = 'none';
    }

    // تشغيل رنة الأذكار والتنبيهات
    playChimeSound() {
        try {
            if (this.chimeAudio) {
                this.chimeAudio.currentTime = 0;
                this.chimeAudio.play().catch(() => this.playNotificationSound());
            } else {
                this.playNotificationSound();
            }
        } catch (e) {
            this.playNotificationSound();
        }
    }

    playWaterSound() {
        try {
            if (this.waterAudio) {
                this.waterAudio.currentTime = 0;
                this.waterAudio.play().catch(() => {});
            }
        } catch (e) {}
    }

    // توليد نغمة بالـ Web Audio API كبديل احتياطي فوري
    playNotificationSound() {
        try {
            if (typeof window === 'undefined') return;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            if (!this.audioCtx) this.audioCtx = new AudioContext();

            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            const ctx = this.audioCtx;
            const now = ctx.currentTime;

            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(587.33, now); // D5
            osc1.frequency.exponentialRampToValueAtTime(880, now + 0.3); // A5

            gain1.gain.setValueAtTime(0, now);
            gain1.gain.linearRampToValueAtTime(0.3, now + 0.05);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

            osc1.connect(gain1);
            gain1.connect(ctx.destination);

            osc1.start(now);
            osc1.stop(now + 0.8);
        } catch (e) {}
    }

    triggerHaptic(duration = 40) {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try { navigator.vibrate(duration); } catch (e) {}
        }
    }

    startScheduleChecker() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.checkScheduledReminders();
        }, 30000);
    }

    checkScheduledReminders() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const todayKey = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
        const timeKey = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

        const settings = (window.khutwaApp && window.khutwaApp.settings) ? window.khutwaApp.settings : {};
        const morningTime = settings.morningAthkarTime || '07:00';
        const eveningTime = settings.eveningAthkarTime || '17:00';
        const reviewTime = settings.dailyReviewTime || '21:30';

        // 1. تذكير أذكار الصباح بالرنة المخصصة
        const morningKey = `${todayKey}_morning_${timeKey}`;
        if (timeKey === morningTime && !this.notifiedEvents.has(morningKey)) {
            this.notifiedEvents.add(morningKey);
            this.sendNotification('☀️ حان موعد أذكار الصباح', {
                body: 'أصبحنا وأصبح الملك لله.. ابدأ يومك بنور الذكر والبركة.',
                tag: 'athkar_morning',
                type: 'chime'
            });
        }

        // 2. تذكير أذكار المساء بالرنة المخصصة
        const eveningKey = `${todayKey}_evening_${timeKey}`;
        if (timeKey === eveningTime && !this.notifiedEvents.has(eveningKey)) {
            this.notifiedEvents.add(eveningKey);
            this.sendNotification('🌆 حان موعد أذكار المساء', {
                body: 'أمسينا وأمسى الملك لله.. حصّن نفسك بأذكار المساء.',
                tag: 'athkar_evening',
                type: 'chime'
            });
        }

        // 3. تذكير مراجعة العادات المسائي
        const habitKey = `${todayKey}_habits_${timeKey}`;
        if (timeKey === reviewTime && !this.notifiedEvents.has(habitKey)) {
            this.notifiedEvents.add(habitKey);
            this.sendNotification('🎯 حصاد اليوم والتطوير الذاتي', {
                body: 'دقائق معدودة لمراجعة صلواتك، شرب الماء، وإنجاز عملك اليومي.',
                tag: 'daily_habits_review',
                type: 'chime'
            });
        }

        // 4. تذكير شرب الماء الدوري
        if (this.waterReminderEnabled && (hours >= 9 && hours <= 21) && minutes === 0) {
            const waterKey = `${todayKey}_water_${hours}`;
            if (!this.notifiedEvents.has(waterKey)) {
                this.notifiedEvents.add(waterKey);
                this.sendNotification('💧 تذكير شرب الماء', {
                    body: 'حان موعد كوب ماء منعش! حافظ على ترطيب جسمك وصفاء ذهنك.',
                    tag: 'water_reminder',
                    type: 'water'
                });
            }
        }

        // 5. فحص مواقيت الصلاة وتشغيل الأذان الحقيقي
        if (typeof window !== 'undefined' && window.khutwaApp && window.khutwaApp.currentPrayerTimes) {
            const pt = window.khutwaApp.currentPrayerTimes;
            const prayers = [
                { name: 'صلاة الفجر', time: pt.fajr.time24 },
                { name: 'صلاة الظهر', time: pt.dhuhr.time24 },
                { name: 'صلاة العصر', time: pt.asr.time24 },
                { name: 'صلاة المغرب', time: pt.maghrib.time24 },
                { name: 'صلاة العشاء', time: pt.isha.time24 }
            ];

            prayers.forEach(p => {
                if (p.time === timeKey) {
                    const prayerKey = `${todayKey}_prayer_${p.name}`;
                    if (!this.notifiedEvents.has(prayerKey)) {
                        this.notifiedEvents.add(prayerKey);
                        this.sendNotification(`🕌 حان الآن موعد ${p.name}`, {
                            body: `الله أكبر الله أكبر.. حي على الصلاة حي على الفلاح (${p.time})`,
                            tag: `prayer_${p.name}`,
                            type: 'adhan'
                        });
                    }
                }
            });
        }
    }
}

if (typeof window !== 'undefined') window.NotificationManager = NotificationManager;
if (typeof module !== 'undefined') module.exports = NotificationManager;
