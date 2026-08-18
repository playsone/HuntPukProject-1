import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ViewDidEnter } from '@ionic/angular';
import { Auth } from '../../services/auth';
import Swal from 'sweetalert2';
import { addIcons } from 'ionicons';
import { arrowBack, key, person, eye, eyeOff, logInOutline, checkmark, lockClosedOutline, timeOutline } from 'ionicons/icons';

// ==========================================
// 🛡️ Security Constants — Brute-force Protection
// ==========================================
const MAX_ATTEMPTS = 5;               // สูงสุด 5 ครั้ง
const LOCKOUT_MS   = 15 * 60 * 1000; // lockout 15 นาที
const WINDOW_MS    = 15 * 60 * 1000; // นับใน window 15 นาที
const STORAGE_KEY  = 'hp_login_attempts';


// Key สำหรับเช็คว่า session อยู่ใน storage ไหน
export const SESSION_STORAGE_KEY = 'loggedIn';
export const SESSION_TYPE_KEY    = 'hp_session_type'; // 'local' | 'session'

interface AttemptRecord { count: number; firstAt: number; lockedUntil?: number; }

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
})
export class LoginPage implements OnInit, OnDestroy, ViewDidEnter {
  email: string = '';
  password: string = '';
  showPassword: boolean = false;
  isLoading: boolean = false;
  rememberMe: boolean = false;

  // 🛡️ Brute-force UI state
  isLocked       = false;
  lockCountdown  = '';
  attemptsLeft   = MAX_ATTEMPTS;
  private countdownTimer?: any;

  hasError: boolean = false;
  emailErrorMsg: string = '';
  passwordErrorMsg: string = '';

  @ViewChild('emailInput', { static: false }) emailInput!: ElementRef;

  constructor(
    private router: Router,
    private authService: Auth
  ) {
    addIcons({ arrowBack, person, key, eye, eyeOff, logInOutline, checkmark, lockClosedOutline, timeOutline });
  }

  ngOnInit() {
    const remembered = localStorage.getItem('rememberLogin');
    if (remembered) {
      try {
        const data = JSON.parse(remembered);
        this.email      = data.email    || '';
        this.password   = data.password || '';
        this.rememberMe = true;
      } catch {}
    }
    this.checkLockoutStatus();
  }

