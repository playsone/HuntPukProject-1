import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, 
  IonButtons, IonButton, IonIcon, IonSpinner, IonSearchbar,
  AlertController, ToastController, LoadingController 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBack, create, trash, refresh, search, person, add, list, 
  listOutline, businessOutline, personOutline, settingsOutline, 
  searchOutline, closeCircle, addOutline, chatbubbleOutline, 
  createOutline, trashOutline, refreshOutline, eyeOutline 
} from 'ionicons/icons'; 
import { Router, ActivatedRoute } from '@angular/router';
import { DormitoryService } from '../../services/dormitory'; 
import { chatbubbleEllipses } from 'ionicons/icons'; 

@Component({
  selector: 'app-manage-dorm',
  templateUrl: './manage-dorm.page.html',
  styleUrls: ['./manage-dorm.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, 
    IonButtons, IonButton, IonIcon, IonSpinner, IonSearchbar,
    CommonModule, FormsModule
  ]
})
export class ManageDormPage implements OnInit {

  dorms: any[] = []; 
  filteredDorms: any[] = []; // Search & Filter
  searchQuery: string = '';
  statusFilterQuery: string = '';
  typeFilterQuery: string = '';
  zoneFilterQuery: string = '';
  isLoading = false;

  constructor(
    private dormService: DormitoryService,
    private router: Router,
    private route: ActivatedRoute,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) { 
    // ✅ ลงทะเบียน Icons ให้ครบ (รวมถึง add สำหรับปุ่มเพิ่ม)
    addIcons({ 
      arrowBack, create, trash, refresh, search, person, add, list, 
      listOutline, businessOutline, personOutline, settingsOutline, 
      searchOutline, closeCircle, addOutline, chatbubbleOutline, 
      createOutline, trashOutline, refreshOutline, chatbubbleEllipses, eyeOutline 
    });
  }

  private hasLoadedOnce = false;

  ngOnInit() {
    this.initData();
  }

  ionViewWillEnter() {
    if (!this.hasLoadedOnce) return; // Prevent double firing on initial load
    this.initData();
  }

