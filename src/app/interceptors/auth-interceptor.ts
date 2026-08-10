import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, from } from 'rxjs';
import { SESSION_STORAGE_KEY, SESSION_TYPE_KEY } from '../pages/login/login.page';
import Swal from 'sweetalert2';

const API_BASE = 'https://api.huntpuk.space/api';
const REFRESH_URL = `${API_BASE}/auth/refresh-token`;

// ป้องกันการ refresh token ซ้อนกัน
let isRefreshing = false;

// ==========================================
// ช่วยดึง/บันทึก token จาก localStorage
// ==========================================
function getStoredData(): any {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function getToken(): string {
  return getStoredData()?.token || '';
}

function getTokenExpiry(): number {
  const token = getToken();
  if (!token) return 0;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : 0; // แปลงเป็น ms
  } catch { return 0; }
}

function saveNewToken(newToken: string) {
  try {
    const stored = getStoredData();
    if (stored) {
      stored.token = newToken;
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stored));
    }
  } catch {}
}

// ==========================================
// ฟังก์ชัน refresh token (ส่ง token เก่าไปขอใหม่)
// ==========================================
async function refreshToken(): Promise<string | null> {
  const oldToken = getToken();
  if (!oldToken) return null;

  try {
    const res = await fetch(REFRESH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${oldToken}`
      }
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data?.token) {
      saveNewToken(data.token);
      return data.token;
    }
    return null;
  } catch {
    return null;
  }
}

// ==========================================
// ฟังก์ชัน Logout + แจ้งเตือน
// ==========================================
function doForceLogout(router: Router, message: string) {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(SESSION_TYPE_KEY);
  localStorage.removeItem('hp_last_activity');

  Swal.fire({
    icon: 'warning',
    title: 'เซสชันหมดอายุ',
    text: message,
    confirmButtonColor: '#1a1a1a',
    confirmButtonText: 'ตกลง',
    heightAuto: false,
    customClass: { popup: 'custom-swal-popup' }
  }).then(() => {
    window.dispatchEvent(new CustomEvent('user-logout'));
    window.location.href = '/login';
  });
}

// ==========================================
// 🛡️ Main Interceptor
// ==========================================
export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const router = inject(Router);

  // ยกเว้น request ที่เป็น login และ refresh-token เอง
  const isAuthCall = req.url.includes('/auth/login') || req.url.includes('/auth/refresh-token');

  let token = getToken();

  // ถ้ามี token ให้แนบ Authorization header
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  // ตรวจสอบว่า token ใกล้หมดอายุ (เหลือน้อยกว่า 10 นาที)
  if (token && !isAuthCall) {
    const expiry = getTokenExpiry();
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;

    if (expiry > 0 && expiry - now < tenMinutes && !isRefreshing) {
      // Token ใกล้หมด → refresh ล่วงหน้า (silent)
      isRefreshing = true;
      refreshToken()
        .then(newToken => {
          if (newToken) {
            console.debug('[Auth] Token refreshed proactively');
          }
        })
        .finally(() => { isRefreshing = false; });
    }
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // ดักจับ 401 Unauthorized
      if (error.status === 401 && !isAuthCall) {
        // ลอง refresh token 1 ครั้ง
        if (!isRefreshing) {
          isRefreshing = true;
          return from(refreshToken()).pipe(
            switchMap(newToken => {
              isRefreshing = false;
              if (newToken) {
                // Retry request เดิมด้วย token ใหม่
                const retryReq = req.clone({
                  setHeaders: { Authorization: `Bearer ${newToken}` }
                });
                return next(retryReq);
              } else {
                // Refresh ไม่ได้ → logout
                doForceLogout(router, 'การเข้าสู่ระบบของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
                throw error;
              }
            }),
            catchError(retryError => {
              isRefreshing = false;
              doForceLogout(router, 'การเข้าสู่ระบบของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
              throw retryError;
            })
          );
        } else {
          // กำลัง refresh อยู่แล้ว → logout ทันที
          doForceLogout(router, 'การเข้าสู่ระบบของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
        }
      }

      throw error;
    })
  );
};