  ngOnDestroy() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }

  ionViewDidEnter() {
    this.checkLockoutStatus();
    setTimeout(() => this.emailInput?.nativeElement?.focus(), 150);
  }

  // ==========================================
  // 🛡️ Brute-force helpers
  // ==========================================
  private getRecord(): AttemptRecord {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return { count: 0, firstAt: Date.now() }; }
  }

  private saveRecord(r: AttemptRecord) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
  }

  checkLockoutStatus() {
    const rec = this.getRecord();
    const now = Date.now();

    if (rec.lockedUntil && now < rec.lockedUntil) {
      this.isLocked = true;
      this.startCountdown(rec.lockedUntil - now);
      return;
    }
    if (rec.lockedUntil && now >= rec.lockedUntil) {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.isLocked     = false;
    this.attemptsLeft = MAX_ATTEMPTS - (rec.count || 0);
    if (this.attemptsLeft < 0) this.attemptsLeft = 0;
  }

  private recordFailedAttempt() {
    const rec = this.getRecord();
    const now = Date.now();

    if (now - (rec.firstAt || now) > WINDOW_MS) {
      rec.count   = 1;
      rec.firstAt = now;
      delete rec.lockedUntil;
    } else {
      rec.count = (rec.count || 0) + 1;
    }

    if (rec.count >= MAX_ATTEMPTS) {
      rec.lockedUntil = now + LOCKOUT_MS;
      this.isLocked   = true;
      this.startCountdown(LOCKOUT_MS);
    }

    this.attemptsLeft = Math.max(0, MAX_ATTEMPTS - rec.count);
    this.saveRecord(rec);
  }

  private startCountdown(msLeft: number) {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    const end = Date.now() + msLeft;

    const tick = () => {
      const remaining = end - Date.now();
      if (remaining <= 0) {
        clearInterval(this.countdownTimer);
        this.isLocked      = false;
        this.lockCountdown = '';
        this.attemptsLeft  = MAX_ATTEMPTS;
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      // แสดงแบบ "อีก X นาที Y วินาที" ไม่ใช่ "HH:mm" เพื่อไม่ให้สับสนกับเวลานาฬิกา
      if (m > 0) {
        this.lockCountdown = `อีก ${m} นาที ${s} วินาที`;
      } else {
        this.lockCountdown = `อีก ${s} วินาที`;
      }
    };
    tick();
    this.countdownTimer = setInterval(tick, 1000);
  }


  togglePasswordVisibility() { this.showPassword = !this.showPassword; }
  goHome() { this.router.navigate(['/home']); }

  async login() {
    this.emailErrorMsg = '';
    this.passwordErrorMsg = '';
    this.hasError = false;

    if (this.isLocked) {
      Swal.fire({
        icon: 'error',
        title: 'บัญชีถูกล็อกชั่วคราว',
        text: `กรุณารอ ${this.lockCountdown} แล้วลองใหม่ เนื่องจากพยายามเข้าสู่ระบบผิดพลาดหลายครั้ง`,
        confirmButtonColor: '#1a1a1a',
        confirmButtonText: 'ตกลง',
        background: '#ffffff',
        heightAuto: false,
        customClass: { popup: 'custom-swal-popup' }
      });
      return;
    }
    if (this.isLoading) return;

    if (!this.email?.trim() || !this.password) {
      Swal.fire({
        icon: 'warning',
        title: 'กรอกข้อมูลไม่ครบ',
        text: 'กรุณาระบุอีเมลและรหัสผ่านให้ครบถ้วน',
        confirmButtonColor: '#1a1a1a',
        confirmButtonText: 'ตกลง',
        background: '#ffffff',
        heightAuto: false,
        customClass: { popup: 'custom-swal-popup' }
      }).then(() => {
        if (!this.email?.trim()) {
          setTimeout(() => this.emailInput?.nativeElement?.focus(), 100);
        }
      });
      return;
    }

    this.isLoading = true;

    try {
      const normalizedEmail = this.email.trim().toLowerCase();
      const res = (await this.authService.login(normalizedEmail, this.password, this.rememberMe)) as any;

      if (res && res.logged_in) {
        const roleId = res.user.role_id;
        const status = res.user.accout_status;

        if ((roleId === 1 || roleId === 2 || roleId === 3) && status === 0) {
          // ✅ สำเร็จ — reset attempt counter
          localStorage.removeItem(STORAGE_KEY);
          this.attemptsLeft = MAX_ATTEMPTS;

          const userData = {
            loggedIn: true,
            id:             res.user.id,
            email:          normalizedEmail,
            username:       res.user.username,
            role_id:        res.user.role_id,
            accout_status:  res.user.accout_status,
            phone:          res.user.phone,
            token:          res.token,
            showWelcome:    true,
            loginAt:        Date.now()
          };

          // ✅ บันทึก loggedIn ลง localStorage เสมอเพื่อให้ทั้งแอปมองเห็น
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(userData));

          if (this.rememberMe) {
            localStorage.setItem(SESSION_TYPE_KEY, 'local');
            localStorage.setItem('rememberLogin', JSON.stringify({ email: normalizedEmail, password: this.password }));
          } else {
            localStorage.setItem(SESSION_TYPE_KEY, 'session');
            localStorage.removeItem('rememberLogin');
            // ✅ AppComponent จะรับ event นี้ไปเริ่ม inactivity timer อัตโนมัติ
          }

          window.dispatchEvent(new CustomEvent('user-logged-in'));

          if (roleId === 3) this.router.navigate(['/dashboard']);
          else              this.router.navigate(['/home']);

        } else {
          this.hasError = true;
          this.recordFailedAttempt();
          Swal.fire({
            icon: 'error',
            title: 'เข้าสู่ระบบไม่สำเร็จ',
            text: res.message || 'บัญชีของคุณถูกระงับหรือไม่มีสิทธิ์เข้าใช้งาน',
            confirmButtonColor: '#1a1a1a',
            confirmButtonText: 'ตกลง',
            heightAuto: false,
            customClass: { popup: 'custom-swal-popup' }
          });
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }

      } else {
        this.passwordErrorMsg = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
        this.hasError = true;
        this.recordFailedAttempt();
        if (this.isLocked) {
          Swal.fire({
            icon: 'error',
            title: 'บัญชีถูกล็อก',
            text: `พยายามเข้าสู่ระบบผิดพลาด ${MAX_ATTEMPTS} ครั้ง กรุณารอ 15 นาที`,
            confirmButtonColor: '#1a1a1a',
            confirmButtonText: 'ตกลง',
            heightAuto: false,
            customClass: { popup: 'custom-swal-popup' }
          });
        }
      }

    } catch (error: any) {
      // 1. จัดการ Network Error หรือเซิร์ฟเวอร์ดับ (Status 0)
      if (error.status === 0) {
        Swal.fire({
          icon: 'error',
          title: 'ขาดการเชื่อมต่อ',
          text: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ตของคุณ',
          confirmButtonColor: '#1a1a1a',
          confirmButtonText: 'ตกลง',
          heightAuto: false,
          customClass: { popup: 'custom-swal-popup' }
        });
        this.isLoading = false;
        return;
      }

      // 2. ดึงข้อความแจ้งเตือนจากระบบ
      let serverMessage = error.error?.message || error.error || error.message || '';
      if (typeof serverMessage !== 'string') {
        if (serverMessage?.isTrusted) {
          serverMessage = 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
        } else {
          try {
            serverMessage = JSON.stringify(serverMessage);
          } catch (e) {
            serverMessage = String(serverMessage);
          }
        }
      }
      
      let displayMsg = 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์';
      if (serverMessage.includes('ไม่มีข้อมูล') || error.status === 404) {
        this.emailErrorMsg = 'ไม่พบอีเมลนี้ในระบบ กรุณาตรวจสอบอีกครั้ง';
      } else if (serverMessage.includes('รหัสผ่าน') || error.status === 401) {
        this.passwordErrorMsg = 'รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง';
      } else if (error.status === 500) {
        displayMsg = 'ระบบเซิร์ฟเวอร์ขัดข้องชั่วคราว กรุณาลองใหม่ภายหลัง';
      } else if (serverMessage.length > 0 && serverMessage !== '{}') {
        displayMsg = serverMessage;
      }

      if (error.status === 401 || error.status === 404 || error.status === 400) {
        this.hasError = true;
        this.recordFailedAttempt();
      }

      // Show popup only if it's not handled by inline error
      if (!this.emailErrorMsg && !this.passwordErrorMsg) {
        let title = 'พบข้อผิดพลาด';
        if (displayMsg.includes('ถูกปิด') || displayMsg.includes('ถูกระงับ')) {
          title = 'เข้าสู่ระบบไม่สำเร็จ';
        }
        Swal.fire({
          icon: 'error',
          title: title,
          text: displayMsg,
          confirmButtonColor: '#1a1a1a',
          confirmButtonText: 'ตกลง',
          heightAuto: false,
          customClass: { popup: 'custom-swal-popup' }
        });
      }

      // If user got locked out from this attempt
      if (this.isLocked) {
        this.emailErrorMsg = '';
        this.passwordErrorMsg = '';
        Swal.fire({
          icon: 'error',
          title: 'บัญชีถูกล็อก',
          text: `พยายามเข้าสู่ระบบผิดพลาด ${MAX_ATTEMPTS} ครั้ง กรุณารอ 15 นาที`,
          confirmButtonColor: '#1a1a1a',
          confirmButtonText: 'ตกลง',
          heightAuto: false,
          customClass: { popup: 'custom-swal-popup' }
        });
      }

    } finally {
      this.isLoading = false;
    }
  }
}