  initData() {
    // Read queryParams from dashboard navigation
    const params = this.route.snapshot.queryParams;
    if (params['search']) {
      this.searchQuery = params['search'];
    } else if (params['statusFilter']) {
      this.statusFilterQuery = params['statusFilter'];
    } else if (params['typeFilter']) {
      this.typeFilterQuery = params['typeFilter'];
    } else if (params['zoneFilter']) {
      this.zoneFilterQuery = params['zoneFilter'];
    }
    
    this.loadAllDorms();
    this.hasLoadedOnce = true;
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
  
  clearFilters() {
    this.statusFilterQuery = '';
    this.typeFilterQuery = '';
    this.zoneFilterQuery = '';
    // Use replaceUrl to remove query params from URL without adding to history
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { statusFilter: null, typeFilter: null, zoneFilter: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
    this.loadAllDorms();
  }
  goToReviews(dormId: number) {
    this.router.navigate(['/manage-reviews', dormId]);
  }

  // ดูข้อมูลหอพัก (ไม่ใช่ edit)
  goToDormDetail(dormId: number) {
    this.router.navigate(['/dorm-detail', dormId]);
  }
  // ไปหน้าเพิ่มหอพัก
  goToAddDorm() {
    this.router.navigate(['/dorm-form'], { queryParams: { from: 'manage-dorm' } }); 
  }

  async loadAllDorms() {
    this.isLoading = true;
    try {
      // ✅ เรียก API ฝั่ง Admin เพื่อดึงข้อมูลครบถ้วน (รวมที่ปิดปรับปรุง + ชื่อเจ้าของ)
      const res = await this.dormService.getAllDormsAdmin();
      
      if (res && res.data) {
        this.dorms = res.data;
        this.filteredDorms = res.data;
        this.onSearchChange(this.searchQuery); // Apply existing search if any
      }
    } catch (error) {
      console.error('Load Error:', error);
      this.showToast('ไม่สามารถโหลดข้อมูลได้', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  onSearchChange(event: any) {
    if (event !== undefined && event !== null && typeof event !== 'string' && event.target) {
      this.searchQuery = (event.target.value || '').trim().toLowerCase();
    } else if (typeof event === 'string') {
      this.searchQuery = event.trim().toLowerCase();
    }

    let temp = this.dorms;

    // Filter by Search Query
    if (this.searchQuery) {
      temp = temp.filter(d => 
        (d.DORM_NAME && d.DORM_NAME.toLowerCase().includes(this.searchQuery)) ||
        (d.owner_name && d.owner_name.toLowerCase().includes(this.searchQuery)) ||
        (d.FIRST_NAME && d.FIRST_NAME.toLowerCase().includes(this.searchQuery)) ||
        (d.LAST_NAME && d.LAST_NAME.toLowerCase().includes(this.searchQuery))
      );
    }

    // Filter by Status Query from Dashboard
    if (this.statusFilterQuery) {
      temp = temp.filter(d => d.DORM_STATUS_NAME === this.statusFilterQuery);
    }

    if (this.typeFilterQuery) {
      temp = temp.filter(d => d.DORM_TYPE_NAME === this.typeFilterQuery);
    }

    if (this.zoneFilterQuery) {
      temp = temp.filter(d => d.ZONE_NAME === this.zoneFilterQuery);
    }

    this.filteredDorms = temp;
  }

  // ไปหน้าแก้ไขหอพัก
  goToDetail(dormId: number) {
    this.router.navigate(['/edit-dorm', dormId], { queryParams: { from: 'manage-dorm' } }); 
  }

  // ฟังก์ชันลบ (soft delete — เปลี่ยนสถานะเป็น 4 ยังกู้คืนได้)
  async confirmRemove(dorm: any) {
    const alert = await this.alertCtrl.create({
      header: '🗑️ ลบหอพักออกจากระบบ',
      message: `หอพัก "${dorm.DORM_NAME}" จะถูกลบออกจากระบบและไม่สามารถกู้คืนได้\n\nยืนยันการลบ?`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'ลบ',
          role: 'destructive',
          handler: () => {
            this.executeRemove(dorm.DORM_ID);
          }
        }
      ]
    });
    await alert.present();
  }

  async executeRemove(id: number) {
    const loading = await this.loadingCtrl.create({ message: 'กำลังดำเนินการ...' });
    await loading.present();
    try {
      await this.dormService.changeDormStatus(id, 4); // soft delete
      this.showToast('ลบหอพักออกจากระบบแล้ว (กู้คืนได้)', 'success');
      this.loadAllDorms();
    } catch (error) {
      this.showToast('เกิดข้อผิดพลาดในการลบ', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  // ฟังก์ชันกู้คืน
  async confirmRestore(dorm: any) {
    const alert = await this.alertCtrl.create({
      header: 'ยืนยันการกู้คืน',
      message: `คุณต้องการเปิดสถานะหอพัก "${dorm.DORM_NAME}" กลับมาใช่หรือไม่?`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'กู้คืน',
          handler: () => {
            this.executeRestore(dorm.DORM_ID);
          }
        }
      ]
    });
    await alert.present();
  }

  async executeRestore(id: number) {
    const loading = await this.loadingCtrl.create({ message: 'กำลังดำเนินการ...' });
    await loading.present();
    try {
      await this.dormService.restoreDorm(id);
      this.showToast('กู้คืนหอพักเรียบร้อย', 'success');
      this.loadAllDorms(); // โหลดใหม่เพื่ออัปเดตสถานะในตาราง
    } catch (error) {
      this.showToast('เกิดข้อผิดพลาดในการกู้คืน', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  async changeStatus(dorm: any, newStatusId: number) {
    if (dorm.DORM_STATUS_ID === newStatusId) return;

    const loading = await this.loadingCtrl.create({ message: 'กำลังเปลี่ยนสถานะ...' });
    await loading.present();
    try {
      await this.dormService.changeDormStatus(dorm.DORM_ID, newStatusId);
      dorm.DORM_STATUS_ID = newStatusId;
      this.showToast('เปลี่ยนสถานะสำเร็จ', 'success');
    } catch (error) {
      this.showToast('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ', 'danger');
      this.loadAllDorms();
    } finally {
      loading.dismiss();
    }
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: msg, duration: 2000, color: color, position: 'bottom'
    });
    toast.present();
  }
}