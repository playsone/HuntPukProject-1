import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, 
  IonButtons, IonButton, IonIcon, IonSpinner,
  IonSegment, IonSegmentButton, IonLabel, IonBadge, IonTextarea, IonSearchbar,
  IonSelect, IonSelectOption, AlertController, ToastController, NavController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBack, person, business, calendar, checkmarkCircle, closeCircle, 
  eye, eyeOff, folderOpenOutline, mail, call, location, documentText, time,
  bulbOutline, chatboxEllipsesOutline, trashOutline, refreshOutline,
  chevronDownOutline, chevronUpOutline, imagesOutline, bedOutline,
  checkmarkCircleOutline, water, flash, homeOutline, alertCircleOutline,
  sendOutline, closeOutline
} from 'ionicons/icons';
import { Router } from '@angular/router';
import { DormitoryService } from '../../services/dormitory'; 

@Component({
  selector: 'app-manage-requests-createdorm',
  templateUrl: './manage-requests-createdorm.page.html',
  styleUrls: ['./manage-requests-createdorm.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, 
    IonButtons, IonButton, IonIcon, IonSpinner,
    IonSegment, IonSegmentButton, IonLabel, IonBadge, IonTextarea, IonSearchbar,
    IonSelect, IonSelectOption,
    CommonModule, FormsModule
  ],
  providers: [DatePipe] 
})
export class ManageRequestsCreatedormPage implements OnInit {

  requests: any[] = [];
  isLoading = false;
  searchQuery = '';
  statusFilter = 'all'; // all | 0 | 2 | 4 | 1

  // Expanded detail state
  expandedDormId: number | null = null;
  expandedDormData: any = null;
  isLoadingDetail: boolean = false;
  isLightboxOpen = false;
  lightboxImage: string | null = null;

  constructor(
    private dormService: DormitoryService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private router: Router,
    private navCtrl: NavController
  ) { 
    addIcons({ 
      arrowBack, person, business, calendar, checkmarkCircle, 
      closeCircle, eye, eyeOff, folderOpenOutline, mail, call, location, 
      documentText, time, bulbOutline, chatboxEllipsesOutline, trashOutline,
      refreshOutline, chevronDownOutline, chevronUpOutline, imagesOutline,
      bedOutline, checkmarkCircleOutline, water, flash, homeOutline, 
      alertCircleOutline, sendOutline, closeOutline
    });
  }

  isFacImage(fac: any): boolean {
    const iconPath = fac?.FAC_TYPE_ICON || fac?.icon || '';
    return iconPath.includes('/') || iconPath.includes('.png');
  }

  getFacIconPath(fac: any): string {
    let iconPath = fac?.FAC_TYPE_ICON || fac?.icon || '';
    if (!iconPath) return '';
    if (iconPath.startsWith('assets/icon/')) {
      return iconPath.replace('assets/icon/', 'assets/allIcons/');
    }
    return iconPath;
  }

  ngOnInit() { }

  ionViewWillEnter() {
    this.loadAllRequests();
  }

  goBack() {
    this.navCtrl.navigateBack(['/dashboard']); 
  }

