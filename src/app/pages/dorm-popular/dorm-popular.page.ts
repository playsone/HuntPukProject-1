import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController, ModalController } from '@ionic/angular'; 
import { Router } from '@angular/router'; 
import { DormitoryService } from '../../services/dormitory'; 
import { addIcons } from 'ionicons';
import { 
  arrowBack, star, trophy, bookmark, bookmarkOutline,
  call, callOutline, documentTextOutline, chatbubbleEllipsesOutline, 
  logoFacebook, locationOutline, checkmarkCircleOutline, alertCircleOutline, timeOutline, mapOutline
} from 'ionicons/icons';
import { RequireLoginModalComponent } from '../../components/require-login-modal/require-login-modal.component';
import { ActionConfirmModalComponent } from '../../components/action-confirm-modal/action-confirm-modal.component';
import { ThaiDatePipe } from '../../pipes/thai-date-pipe';

@Component({
  selector: 'app-dorm-popular',
  templateUrl: './dorm-popular.page.html',
  styleUrls: ['./dorm-popular.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RequireLoginModalComponent, ActionConfirmModalComponent, ThaiDatePipe]
})
export class DormPopularPage implements OnInit {

  popularDorms: any[] = [];
  compareError: string = '';
  currentUserId: number = 0;
  currentUser: any = null;
  dormStatusList: any[] = [];
  
  constructor(
    private dormService: DormitoryService,
    private router: Router,  
    private cdr: ChangeDetectorRef,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController
  ) { 
    addIcons({ 
      arrowBack, star, trophy, bookmark, 'bookmark-outline': bookmarkOutline,
      call, 'call-outline': callOutline, 'document-text-outline': documentTextOutline,
      'chatbubble-ellipses-outline': chatbubbleEllipsesOutline, 'logo-facebook': logoFacebook,
      'location-outline': locationOutline, 'checkmark-circle-outline': checkmarkCircleOutline,
      'alert-circle-outline': alertCircleOutline,
      'time-outline': timeOutline,
      'map-outline': mapOutline,
      eyeOutline: 'eye-outline' // For views
    });
  }

  ngOnInit() {
    this.checkLoginStatus();
    this.fetchDormStatuses();
    this.fetchPopularDorms();
  }

  onSortChange() {
    this.fetchPopularDorms();
  }

  fetchDormStatuses() {
    this.dormService.getDormStatuses().subscribe({
      next: (res: any) => this.dormStatusList = res.data || res,
      error: () => console.error('Failed to load dorm statuses')
    });
  }

  checkLoginStatus() {
    this.currentUserId = 0;
    const storedData = localStorage.getItem('loggedIn');
    if (storedData) {
      try {
        const userObj = JSON.parse(storedData);
        this.currentUser = userObj.user ? userObj.user : userObj;
        this.currentUserId = Number(this.currentUser?.id || this.currentUser?.USER_ID || 0);
      } catch (e) { console.error(e); }
    }
  }

  sortType: 'score' | 'views' = 'score';

  async fetchPopularDorms() {
    this.compareError = '';
    try {
      let favoriteIds: number[] = [];
      if (this.currentUserId !== 0) {
        try {
           const favRes = await this.dormService.getMyFavorites(this.currentUserId);
           if (favRes) {
              favoriteIds = (favRes as any[]).map(f => Number(f.DORM_ID || f.dorm_id));
           }
        } catch (e) { console.error('Fetch fav error:', e); }
      }

      // Get up to 1000 to mimic "unlimited"
      const res = await this.dormService.getPopularDorms(1000, this.sortType);
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        let processedDorms = res.data.map((dorm: any) => {
          const rawScore = dorm.SCORE || dorm.score || 0;
          const parsedScore = parseFloat(rawScore);
          return { 
            ...dorm, 
            scoreDisplay: (!isNaN(parsedScore)) ? parsedScore.toFixed(1) : '0.0',
            isChecked: favoriteIds.includes(Number(dorm.DORM_ID || dorm.id)),
            isOwner: this.currentUserId !== 0 && (Number(dorm.OWNER_ID || dorm.owner_id) === this.currentUserId)
          };
        });
        // Sort locally to ensure correct display
        processedDorms = processedDorms.sort((a: any, b: any) => {
          const viewsA = a.VIEW_COUNT || a.views || 0;
          const viewsB = b.VIEW_COUNT || b.views || 0;
          const scoreA = parseFloat(a.SCORE || a.score || 0);
          const scoreB = parseFloat(b.SCORE || b.score || 0);
          
          if (this.sortType === 'views') {
            if (viewsB !== viewsA) return viewsB - viewsA;
            return scoreB - scoreA;
          } else {
            if (scoreB !== scoreA) return scoreB - scoreA;
            return viewsB - viewsA;
          }
        });
        
        this.popularDorms = processedDorms;
      } else { this.compareError = 'ยังไม่มีข้อมูลหอพักยอดนิยมในขณะนี้'; }
    } catch (err) { this.compareError = 'เกิดข้อผิดพลาดในการดึงข้อมูล'; } 
    finally { this.cdr.detectChanges(); }
  }

  sortDorms() {
    this.fetchPopularDorms();
  }

  goBack() { this.router.navigate(['/home']); }

  goToDetail(dorm: any, event?: any) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (document.activeElement instanceof HTMLElement) { document.activeElement.blur(); }
    if (dorm && (dorm.DORM_ID || dorm.id)) { this.router.navigate(['/dorm-detail', dorm.DORM_ID || dorm.id]); }
  }

  // 🌟 ระบบกดสนใจ (แบบมี Popup ยืนยัน)
  async toggleFavorite(event: Event, dorm: any) {
    event.preventDefault(); 
    event.stopPropagation(); 

    if (!this.currentUserId || this.currentUserId === 0) {
        const modal = await this.modalCtrl.create({
            component: RequireLoginModalComponent,
            cssClass: 'custom-alert-modal'
        });
        await modal.present();
        
        const { role } = await modal.onDidDismiss();
        if (role === 'login') {
            this.router.navigate(['/login']);
        }
        return;
    }

    const userRole = this.currentUser?.role_id || this.currentUser?.ROLE_ID;
    if (userRole == 2 || userRole == 3) {
        const modal = await this.modalCtrl.create({
            component: ActionConfirmModalComponent,
            componentProps: {
                title: 'ไม่สามารถใช้งานได้',
                message: 'แอดมินหรือเจ้าของหอพัก ไม่สามารถกดรายการโปรดได้ครับ',
                confirmText: 'ปิด',
                type: 'warning',
                showCancel: false
            },
            cssClass: 'custom-alert-modal'
        });
        await modal.present();
        return;
    }

    if (dorm.isChecked) {
        const modal = await this.modalCtrl.create({
            component: ActionConfirmModalComponent,
            componentProps: {
                title: 'ยกเลิกการสนใจ',
                message: 'ต้องการยกเลิกการสนใจหอพักนี้ใช่หรือไม่?',
                confirmText: 'ใช่, ยกเลิก',
                cancelText: 'ไม่',
                type: 'danger'
            },
            cssClass: 'custom-alert-modal'
        });
        await modal.present();
        
        const { role } = await modal.onDidDismiss();
        if (role === 'confirm') {
            try {
                await this.dormService.removeFavorite(this.currentUserId, dorm.DORM_ID || dorm.id);
                dorm.isChecked = false;
                this.showToast('ยกเลิกการสนใจเรียบร้อย', 'medium');
                this.cdr.detectChanges();
            } catch (error) { this.showToast('เกิดข้อผิดพลาดในการยกเลิก', 'danger'); }
        }
        return;
    }

    const modal = await this.modalCtrl.create({
        component: ActionConfirmModalComponent,
        componentProps: {
            title: 'ยืนยัน',
            message: 'คุณสนใจหอพักนี้ใช่หรือไม่?',
            confirmText: 'ใช่, สนใจ',
            cancelText: 'ยกเลิก',
            type: 'confirm'
        },
        cssClass: 'custom-alert-modal'
    });
    await modal.present();
    
    const { role } = await modal.onDidDismiss();
    if (role === 'confirm') {
        try {
            await this.dormService.addFavorite(this.currentUserId, dorm.DORM_ID || dorm.id);
            dorm.isChecked = true; 
            this.cdr.detectChanges();
            this.showToast(`เพิ่ม "${dorm.DORM_NAME}" ลงรายการสนใจเรียบร้อย!`, 'success');
        } catch (error: any) {
            if (error.status === 409 || (error.error && error.error.message === 'Duplicate')) {
                dorm.isChecked = true;
                this.cdr.detectChanges();
                this.showToast('หอพักนี้มีในรายการสนใจแล้วครับ', 'warning');
            } else { this.showToast('เกิดข้อผิดพลาดในการบันทึก', 'danger'); }
        }
    }
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: msg, duration: 2500, color: color, position: 'bottom',
      buttons: [{ text: 'ปิด', role: 'cancel' }]
    });
    await toast.present();
  }

}