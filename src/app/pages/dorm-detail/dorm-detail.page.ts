import { Component, OnInit, Input, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core'; 
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, NavController, AlertController, ModalController } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { addIcons } from 'ionicons';
import {   
  star, starHalf, starOutline, locationOutline, callOutline, arrowBack,
  wifi, car, snow, checkmarkCircleOutline, personCircle, timeOutline, send,
  person, logoFacebook, logoInstagram, chatbubbleEllipses, bedOutline, imageOutline, locationSharp,
  navigateCircleOutline, waterOutline, flashOutline, 
  logoTwitter, paperPlane,
  documentTextOutline, call, alertCircleOutline,
  close, chevronBackOutline, chevronForwardOutline, expandOutline
, eye , bookmark, bookmarkOutline } from 'ionicons/icons';
import { DormitoryService } from '../../services/dormitory'; 

import { ThaiDatePipe } from '../../pipes/thai-date-pipe';
import { ActionConfirmModalComponent } from '../../components/action-confirm-modal/action-confirm-modal.component';
import { RequireLoginModalComponent } from '../../components/require-login-modal/require-login-modal.component';

@Component({
  selector: 'app-dorm-detail',
  templateUrl: './dorm-detail.page.html',
  styleUrls: ['./dorm-detail.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ThaiDatePipe, ActionConfirmModalComponent, RequireLoginModalComponent]
})
export class DormDetailPage implements OnInit, OnChanges {

  @Input() dormData: any = null; 
  @Input() isPopup: boolean = false; 
  facilitiesList: { name: string; icon: string }[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dormData'] && changes['dormData'].currentValue) {
      this.prepareOwnerInfo();
      this.parseFacilities();
      this.loadReviews();
      this.checkFavoriteStatus();
    }
  }

  isFavorite: boolean = false;
  activeTab: string = 'info';
  isLoading: boolean = false;
  isError: boolean = false;
  errorMessage: string = '';
  
  reviews: any[] = [];
  isLoadingReviews: boolean = false;
  
  newReview = { score: 0, comment: '' };

  currentUserId: number = 0;
  currentUserRole: number = 0; 
  hasReviewed: boolean = false;
  ownerInfo: any = null;
  dormStatusList: any[] = [];

  // ✅ Lightbox สำหรับขยายรูป — ใช้ได้ทั้งรูปหน้าหอและรูปแกลเลอรี
  isLightboxOpen: boolean = false;
  lightboxImages: string[] = [];
  lightboxIndex: number = 0;

  get lightboxCurrentImage(): string {
    return this.lightboxImages[this.lightboxIndex] || '';
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private dormService: DormitoryService, 
    private toastCtrl: ToastController,
    private alertCtrl: AlertController, 
    private cdr: ChangeDetectorRef,
    private modalCtrl: ModalController
  ) { 
    addIcons({ 
      star, 'star-half': starHalf, 'star-outline': starOutline, arrowBack, 'location-sharp': locationSharp,
      'location-outline': locationOutline, 'call-outline': callOutline, 
      wifi, car, snow, 'checkmark-circle-outline': checkmarkCircleOutline,
      'person-circle': personCircle, 'time-outline': timeOutline, send,
      person, 'logo-facebook': logoFacebook, 'logo-instagram': logoInstagram, 
      'chatbubble-ellipses': chatbubbleEllipses, 'bed-outline': bedOutline,
      'image-outline': imageOutline,
      'navigate-circle-outline': navigateCircleOutline, 'water-outline': waterOutline, 'flash-outline': flashOutline,
      'logo-twitter': logoTwitter, 'paper-plane': paperPlane,
      'document-text-outline': documentTextOutline, call,
      'alert-circle-outline': alertCircleOutline,
      close, 'chevron-back-outline': chevronBackOutline, 'chevron-forward-outline': chevronForwardOutline,
      'expand-outline': expandOutline
    , eye, bookmark, bookmarkOutline});
  }

  ngOnInit() {
    this.fetchDormStatuses();
    const storedData = localStorage.getItem('loggedIn');
    if (storedData) {
      try {
        const userObj = JSON.parse(storedData);
        if (userObj) {
          this.currentUserId = userObj.id || userObj.USER_ID || 0;
          this.currentUserRole = userObj.role_id || userObj.ROLE_TYPE_ID || userObj.role_type_id || 0;
        }
      } catch (e) { console.error('Error parsing user data'); }
    }

    // ✅ กลับมาใช้ snapshot แบบเดิม (synchronous, อ่านค่าทันทีไม่ต้องพึ่ง observable emit)
    // เวอร์ชัน subscribe ก่อนหน้านี้ทำให้ production build บางกรณีไม่ trigger callback เลย
    this.isError = false;
    this.errorMessage = '';

    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      this.loadDormDetail(Number(idParam));
    } else if (this.dormData) {
      this.prepareOwnerInfo();
      this.parseFacilities();
      this.loadReviews();
    }
  }

  fetchDormStatuses() {
    this.dormService.getDormStatuses().subscribe({
      next: (res: any) => this.dormStatusList = res.data || res,
      error: () => console.error('Failed to load dorm statuses')
    });
  }

  get waterDetail(): string {
    if (!this.dormData) return 'กำลังโหลด...';
    const lump = Number(this.dormData.water_lump || this.dormData.WATER_LUMP || 0);
    const unit = Number(this.dormData.water_unit || this.dormData.WATER_UNIT || 0);
    
    if (lump > 0 && unit > 0) return `เหมา ${lump} บ./ด. หรือ ${unit} บ./หน่วย`;
    if (lump > 0) return `เหมาจ่าย ${lump} บ./เดือน`;
    if (unit > 0) return `${unit} บาท/หน่วย`;
    return 'จ่ายตามบิลรัฐฯ / สอบถาม';
  }

  get electDetail(): string {
    if (!this.dormData) return 'กำลังโหลด...';
    const unit = Number(this.dormData.elect_unit || this.dormData.ELECT_UNIT || 0);
    
    if (unit > 0) return `${unit} บาท/หน่วย`;
    return 'จ่ายตามบิลรัฐฯ / สอบถาม';
  }

  async loadDormDetail(id: number) {
    this.isLoading = true;
    this.isError = false;
    this.errorMessage = '';
    this.dormData = null;
    this.cdr.detectChanges();

    let timeoutTriggered = false;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        timeoutTriggered = true;
        reject(new Error('TIMEOUT'));
      }, 12000);
    });

    try {
      const res: any = await Promise.race([
        this.dormService.getDormById(id),
        timeoutPromise
      ]);

      if (res && res.data) {
        const apiData = res.data;
        this.dormData = Array.isArray(apiData) ? apiData[0] : apiData;

        const formatImageUrl = (url: string | null | undefined): string | null => {
            return url || null;
        };
        
        if (this.dormData.image) this.dormData.image = formatImageUrl(this.dormData.image);
        if (this.dormData.FRONT_DORM_IMAGE) this.dormData.FRONT_DORM_IMAGE = formatImageUrl(this.dormData.FRONT_DORM_IMAGE);

        // ✅ รวมรูปส่วนต่างๆ ของห้องพักเข้าไปใน gallery เพื่อให้แสดงผลในหน้า detail
        const roomImages = [
          this.dormData.ceiling_img, 
          this.dormData.wall_img, 
          this.dormData.floor_img, 
          this.dormData.bathroom_img, 
          this.dormData.balcony_img
        ].filter(img => img).map(img => formatImageUrl(img));
        
        if (!this.dormData.gallery) this.dormData.gallery = [];
        this.dormData.gallery = [...this.dormData.gallery.map((img: any) => formatImageUrl(img)), ...roomImages];

        this.prepareOwnerInfo();
        this.parseFacilities();
        this.loadReviews();
        this.checkFavoriteStatus();
        
        // 🌐 บันทึกยอดวิวหอพัก
        if (id) {
          this.dormService.recordDormView(Number(id));
        }

      } else {
        this.isError = true;
        this.errorMessage = 'ไม่พบข้อมูลหอพัก';
      }
    } catch (error: any) {
      this.isError = true;
      if (timeoutTriggered || error?.message === 'TIMEOUT') {
        this.errorMessage = 'โหลดข้อมูลไม่ได้\nกรุณากด "ลองใหม่" อีกครั้ง';
      } else if (error?.status === 0) {
        this.errorMessage = 'ไม่สามารถเชื่อมต่อ Server ได้';
      } else if (error?.status === 404) {
        this.errorMessage = 'ไม่พบข้อมูลหอพักนี้';
      } else if (error?.status === 500) {
        this.errorMessage = 'Server Error กรุณาลองใหม่';
      } else {
        this.errorMessage = 'เกิดข้อผิดพลาด กรุณาลองใหม่';
      }
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  prepareOwnerInfo() {
    if (this.dormData) {
      this.ownerInfo = {
        firstName: this.dormData.FIRST_NAME || 'ไม่ระบุ',
        lastName: this.dormData.LAST_NAME || '',
        phone: this.dormData.phone || this.dormData.OWNER_PHONE || '-',
        line: this.dormData.line || this.dormData.OWNER_LINE || '-',
        facebook: this.dormData.facebook || this.dormData.OWNER_FACEBOOK || '-',
        instagram: this.dormData.instagram || this.dormData.OWNER_INSTAGRAM || '-',
        x: this.dormData.x || this.dormData.OWNER_X || '-',
        telegram: this.dormData.telegram || this.dormData.OWNER_TELEGRAM || '-',
      };
    }
  }

  async checkFavoriteStatus() {
    if (this.currentUserId > 0 && this.dormData?.DORM_ID) {
      try {
        const favs = await this.dormService.getMyFavorites(this.currentUserId);
        if (favs) {
          const found = favs.find((f: any) => f.DORM_ID === this.dormData.DORM_ID || f.DORMID === this.dormData.DORM_ID);
          this.isFavorite = !!found;
        }
      } catch (err) {
        console.error('Error checking favorite status', err);
      }
    }
  }

  async toggleFavorite(event?: Event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    if (this.currentUserId <= 0) {
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

    if (this.currentUserRole == 2 || this.currentUserRole == 3) {
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

    const dId = this.dormData.DORM_ID || this.dormData.id;

    if (this.isFavorite) {
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
                await this.dormService.removeFavorite(this.currentUserId, dId);
                this.isFavorite = false;
                this.cdr.detectChanges();
                this.showToast('ลบออกจากรายการสนใจแล้ว', 'success');
            } catch (err) { this.showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'danger'); }
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
            this.isFavorite = true;
            this.cdr.detectChanges();
            this.showToast('เพิ่มในรายการสนใจแล้ว', 'success');
        } catch (err: any) {
            if (err.status === 409 || (err.error && err.error.message === 'Duplicate')) {
                this.isFavorite = true;
                this.cdr.detectChanges();
                this.showToast('หอพักนี้อยู่ในรายการสนใจอยู่แล้วครับ', 'warning');
            } else {
                this.showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'danger');
            }
        }
    }
  }

  switchTab(tab: string) { 
    this.activeTab = tab; 
    this.cdr.detectChanges(); 
  }

  parseFacilities() {
    this.facilitiesList = [];
    if (!this.dormData) return;
    const facData = this.dormData.facilities || this.dormData.FACILITIES || this.dormData.facility;
    if (!facData || facData === 'null') return;

    if (Array.isArray(facData)) {
      this.facilitiesList = facData.map((f: any) => {
        if (typeof f === 'string') return { name: f, icon: '' };
        return { name: f.name || f.FAC_TYPE_NAME || '', icon: f.icon || f.FAC_TYPE_ICON || '' };
      });
    } else if (typeof facData === 'string') {
      this.facilitiesList = facData.split(',').map((s: string) => ({ name: s.trim(), icon: '' }));
    }
  }

  async loadReviews() {
    if (!this.dormData || !this.dormData.DORM_ID) return;
    this.isLoadingReviews = true;
    this.cdr.detectChanges();

    try {
      const res = await this.dormService.getReviewsByDormId(this.dormData.DORM_ID);
      
      if (res && res.data) {
        this.reviews = res.data;
        if (this.currentUserId > 0) {
          const myReview = this.reviews.find((r: any) => r.USER_ID === this.currentUserId);
          this.hasReviewed = !!myReview; 
        }
      }
    } catch (error) { 
      console.error('Load reviews failed', error); 
    } finally { 
      this.isLoadingReviews = false; 
      this.cdr.detectChanges(); 
    }
  }

  setRating(score: number) { 
    this.newReview.score = score; 
    this.cdr.detectChanges();
  }

  async submitReview() {
    if (this.newReview.score === 0) {
      this.showToast('กรุณาให้คะแนนดาวก่อนส่งรีวิว', 'warning'); return;
    }
    
    const alert = await this.alertCtrl.create({
      header: 'ยืนยันการรีวิว',
      message: 'คุณต้องการส่งรีวิวนี้ใช่หรือไม่? ข้อควรระวัง:หากรีวิวถูกส่งไปแล้ว จะไม่สามารถแก้ไขหรือลบได้ในภายหลัง',
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        { text: 'ยืนยัน', handler: () => { this.processSubmitReview(); } }
      ]
    });
    
    await alert.present();
  }

  async processSubmitReview() {
    try {
      await this.dormService.addReview(this.currentUserId, this.dormData.DORM_ID, this.newReview.score, this.newReview.comment);
      this.showToast('ขอบคุณสำหรับการรีวิว!', 'success');
      this.newReview = { score: 0, comment: '' };
      this.loadReviews(); 
    } catch (error: any) {
      const msg = error.error?.message || 'ส่งรีวิวไม่สำเร็จ';
      this.showToast(msg, 'danger');
    }
  }

  // ✅ เปิด Lightbox ขยายรูป — รองรับทั้งรูปหน้าหอ (เดี่ยว) และรูปแกลเลอรี (เลื่อนซ้าย-ขวาได้)
  viewImage(imgUrl: string) {
    const gallery: string[] = (this.dormData?.gallery && this.dormData.gallery.length > 0)
      ? this.dormData.gallery
      : [];

    const heroImg = this.dormData?.image || 'assets/dorm-placeholder.jpg';

    // รวมรูปหน้าหอ + แกลเลอรีเป็นชุดเดียว ไม่ซ้ำกัน เพื่อเลื่อนดูต่อเนื่องได้
    const allImages = [heroImg, ...gallery].filter((img, idx, arr) => img && arr.indexOf(img) === idx);

    this.lightboxImages = allImages.length > 0 ? allImages : [imgUrl];
    const foundIndex = this.lightboxImages.indexOf(imgUrl);
    this.lightboxIndex = foundIndex >= 0 ? foundIndex : 0;
    this.isLightboxOpen = true;
    this.cdr.detectChanges();
  }

  closeLightbox() {
    this.isLightboxOpen = false;
  }

  nextLightboxImage(event?: Event) {
    event?.stopPropagation();
    if (this.lightboxImages.length === 0) return;
    this.lightboxIndex = (this.lightboxIndex + 1) % this.lightboxImages.length;
  }

  prevLightboxImage(event?: Event) {
    event?.stopPropagation();
    if (this.lightboxImages.length === 0) return;
    this.lightboxIndex = (this.lightboxIndex - 1 + this.lightboxImages.length) % this.lightboxImages.length;
  }

  getStarsArray(score: number): number[] {
    return Array(5).fill(0).map((_, i) => i < Math.round(score) ? 1 : 0);
  }

  get averageScore(): number {
    const rawScore = this.dormData?.SCORE || this.dormData?.score || 0;
    return parseFloat(rawScore);
  }

  goBack() {
    this.navCtrl.back();
  }

  confirmPreview() {
    if (this.isPopup) {
      this.modalCtrl.dismiss(null, 'confirm');
    }
  }

  cancelPreview() {
    if (this.isPopup) {
      this.modalCtrl.dismiss(null, 'cancel');
    }
  }

  retryLoad() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.loadDormDetail(Number(idParam));
    }
  }

  async showToast(msg: string, color: string, duration: number = 2000) {
    const toast = await this.toastCtrl.create({ message: msg, duration: duration, color: color, position: 'bottom' });
    toast.present();
  }

  goToNavigate() {
    const d = this.dormData;
    const targetLat = Number(d.lat || d.LATITUDE || d.latitude || d.LAT || 0);
    const targetLng = Number(d.lng || d.LONGITUDE || d.longitude || d.LNG || 0);
    const dormId = d.DORM_ID || d.id || d.dorm_id;

    if (!targetLat || !targetLng) {
      console.error('Missing coordinates in dormData:', d);
      this.showToast('ไม่พบข้อมูลพิกัดของหอพักนี้', 'warning');
      return;
    }

    this.router.navigate(['/home'], {
      queryParams: { navLat: targetLat, navLng: targetLng, dormId: dormId }
    });
  }
}