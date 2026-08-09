import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { SESSION_STORAGE_KEY, SESSION_TYPE_KEY } from '../pages/login/login.page';
import Swal from 'sweetalert2';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  let token = '';
  const router = inject(Router);

  try {
    const storedData = localStorage.getItem(SESSION_STORAGE_KEY);
    if (storedData) token = JSON.parse(storedData)?.token || '';
  } catch (e) {
    console.error('Error parsing token from storage', e);
  }

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // ดักจับ 401 Unauthorized (Token หมดอายุ หรือไม่มีสิทธิ์) และยกเว้นหน้า login API
      if (error.status === 401 && !req.url.includes('/login')) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        localStorage.removeItem(SESSION_TYPE_KEY);
        
        Swal.fire({
          icon: 'warning',
          title: 'เซสชันหมดอายุ',
          text: 'การเข้าสู่ระบบของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
          confirmButtonColor: '#1a1a1a',
          confirmButtonText: 'ตกลง',
          heightAuto: false,
          customClass: { popup: 'custom-swal-popup' }
        }).then(() => {
          // รีเฟรชหน้าต่างใหม่เพื่อล้าง State ทั้งหมดใน Memory (เช่น เมนูที่ค้างอยู่)
          window.location.href = '/login';
        });
      }
      return throwError(() => error);
    })
  );
};