  // ====== Load all requests ======
  async loadAllRequests() {
    this.isLoading = true;
    try {
      const res = await this.dormService.getPendingRequests();
      if (res && res.data) {
        // กรองคำขอที่ซ้ำซ้อน (ชื่อหอพัก + ไอดีเจ้าของหอพัก เดียวกัน) เลือกอันใหม่สุด (DORM_ID มากสุด)
        const uniqueMap = new Map<string, any>();
        for (const req of res.data) {
          const key = `${req.DORM_NAME}_${req.DORM_OWNER_ID}`;
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, req);
          } else {
            const existing = uniqueMap.get(key);
            if (req.DORM_ID > existing.DORM_ID) {
              uniqueMap.set(key, req);
            }
          }
        }
        
        let uniqueList = Array.from(uniqueMap.values());
        
        // เรียงลำดับความสำคัญของสถานะ: 0 (รออนุมัติ) -> 3 (ยื่นตรวจสอบใหม่) -> 2 (ปฏิเสธ) -> 1 (อนุมัติแล้ว)
        const statusOrder: { [key: number]: number } = { 0: 1, 3: 2, 2: 3, 1: 4 };
        uniqueList.sort((a, b) => {
          const orderA = statusOrder[a.REQ_STATUS] || 99;
          const orderB = statusOrder[b.REQ_STATUS] || 99;
          if (orderA !== orderB) return orderA - orderB;
          return new Date(b.REG_AT).getTime() - new Date(a.REG_AT).getTime();
        });

        this.requests = uniqueList;
      } else {
        this.requests = [];
      }
    } catch (error) {
      console.error('Load Error:', error);
      this.showToast('โหลดข้อมูลหอพักล้มเหลว', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  // ====== Filter requests by search and status ======
  get filteredRequests(): any[] {
    let filtered = this.requests;
    
    // Filter by status
    if (this.statusFilter !== 'all') {
      const statusNum = parseInt(this.statusFilter, 10);
      filtered = filtered.filter(r => r.REQ_STATUS === statusNum);
    }

    // Filter by search query
    if (this.searchQuery) {
      const lowerQ = this.searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        (r.DORM_NAME && r.DORM_NAME.toLowerCase().includes(lowerQ)) ||
        (r.FIRST_NAME && r.FIRST_NAME.toLowerCase().includes(lowerQ)) ||
        (r.LAST_NAME && r.LAST_NAME.toLowerCase().includes(lowerQ))
      );
    }
    
    return filtered;
  }

  getReqStatusLabel(status: any): string {
    switch(Number(status)) {
      case 0: return 'รออนุมัติ';
      case 1: return 'อนุมัติแล้ว';
      case 2: return 'ปฏิเสธ';
      case 3: return 'ยื่นตรวจสอบใหม่';
      default: return 'ไม่ทราบสถานะ';
    }
  }

  getReqStatusColor(status: any): string {
    switch(Number(status)) {
      case 0: return 'warning';
      case 1: return 'success';
      case 2: return 'danger';
      case 3: return 'warning';
      default: return 'medium';
    }
  }

  // ====== Toggle expand detail ======
  async toggleDetail(item: any) {
    if (this.expandedDormId === item.DORM_ID) {
      // ปิด
      this.expandedDormId = null;
      this.expandedDormData = null;
      return;
    }

    // เปิดและโหลดข้อมูลเต็ม
    this.expandedDormId = item.DORM_ID;
    this.expandedDormData = null;
    this.isLoadingDetail = true;
    
    try {
      const res = await this.dormService.getDormById(item.DORM_ID);
      const fullDorm = (res && res.data && Array.isArray(res.data)) ? res.data[0] : (res?.data || item);
      this.expandedDormData = { ...item, ...fullDorm };
    } catch (error) {
      console.error('Fetch Detail Error:', error);
      this.expandedDormData = { ...item }; // fallback
    } finally {
      this.isLoadingDetail = false;
    }
  }

  isExpanded(dormId: number): boolean {
    return this.expandedDormId === dormId;
  }

  // ====== Actions ======
  async approve(item: any) {
    const alert = await this.alertCtrl.create({
      header: 'ยืนยันการอนุมัติ',
      message: `คุณต้องการอนุมัติหอพัก "${item.DORM_NAME}" ให้แสดงในระบบใช่หรือไม่?`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'อนุมัติเลย',
          handler: () => { this.processRequest(item.DORM_ID, true, ''); }
        }
      ]
    });
    await alert.present();
  }

  async reject(item: any) {
    const alert = await this.alertCtrl.create({
      header: 'ปฏิเสธคำขอ',
      message: `ระบุเหตุผลการปฏิเสธคำขอของหอพัก "${item.DORM_NAME}"`,
      inputs: [
        {
          name: 'reason',
          type: 'textarea',
          placeholder: 'ระบุเหตุผล (จำเป็น)...',
        }
      ],
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'ยืนยัน',
          handler: (data) => {
            if (!data.reason || !data.reason.trim()) {
              this.showToast('กรุณาระบุเหตุผลการปฏิเสธ', 'warning');
              return false; // ไม่ให้ปิด alert
            }
            this.processRequest(item.DORM_ID, false, data.reason.trim());
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async deleteRequest(item: any) {
    const alert = await this.alertCtrl.create({
      header: 'ลบคำขอออกจากระบบ',
      message: `ลบคำขอของหอพัก "${item.DORM_NAME}" ออกจากระบบถาวรหรือไม่? (เจ้าของหอจะต้องลงทะเบียนใหม่ถ้าต้องการ)`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'ลบออก',
          role: 'destructive',
          handler: () => { this.executeDelete(item.DORM_ID); }
        }
      ]
    });
    await alert.present();
  }

  // ====== Process ======
  async processRequest(dormId: number, isApprove: boolean, msg: string) {
    this.isLoading = true;
    try {
      await this.dormService.approveRequest(dormId, isApprove, msg);
      this.showToast(isApprove ? '✅ อนุมัติสำเร็จ' : '🚫 ปฏิเสธคำขอเรียบร้อย', 'success');
      this.expandedDormId = null;
      this.expandedDormData = null;
      await this.loadAllRequests();
    } catch (error: any) {
      const errMsg = error.error?.message || 'เกิดข้อผิดพลาด';
      this.showToast(errMsg, 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async executeDelete(dormId: number) {
    this.isLoading = true;
    try {
      await this.dormService.deletePendingRequest(dormId);
      this.showToast('🗑️ ลบคำขอเรียบร้อยแล้ว', 'success');
      if (this.expandedDormId === dormId) {
        this.expandedDormId = null;
        this.expandedDormData = null;
      }
      await this.loadAllRequests();
    } catch (error: any) {
      const errMsg = error.error?.message || 'เกิดข้อผิดพลาด';
      this.showToast(errMsg, 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  // ====== Lightbox ======
  viewImage(src: string) {
    if (!src) return;
    this.lightboxImage = src;
    this.isLightboxOpen = true;
  }
  closeLightbox() {
    this.isLightboxOpen = false;
  }

  // ====== Helpers ======
  getImages(dorm: any): string[] {
    const imgs = dorm?.GALLERY || dorm?.gallery || [];
    if (Array.isArray(imgs)) return imgs;
    return [];
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2500,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }
}