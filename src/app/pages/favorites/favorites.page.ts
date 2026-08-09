import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, AlertController, ToastController, LoadingController, ActionSheetController } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {  arrowBack, trashOutline, locationSharp, home, star, heartDislikeOutline, checkmarkCircle, arrowForwardCircle, locationOutline, listCircle, closeCircle, swapVerticalOutline, bookmark, search, eye, mapOutline, timeOutline, location } from 'ionicons/icons';
import { DormitoryService, Dormitory } from '../../services/dormitory';
import { HeaderComponent } from '../../components/header/header.component';
import { ThaiDatePipe } from '../../pipes/thai-date-pipe';

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.page.html',
  styleUrls: ['./favorites.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, HeaderComponent, ThaiDatePipe]
})
export class FavoritesPage implements OnInit {

  favDorms: any[] = [];
  allDorms: any[] = [];
  keyword: string = '';
  currentSort: string = '';
  currentUserId: number = 0;
  currentUser: any = null;
  isLoading: boolean = false;
  isCompareMode: boolean = false;

  constructor(
    private navCtrl: NavController,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private actionSheetCtrl: ActionSheetController,
    private dormService: DormitoryService
  ) {
    addIcons({
      'arrow-back': arrowBack,
      'trash-outline': trashOutline,
      'location-sharp': locationSharp,
      'home': home,
      'star': star,
      'heart-dislike-outline': heartDislikeOutline,
      'checkmark-circle': checkmarkCircle,
      'arrow-forward-circle': arrowForwardCircle,
      'location-outline': locationOutline,
      'list-circle': listCircle,
      'close-circle': closeCircle,
      'swap-vertical-outline': swapVerticalOutline,
      'bookmark': bookmark,
      'search': search,
      'map-outline': mapOutline,
      'time-outline': timeOutline,
      'location': location
    , eye});
  }

  ngOnInit() { this.checkLoginStatus(); }

  ionViewWillEnter() {
    if (this.currentUserId) this.loadFavorites();
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

        const role = Number(this.currentUser?.role_id || this.currentUser?.ROLE_ID || this.currentUser?.role_type_id || this.currentUser?.ROLE_TYPE_ID || 0);
        if (role === 2 || role === 3) {
          this.alertCtrl.create({
            header: 'ไม่สามารถเข้าถึงได้',
            message: 'ฟีเจอร์รายการโปรดสงวนไว้สำหรับสมาชิกเท่านั้น',
            buttons: [{
              text: 'ตกลง',
              handler: () => {
                this.router.navigate(['/home'], { replaceUrl: true });
              }
            }],
            backdropDismiss: false
          }).then(alert => alert.present());
          return;
        }

      } catch (e) {
        console.error('Error parsing user data', e);
      }
    }
  }

  async loadFavorites() {
    this.isLoading = true;
    try {
      const res = await this.dormService.getMyFavorites(this.currentUserId);
      if (res && (res as any[]).length > 0) {
        this.allDorms = (res as any[]).map(d => ({ ...d, isChecked: false }));
        this.performSearch();
      } else {
        this.allDorms = [];
        this.favDorms = [];
      }
      console.log('✅ Favorites loaded:', this.allDorms.length, 'items');
    } catch (error) {
      console.error('Error loading favorites:', error);
      this.allDorms = [];
      this.favDorms = [];
    } finally {
      this.isLoading = false;
    }
  }

  async removeFavorite(event: Event, dorm: any) {
    event.stopPropagation();
    event.preventDefault(); // Prevent navigating to detail page

    const alert = await this.alertCtrl.create({
      header: 'ยกเลิกการสนใจ',
      message: 'คุณต้องการยกเลิกการสนใจหอพักนี้ใช่หรือไม่?',
      buttons: [
        { text: 'ไม่', role: 'cancel' },
        { 
          text: 'ใช่, ยกเลิก', 
          handler: async () => {
            try {
              await this.dormService.removeFavorite(this.currentUserId, dorm.DORM_ID);
              // Update both allDorms and favDorms
              this.allDorms = this.allDorms.filter(d => d.DORM_ID !== dorm.DORM_ID);
              this.performSearch(); // This updates favDorms based on keyword and sort
              this.showToast('ลบออกจากรายการโปรดเรียบร้อย', 'medium');
            } catch (error) {
              console.error(error);
              this.showToast('เกิดข้อผิดพลาดในการลบ', 'danger');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  goToDetail(dorm: any) {
    if (this.isCompareMode) {
      this.toggleCompare(null, dorm);
    } else {
      this.router.navigate(['/dorm-detail', dorm.DORM_ID]);
    }
  }
  
  goBack() { this.navCtrl.back(); }

  onSearch(keyword: string) {
    this.keyword = keyword.trim();
    this.performSearch();
  }

  performSearch() {
    let tempDorms = [...this.allDorms];
    
    if (this.keyword) {
      const lowerKey = this.keyword.toLowerCase();
      tempDorms = tempDorms.filter(d => (d.DORM_NAME || '').toLowerCase().includes(lowerKey));
    }

    this.favDorms = tempDorms;
    this.applySort();
  }

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
    
    this.favDorms.sort((a: any, b: any) => {
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

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: msg, duration: 2000, color, position: 'bottom'
    });
    toast.present();
  }

  getSelectedCount() {
    return this.favDorms.filter(d => d.isChecked).length;
  }

  clearSelection() {
    this.favDorms.forEach(d => d.isChecked = false);
  }

  toggleCompareMode() {
    this.isCompareMode = !this.isCompareMode;
    if (!this.isCompareMode) {
      this.clearSelection();
    }
  }

  async toggleCompare(event: Event | null, dorm: any) {
    if (event) event.stopPropagation();
    
    // หากเลือกเพื่อเอาออก สามารถทำได้เสมอ
    if (dorm.isChecked) {
      dorm.isChecked = false;
      return;
    }

    // หากเลือกเพิ่ม ต้องเช็คว่าเกิน 5 หรือไม่
    if (this.getSelectedCount() >= 5) {
      const alert = await this.alertCtrl.create({
        header: 'แจ้งเตือน',
        message: 'คุณสามารถเลือกหอพักเพื่อเปรียบเทียบได้สูงสุด 5 แห่งเท่านั้น',
        buttons: ['ตกลง'],
        cssClass: 'custom-alert'
      });
      await alert.present();
      return;
    }
    
    // ถ้าไม่เกิน ให้เลือกได้
    dorm.isChecked = true;
  }

  startCompare() {
    const selectedIds = this.favDorms.filter(d => d.isChecked).map(d => d.DORM_ID || d.id);
    if (selectedIds.length < 2) {
      this.showToast('กรุณาเลือกอย่างน้อย 2 หอพักเพื่อเปรียบเทียบ', 'warning');
      return;
    }
    this.router.navigate(['/compare'], { state: { compareIds: selectedIds } });
  }
}