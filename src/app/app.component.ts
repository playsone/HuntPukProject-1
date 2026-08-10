import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule } from "@ionic/angular";
import { addIcons } from 'ionicons';
import { alertCircleOutline, checkmarkCircleOutline, informationCircleOutline, warningOutline } from 'ionicons/icons';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { environment } from '../environments/environment';
import { MenuComponent } from "./components/menu/menu.component";
import { RatingPromptComponent } from "./components/rating-prompt/rating-prompt.component";
import Swal from 'sweetalert2';

const INACTIVITY_MS = 60 * 60 * 1000; // 1 ชั่วโมง
const LAST_ACTIVITY_KEY = 'hp_last_activity';
const SESSION_TYPE_KEY = 'hp_session_type';
const SESSION_STORAGE_KEY = 'loggedIn';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, MenuComponent, RatingPromptComponent],
})
export class AppComponent implements OnInit, OnDestroy {
  api = environment.GGMAPI;

  // ⏰ Inactivity Timer สำหรับ session-only login
  private inactivityTimer?: ReturnType<typeof setTimeout>;
  private inactivityCheckInterval?: ReturnType<typeof setInterval>;
  private readonly boundUpdateActivity = () => this.updateLastActivity();

  constructor(private router: Router) {
    addIcons({
      alertCircleOutline,
      checkmarkCircleOutline,
      informationCircleOutline,
      warningOutline
    });
  }

  ngOnInit() {
    // ✅ ฟัง sidebar state change จาก MenuComponent
    window.addEventListener('sidebar-state-changed', (e: Event) => {
      const detail = (e as CustomEvent).detail as { isOpen: boolean; isDesktop: boolean };
      const ionApp = document.querySelector('ion-app');
      if (!ionApp) return;

      if (detail.isDesktop && detail.isOpen) {
        ionApp.classList.add('sidebar-open');
      } else {
        ionApp.classList.remove('sidebar-open');
      }
    });

    // ✅ ฟัง event เมื่อ localStorage มีการเปลี่ยนแปลงจาก tab อื่น (เช่น login/logout สลับ user)
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key === 'loggedIn' || event.key === 'token') {
        window.location.reload();
      }
    });

    // ✅ เริ่มติดตาม inactivity เมื่อ login แบบไม่จดจำ
    window.addEventListener('user-logged-in', () => this.setupSessionTimer());
    window.addEventListener('user-logout', () => this.teardownSessionTimer());

    // ✅ ตรวจสอบว่า session ยังค้างอยู่ในกรณี page refresh หรือเปิด browser ใหม่
    const sessionType = localStorage.getItem(SESSION_TYPE_KEY);
    const loggedIn = localStorage.getItem(SESSION_STORAGE_KEY);
    
    if (sessionType === 'session' && loggedIn) {
      if (!document.cookie.includes('hp_session=active')) {
        // บราวเซอร์ถูกปิดแล้วเปิดใหม่ (Session Cookie หายไปแล้ว)
        localStorage.removeItem(SESSION_STORAGE_KEY);
        localStorage.removeItem(SESSION_TYPE_KEY);
        localStorage.removeItem(LAST_ACTIVITY_KEY);
      } else {
        // ยังอยู่ใน session เดิม
        this.setupSessionTimer();
      }
    }
  }

  ngOnDestroy() {
    this.teardownSessionTimer();
  }

  private updateLastActivity() {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    // Reset inactivity timer
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    this.inactivityTimer = setTimeout(() => this.doSessionExpiry(), INACTIVITY_MS);
  }

  private setupSessionTimer() {
    // เรียกเฉพาะเมื่อ session type เป็น 'session' เท่านั้น
    if (localStorage.getItem(SESSION_TYPE_KEY) !== 'session') return;

    this.teardownSessionTimer(); // clear อันเดิมก่อน

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, this.boundUpdateActivity, { passive: true }));

    // บันทึก activity เริ่มต้น และสร้าง Session Cookie
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    document.cookie = "hp_session=active; path=/";
    this.inactivityTimer = setTimeout(() => this.doSessionExpiry(), INACTIVITY_MS);

    // ตรวจสอบทุก 1 นาที: ถ้า page ถูกเปิดใน tab ใหม่ (page refresh) ไม่มี event listener
    // เราทีเช็คจาก localStorage
    this.inactivityCheckInterval = setInterval(() => {
      const lastActivity = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || '0', 10);
      if (lastActivity && Date.now() - lastActivity > INACTIVITY_MS) {
        this.doSessionExpiry();
      }
    }, 60 * 1000); // เช็คทุก 1 นาที
  }

  private teardownSessionTimer() {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.removeEventListener(e, this.boundUpdateActivity));
    if (this.inactivityTimer) { clearTimeout(this.inactivityTimer); this.inactivityTimer = undefined; }
    if (this.inactivityCheckInterval) { clearInterval(this.inactivityCheckInterval); this.inactivityCheckInterval = undefined; }
  }

  private doSessionExpiry() {
    this.teardownSessionTimer();
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_TYPE_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    document.cookie = "hp_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    Swal.fire({
      icon: 'info',
      title: 'เซสชันหมดอายุ',
      text: 'คุณไม่ได้ใช้งานเกิน 1 ชั่วโมง ระบบได้ออกจากระบบโดยอัตโนมัติ',
      confirmButtonColor: '#1a1a1a',
      confirmButtonText: 'ตกลง',
      heightAuto: false,
      customClass: { popup: 'custom-swal-popup' }
    }).then(() => {
      window.dispatchEvent(new CustomEvent('user-logout'));
      this.router.navigate(['/login']);
    });
  }
}