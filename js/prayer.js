/**
 * محرك حساب مواقيت الصلاة الفلكي المستقل - يعمل بدون إنترنت 100%
 * مبني على المعادلات الفلكية المعتمدة عالمياً
 */

class OfflinePrayerCalculator {
    constructor() {
        // الطرق المعتمدة عالمياً
        this.methods = {
            Egypt: {
                name: 'الهيئة المصرية العامة للمساحة',
                fajrAngle: 19.5,
                ishaAngle: 17.5,
                maghribRule: 'sunset', // angle or minutes
                maghribVal: 0
            },
            Makkah: {
                name: 'أم القرى - مكة المكرمة',
                fajrAngle: 18.5,
                ishaRule: 'minutes',
                ishaVal: 90, // 90 دقيقة بعد المغرب
                maghribRule: 'sunset'
            },
            MWL: {
                name: 'رابطة العالم الإسلامي',
                fajrAngle: 18.0,
                ishaAngle: 17.0,
                maghribRule: 'sunset'
            },
            ISNA: {
                name: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)',
                fajrAngle: 15.0,
                ishaAngle: 15.0,
                maghribRule: 'sunset'
            },
            Gulf: {
                name: 'منطقة الخليج العربي',
                fajrAngle: 19.5,
                ishaRule: 'minutes',
                ishaVal: 90,
                maghribRule: 'sunset'
            }
        };

        // المدن الافتراضية الشائعة
        this.popularCities = [
            { name: 'القاهرة، مصر', lat: 30.0444, lng: 31.2357, timezone: 3, method: 'Egypt' },
            { name: 'الإسكندرية، مصر', lat: 31.2001, lng: 29.9187, timezone: 3, method: 'Egypt' },
            { name: 'المنصورة، مصر', lat: 31.0409, lng: 31.3785, timezone: 3, method: 'Egypt' },
            { name: 'مكة المكرمة، السعودية', lat: 21.3891, lng: 39.8579, timezone: 3, method: 'Makkah' },
            { name: 'المدينة المنورة، السعودية', lat: 24.5247, lng: 39.5692, timezone: 3, method: 'Makkah' },
            { name: 'الرياض، السعودية', lat: 24.7136, lng: 46.6753, timezone: 3, method: 'Makkah' },
            { name: 'جدة، السعودية', lat: 21.4858, lng: 39.1925, timezone: 3, method: 'Makkah' },
            { name: 'دبي، الإمارات', lat: 25.2048, lng: 55.2708, timezone: 4, method: 'Gulf' },
            { name: 'أبو ظبي، الإمارات', lat: 24.4539, lng: 54.3773, timezone: 4, method: 'Gulf' },
            { name: 'الكويت، الكويت', lat: 29.3759, lng: 47.9774, timezone: 3, method: 'Makkah' },
            { name: 'الدوحة، قطر', lat: 25.2854, lng: 51.5310, timezone: 3, method: 'Makkah' },
            { name: 'عمان، الأردن', lat: 31.9454, lng: 35.9284, timezone: 3, method: 'MWL' },
            { name: 'بيروت، لبنان', lat: 33.8938, lng: 35.5018, timezone: 3, method: 'MWL' },
            { name: 'دمشق، سوريا', lat: 33.5138, lng: 36.2765, timezone: 3, method: 'MWL' },
            { name: 'بغداد، العراق', lat: 33.3152, lng: 44.3661, timezone: 3, method: 'MWL' },
            { name: 'القدس الشريف، فلسطين', lat: 31.7683, lng: 35.2137, timezone: 3, method: 'MWL' },
            { name: 'طرابلس، ليبيا', lat: 32.8872, lng: 13.1913, timezone: 2, method: 'MWL' },
            { name: 'تونس، تونس', lat: 36.8065, lng: 10.1815, timezone: 1, method: 'MWL' },
            { name: 'الجزائر، الجزائر', lat: 36.7538, lng: 3.0588, timezone: 1, method: 'MWL' },
            { name: 'الرباط، المغرب', lat: 34.0209, lng: -6.8416, timezone: 1, method: 'MWL' },
            { name: 'الخرطوم، السودان', lat: 15.5007, lng: 32.5599, timezone: 2, method: 'Egypt' }
        ];

