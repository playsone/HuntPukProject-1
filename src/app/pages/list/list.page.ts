import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, ToastController, AlertController, ActionSheetController, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { bookmark, bookmarkOutline, locationSharp, location, home, search, arrowBack, star, locationOutline, mapOutline, timeOutline, menuOutline, optionsOutline, closeCircle, swapVerticalOutline, eye } from 'ionicons/icons';

import { DormitoryService, Dormitory } from '../../services/dormitory'; 
import { UserService } from '../../services/user'; 
import { HeaderComponent } from '../../components/header/header.component'; 
import { AlertModalComponent } from '../../components/alert-modal/alert-modal.component';
import { RequireLoginModalComponent } from '../../components/require-login-modal/require-login-modal.component';
import { ActionConfirmModalComponent } from '../../components/action-confirm-modal/action-confirm-modal.component';
import { ThaiDatePipe } from '../../pipes/thai-date-pipe';

@Component({
  selector: 'app-list',
  templateUrl: './list.page.html',
  styleUrls: ['./list.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, HeaderComponent, RequireLoginModalComponent, ActionConfirmModalComponent, ThaiDatePipe] 
})
export class ListPage implements OnInit {

  dorms: Dormitory[] = [];
  keyword: string = '';
  currentUserId: number = 0;
  currentUser: any = null; 
  isLoading: boolean = true; 
  dormStatusList: any[] = [];

  allDorms: Dormitory[] = [];
  isModalOpen = false;
  minPrice: number | null = null;
  maxPrice: number | null = null;
  selectedZone: string = '';
  minScore: number | null = null;
  maxWaterUnit: number | null = null;  // ค่าน้ำแบบรายหน่วย
  maxWaterLump: number | null = null;  // ค่าน้ำแบบเหมา
  maxElect: number | null = null;
  zoneOptions: any[] = [];
  currentSort: string = ''; // 'price_asc', 'price_desc', 'name_asc', 'name_desc', 'score_desc'

  constructor(
    private router: Router, 
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController, 
    private actionSheetCtrl: ActionSheetController,
    private modalCtrl: ModalController,
    private dormService: DormitoryService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) { 
    // ✅ เพิ่ม menuOutline, optionsOutline, closeCircle เข้าไปในระบบไอคอน
    addIcons({ bookmark, bookmarkOutline, locationSharp, location, home, search, arrowBack, star, locationOutline, 'map-outline': mapOutline, 'time-outline': timeOutline, 'menu-outline': menuOutline, 'options-outline': optionsOutline, 'close-circle': closeCircle, 'swap-vertical-outline': swapVerticalOutline, eye });
  }

  ngOnInit() {
    this.checkLoginStatus(); 
    this.fetchZones();
    this.fetchDormStatuses();
    this.loadDorms();
  }

  async fetchZones() {
    try { const res = await this.dormService.getZones(); if (res.success) this.zoneOptions = res.data; } 
    catch (error) { console.error('Fetch Zones Error:', error); }
  }

  fetchDormStatuses() {
    this.dormService.getDormStatuses().subscribe({
      next: (res: any) => this.dormStatusList = res.data || res,
      error: () => console.error('Failed to load dorm statuses')
    });
  }

  checkLoginStatus() {
    this.currentUser = null;
    this.currentUserId = 0; 
    const storedData = localStorage.getItem('loggedIn');
    if (storedData) {
      try {
        const userObj = JSON.parse(storedData);
        this.currentUser = userObj.user ? userObj.user : userObj;
        this.currentUserId = Number(this.currentUser?.id || this.currentUser?.USER_ID || 0);
      } catch (e) {
        console.error('Error parsing user data', e);
      }
    }
  }

  async showAuthAlert() {
    const modal = await this.modalCtrl.create({
      component: AlertModalComponent,
      componentProps: {
        title: 'สำหรับสมาชิกเท่านั้น',
        message: 'กรุณาเข้าสู่ระบบเพื่อใช้งานตัวกรองนี้ครับ',
        type: 'warning'
      },
      cssClass: 'custom-alert-modal'
    });
    await modal.present();
  }

  async loadDorms() {
    this.isLoading = true; 
    try {
      const res = await this.dormService.getAllDorms();
      let favoriteIds: number[] = [];
      if (this.currentUserId !== 0) {
        try {
           const favRes = await this.dormService.getMyFavorites(this.currentUserId);
           if (favRes) {
              favoriteIds = (favRes as any[]).map(f => Number(f.DORM_ID || f.dorm_id));
           }
        } catch (e) { console.error('Fetch fav error:', e); }
      }

      if (res && res.data) {
        this.allDorms = res.data.map((d: any) => ({ 
          ...d, 
          isChecked: favoriteIds.includes(Number(d.DORM_ID || d.id))
        })) as any[];        
        this.dorms = [...this.allDorms];
        this.performSearch(); // Apply filters if any
      } else {
        this.dorms = [];
      }
    } catch (error) { console.error('Error loading dorms:', error); } 
    finally { setTimeout(() => { this.isLoading = false; }, 300); }
  }

  async onSearch(event?: any) {
    if (event !== undefined) { this.keyword = (typeof event === 'string' ? event : event?.target?.value || '').trim(); }
    this.performSearch();
  }

  async performSearch() {
    this.isLoading = true;
    try {
      const res = await this.dormService.searchDorms(
        this.keyword, 
        this.selectedZone, 
        this.minPrice !== null ? this.minPrice : undefined, 
        this.maxPrice !== null ? this.maxPrice : undefined
      );
      if (res && res.data) {
        let tempDorms = res.data.map((d: any) => ({ 
          ...d, 
          isChecked: this.allDorms.find(ad => ad.DORM_ID === d.DORM_ID)?.isChecked 
        })) as any[];
        
        if (this.minScore !== null && this.minScore !== undefined) {
          if (this.minScore === 5) {
            tempDorms = tempDorms.filter((dorm: any) => dorm.SCORE === 5);
          } else {
            tempDorms = tempDorms.filter((dorm: any) => dorm.SCORE >= this.minScore! && dorm.SCORE < (this.minScore! + 1));
          }
        }
        if (this.maxWaterUnit !== null && this.maxWaterUnit !== undefined) tempDorms = tempDorms.filter((dorm: any) => dorm.WATER_UNIT > 0 && dorm.WATER_UNIT <= this.maxWaterUnit!);
        if (this.maxWaterLump !== null && this.maxWaterLump !== undefined) tempDorms = tempDorms.filter((dorm: any) => dorm.WATER_LUMP > 0 && dorm.WATER_LUMP <= this.maxWaterLump!);
        if (this.maxElect !== null && this.maxElect !== undefined) tempDorms = tempDorms.filter((dorm: any) => dorm.ELECT_UNIT <= this.maxElect!);

        this.dorms = tempDorms;
        this.applySort(); // Apply sort after filtering
      } else {
        this.dorms = [];
      }
    } catch (err) { console.error('Search Error:', err); }
    finally { this.isLoading = false; }
  }

  setOpen(isOpen: boolean) { this.isModalOpen = isOpen; }
  openFilter() { this.setOpen(true); }
  
  clearAllFilters() {
    this.minPrice = null; this.maxPrice = null; this.selectedZone = '';
    this.minScore = null; this.maxWaterUnit = null; this.maxWaterLump = null; this.maxElect = null;
  }

  applyFilter() { this.setOpen(false); this.performSearch(); }

  async openSort() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'จัดเรียงลำดับ',
      cssClass: 'custom-action-sheet',
      buttons: [
        { text: 'ราคา: ต่ำ - สูง', handler: () => { this.currentSort = 'price_asc'; this.applySort(); } },
        { text: 'ราคา: สูง - ต่ำ', handler: () => { this.currentSort = 'price_desc'; this.applySort(); } },
        { text: 'ชื่อ: ก - ฮ', handler: () => { this.currentSort = 'name_asc'; this.applySort(); } },
        { text: 'ชื่อ: ฮ - ก', handler: () => { this.currentSort = 'name_desc'; this.applySort(); } },
        { text: 'คะแนนรีวิว: มาก - น้อย', handler: () => { this.currentSort = 'score_desc'; this.applySort(); } },
        { text: 'ยกเลิกการจัดเรียง', role: 'destructive', handler: () => { this.currentSort = ''; this.performSearch(); } },
        { text: 'ปิด', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  applySort() {
    if (!this.currentSort) return;
    
    this.dorms.sort((a: any, b: any) => {
      switch (this.currentSort) {
        case 'price_asc': return (a.start_price || 0) - (b.start_price || 0);
        case 'price_desc': return (b.start_price || 0) - (a.start_price || 0);
        case 'name_asc': return (a.DORM_NAME || '').localeCompare(b.DORM_NAME || '', 'th');
        case 'name_desc': return (b.DORM_NAME || '').localeCompare(a.DORM_NAME || '', 'th');
        case 'score_desc': return (b.SCORE || 0) - (a.SCORE || 0);
        default: return 0;
      }
    });
  }

  async toggleFavorite(event: Event, dorm: any) {
    event.stopPropagation(); 
    event.preventDefault(); 

    if (!this.currentUser || this.currentUserId === 0) {
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

    const userRole = this.currentUser.role_id || this.currentUser.ROLE_ID;
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

    const dId = dorm.DORM_ID || dorm.id;

    if (dorm.isChecked) {
        const modal = await this.modalCtrl.create({
            component: ActionConfirmModalComponent,
            componentProps: {
                title: 'ยกเลิกการสนใจ',
                message: 'คุณต้องการยกเลิกการสนใจหอพักนี้ใช่หรือไม่?',
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
                await this.dormService.removeFavorite(this.currentUserId, dId);
                dorm.isChecked = false;
                this.cdr.detectChanges();
                this.showToast('ยกเลิกการสนใจเรียบร้อย', 'medium');
            } catch (error: any) {
                if (error.status !== 401) {
                    this.showToast('เกิดข้อผิดพลาดในการยกเลิก', 'danger');
                }
            }
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
            await this.dormService.addFavorite(this.currentUserId, dId);
            dorm.isChecked = true; 
            this.cdr.detectChanges();
            this.showToast(`เพิ่ม "${dorm.DORM_NAME || dorm.name || ''}" ลงรายการสนใจเรียบร้อย!`, 'success');
        } catch (error: any) {
            if (error.status === 409 || (error.error && error.error.message === 'Duplicate')) {
                dorm.isChecked = true;
                this.cdr.detectChanges();
                this.showToast('หอพักนี้อยู่ในรายการสนใจอยู่แล้วครับ', 'warning');
            } else if (error.status !== 401) {
                this.showToast('เกิดข้อผิดพลาดในการบันทึก', 'danger');
            }
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

  goToDetail(dorm: any) { this.router.navigate(['/dorm-detail', dorm.DORM_ID]); }
  goBack() { this.navCtrl.back(); }

  // 🌟 ฟังก์ชันเปิดเมนูด้านข้าง
  openMenu() { window.dispatchEvent(new CustomEvent('toggle-sidebar')); }
}