        // المذهب لحساب العصر (1 = الشافعي/المالكي/الحنبلي/الجمهور، 2 = الحنفي)
        this.asrJuristic = 1; 
    }

    // دوال تحويل الزوايا
    dtr(d) { return (d * Math.PI) / 180.0; }
    rtd(r) { return (r * 180.0) / Math.PI; }
    sin(d) { return Math.sin(this.dtr(d)); }
    cos(d) { return Math.cos(this.dtr(d)); }
    tan(d) { return Math.tan(this.dtr(d)); }
    asin(x) { return this.rtd(Math.asin(x)); }
    acos(x) { return this.rtd(Math.acos(x)); }
    atan(x) { return this.rtd(Math.atan(x)); }
    atan2(y, x) { return this.rtd(Math.atan2(y, x)); }

    // تقويم المدى إلى 0-360 أو 0-24
    fixAngle(a) {
        a = a - 360.0 * Math.floor(a / 360.0);
        return a < 0 ? a + 360.0 : a;
    }

    fixHour(h) {
        h = h - 24.0 * Math.floor(h / 24.0);
        return h < 0 ? h + 24.0 : h;
    }

    // حساب اليوم اليولياني (Julian Day)
    getJulianDay(year, month, day) {
        if (month <= 2) {
            year -= 1;
            month += 12;
        }
        let A = Math.floor(year / 100);
        let B = 2 - A + Math.floor(A / 4);
        return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
    }

    // موقع ومسار الشمس الفلكي لليوم
    getSunPosition(jd) {
        let D = jd - 2451545.0;
        let g = this.fixAngle(357.529 + 0.98560028 * D);
        let q = this.fixAngle(280.459 + 0.98564736 * D);
        let L = this.fixAngle(q + 1.915 * this.sin(g) + 0.020 * this.sin(2 * g));
        let e = 23.439 - 0.00000036 * D;

        let d = this.asin(this.sin(e) * this.sin(L));
        let RA = this.atan2(this.cos(e) * this.sin(L), this.cos(L)) / 15.0;
        RA = this.fixHour(RA);

        let EqT = q / 15.0 - RA;
        return { declination: d, equationOfTime: EqT };
    }

    // حساب وقت زاوية محددة للشمس
    computeHourAngle(angle, lat, declination) {
        let cost = (this.sin(angle) - this.sin(lat) * this.sin(declination)) /
                   (this.cos(lat) * this.cos(declination));
        if (cost > 1) return 0; // الشمس لا تصل للزاوية (قطبية)
        if (cost < -1) return 180;
        return this.acos(cost) / 15.0;
    }

    // حساب وقت العصر بناءً على نسبة طول الظل
    computeAsrAngle(factor, lat, declination) {
        let d = this.atan(1.0 / (factor + this.tan(Math.abs(lat - declination))));
        return this.computeHourAngle(d, lat, declination);
    }

    /**
     * حساب جميع أوقات الصلاة ليوم محدد
     * @param {Date} date 
     * @param {number} lat 
     * @param {number} lng 
     * @param {number} timezone 
     * @param {string} methodName 
     * @returns {Object} أوقات الصلوات بصيغة الساعات والدقائق
     */
    getTimes(date, lat, lng, timezone = null, methodName = 'Egypt') {
        if (timezone === null) {
            // استنتاج المنطقة الزمنية من المتصفح تلقائياً إذا لم تحدد
            timezone = -date.getTimezoneOffset() / 60;
        }

        let method = this.methods[methodName] || this.methods.Egypt;
        let jd = this.getJulianDay(date.getFullYear(), date.getMonth() + 1, date.getDate());
        let sun = this.getSunPosition(jd);

        // زوال الشمس (الظهر)
        let noon = this.fixHour(12 + timezone - lng / 15.0 - sun.equationOfTime);

        // الشروق والغروب (الزاوية 0.833 لحجم قرص الشمس والانكسار الجوي)
        let sunAngle = -0.833;
        let sunriseHours = this.computeHourAngle(sunAngle, lat, sun.declination);

        let sunrise = noon - sunriseHours;
        let sunset = noon + sunriseHours;

        // الفجر
        let fajrHours = this.computeHourAngle(-method.fajrAngle, lat, sun.declination);
        let fajr = noon - fajrHours;

        // العصر
        let asrHours = this.computeAsrAngle(this.asrJuristic, lat, sun.declination);
        let asr = noon + asrHours;

        // المغرب
        let maghrib = sunset;
        if (method.maghribRule === 'angle') {
            let maghribHours = this.computeHourAngle(-method.maghribVal, lat, sun.declination);
            maghrib = noon + maghribHours;
        } else if (method.maghribRule === 'minutes') {
            maghrib = sunset + (method.maghribVal / 60.0);
        }

        // العشاء
        let isha = 0;
        if (method.ishaRule === 'minutes') {
            isha = maghrib + (method.ishaVal / 60.0);
        } else {
            let ishaHours = this.computeHourAngle(-method.ishaAngle, lat, sun.declination);
            isha = noon + ishaHours;
        }

        // قيام الليل والثلث الأخير
        // منتصف الليل = ما بين المغرب والفجر
        let nightDuration = (fajr + 24 - maghrib) % 24;
        let midnight = (maghrib + nightDuration / 2) % 24;
        let lastThird = (maghrib + (nightDuration * 2 / 3)) % 24;

        return {
            fajr: this.formatTime(fajr),
            sunrise: this.formatTime(sunrise),
            dhuhr: this.formatTime(noon),
            asr: this.formatTime(asr),
            maghrib: this.formatTime(maghrib),
            isha: this.formatTime(isha),
            midnight: this.formatTime(midnight),
            lastThird: this.formatTime(lastThird),
            rawTimes: {
                fajr, sunrise, dhuhr: noon, asr, maghrib, isha, midnight, lastThird
            }
        };
    }

    // تحويل الوقت من كسر عشري لساعات ودقائق
    formatTime(hoursFraction) {
        if (isNaN(hoursFraction)) return '--:--';
        hoursFraction = this.fixHour(hoursFraction + 0.5 / 60); // تقريب للدقيقة
        let hours = Math.floor(hoursFraction);
        let minutes = Math.floor((hoursFraction - hours) * 60);

        let h12 = hours % 12 || 12;
        let period = hours >= 12 ? 'م' : 'ص';
        let hPad = String(hours).padStart(2, '0');
        let mPad = String(minutes).padStart(2, '0');

        return {
            time24: `${hPad}:${mPad}`,
            time12: `${h12}:${mPad} ${period}`,
            hours: hours,
            minutes: minutes
        };
    }

    // تحويل التاريخ لميلادي وهجري فلكي محلي
    getHijriDate(date = new Date()) {
        try {
            // استخدام محرك التنسيق العربي للمتصفح (يعمل أوفلاين كلياً)
            const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                weekday: 'long'
            });
            return formatter.format(date);
        } catch (e) {
            return 'التاريخ الهجري غير متاح';
        }
    }
}

// تصدير الكائن للاستخدام
window.OfflinePrayerCalculator = OfflinePrayerCalculator;
