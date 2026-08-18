import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton,
  IonSegment, IonSegmentButton, IonLabel, IonList, IonItem, IonAvatar, IonImg,
  IonIcon, IonButton, IonAlert, ToastController, AlertController, IonItemSliding,
  IonItemOptions, IonItemOption, IonModal, IonInput, IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  checkmarkCircleOutline, closeCircleOutline, closeOutline, trashOutline, 
  createOutline, documentTextOutline, cubeOutline, cameraOutline, imageOutline, 
  informationCircleOutline, addCircleOutline, addOutline, searchOutline,
  pencilOutline, alertCircleOutline, checkmarkOutline, layersOutline
} from 'ionicons/icons';
import { DormitoryService } from '../../services/dormitory';
import { FacilityItem } from '../../model/dorm.model';

@Component({
  selector: 'app-facility-management',
  templateUrl: './facility-management.page.html',
  styleUrls: ['./facility-management.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton,
    IonSegment, IonSegmentButton, IonLabel, IonList, IonItem, IonAvatar, IonImg,
    IonIcon, IonButton, IonItemSliding, IonItemOptions, IonItemOption, IonModal, IonInput, IonSpinner,
    CommonModule, FormsModule
  ]
})
export class FacilityManagementPage implements OnInit {
  
  currentSegment = signal<'all' | 'requests'>('all');
  allFacilities = signal<FacilityItem[]>([]);
  facilityRequests = signal<FacilityItem[]>([]);
  isLoading = signal<boolean>(false);
  
  // ─── Edit Modal ───
  isEditModalOpen = signal<boolean>(false);
  editFacName = signal<string>('');
  editingFacId = signal<number | null>(null);
  editSelectedFile = signal<File | null>(null);
  editPreviewUrl = signal<string | null>(null);

  // ─── Add Modal ───
  isAddModalOpen = signal<boolean>(false);
  addFacName = signal<string>('');
  addSelectedFile = signal<File | null>(null);
  addPreviewUrl = signal<string | null>(null);

  // ─── Delete Confirm Modal ───
  isDeleteModalOpen = signal<boolean>(false);
  deletingFac = signal<FacilityItem | null>(null);

  constructor(
    private dormSv: DormitoryService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    addIcons({ 
      checkmarkCircleOutline, closeCircleOutline, closeOutline, trashOutline, 
      createOutline, documentTextOutline, cubeOutline, cameraOutline, imageOutline, 
      informationCircleOutline, addCircleOutline, addOutline, searchOutline,
      pencilOutline, alertCircleOutline, checkmarkOutline, layersOutline
    });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loadAllFacilities();
    this.loadFacilityRequests();
  }

  getIconPath(iconPath: string): string {
    if (!iconPath) return '';
    if (iconPath.startsWith('assets/icon/')) {
      return iconPath.replace('assets/icon/', 'assets/allIcons/');
    }
    return iconPath;
  }

  loadAllFacilities() {
    this.isLoading.set(true);
    this.dormSv.getFacilities().subscribe({
      next: (res: any) => {
        if (res && res.success && res.data) {
          this.allFacilities.set(res.data);
        } else if (Array.isArray(res)) {
          this.allFacilities.set(res);
        }
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error(err);
        this.allFacilities.set([]);
        this.isLoading.set(false);
      }
    });
  }

  loadFacilityRequests() {
    this.dormSv.getPendingFacilities().subscribe({
      next: (res: any) => {
        if (res && res.success && res.data) {
          this.facilityRequests.set(res.data);
        } else if (Array.isArray(res)) {
          this.facilityRequests.set(res);
        }
      },
      error: (err: any) => {
        console.error(err);
        this.facilityRequests.set([]);
      }
    });
  }

  segmentChanged(event: any) {
    this.currentSegment.set(event.detail.value);
  }

  handleImageError(fac: FacilityItem) {
    fac.FAC_TYPE_ICON = '';
  }

  // ─────────────────────────────────────────
  // ADD
  // ─────────────────────────────────────────
  openAddModal() {
    this.addFacName.set('');
    this.addSelectedFile.set(null);
    this.addPreviewUrl.set(null);
    this.isAddModalOpen.set(true);
  }

  selectAddImage(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.addSelectedFile.set(file);
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.addPreviewUrl.set(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  async saveAddFacility() {
    const trimmedName = this.addFacName().trim();
    if (!trimmedName) {
      this.showToast('กรุณากรอกชื่อสิ่งอำนวยความสะดวก', 'warning');
      return;
    }

    const exists = this.allFacilities().some(f => f.FAC_TYPE_NAME.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      const alert = await this.alertCtrl.create({
        header: 'เพิ่มไม่ได้',
        message: `มีสิ่งอำนวยความสะดวก <strong>${trimmedName}</strong> อยู่แล้วในระบบ`,
        buttons: ['ตกลง']
      });
      await alert.present();
      return;
    }

    const formData = new FormData();
    formData.append('fac_name', trimmedName);
    const file = this.addSelectedFile();
    if (file) {
      formData.append('icon', file);
    }

    this.dormSv.addFacility(formData).subscribe({
      next: () => {
        this.showToast('เพิ่มสิ่งอำนวยความสะดวกสำเร็จ', 'success');
        this.isAddModalOpen.set(false);
        this.loadData();
      },
      error: () => this.showToast('เกิดข้อผิดพลาดในการเพิ่ม', 'danger')
    });
  }

  // ─────────────────────────────────────────
  // EDIT
  // ─────────────────────────────────────────
  openEditModal(fac: FacilityItem) {
    this.editingFacId.set(fac.FAC_TYPE_ID);
    this.editFacName.set(fac.FAC_TYPE_NAME);
    this.editSelectedFile.set(null);
    this.editPreviewUrl.set(fac.FAC_TYPE_ICON || null);
    this.isEditModalOpen.set(true);
  }

  selectNativeImage(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.editSelectedFile.set(file);
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.editPreviewUrl.set(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  async saveEditFacility() {
    const facId = this.editingFacId();
    if (!facId) return;
    
    const trimmedName = this.editFacName().trim();
    if (!trimmedName) {
      this.showToast('กรุณากรอกชื่อสิ่งอำนวยความสะดวก', 'warning');
      return;
    }

    const exists = this.allFacilities().some(f => f.FAC_TYPE_ID !== facId && f.FAC_TYPE_NAME.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      const alert = await this.alertCtrl.create({
        header: 'บันทึกไม่ได้',
        message: `มีสิ่งอำนวยความสะดวก <strong>${trimmedName}</strong> อยู่แล้วในระบบ`,
        buttons: ['ตกลง']
      });
      await alert.present();
      return;
    }

    const formData = new FormData();
    formData.append('fac_id', facId.toString());
    formData.append('fac_name', trimmedName);
    
    const file = this.editSelectedFile();
    if (file) {
      formData.append('icon', file);
    }

    this.dormSv.updateFacility(formData, 1).subscribe({
      next: () => {
        this.showToast('อัปเดตข้อมูลสำเร็จ', 'success');
        this.isEditModalOpen.set(false);
        this.loadData();
      },
      error: () => this.showToast('เกิดข้อผิดพลาดในการอัปเดต', 'danger')
    });
  }

  // ─────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────
  openDeleteModal(fac: FacilityItem) {
    this.deletingFac.set(fac);
    this.isDeleteModalOpen.set(true);
  }

  confirmDelete() {
    const fac = this.deletingFac();
    if (!fac) return;
    this.isDeleteModalOpen.set(false);
    this.dormSv.deleteFacility(fac.FAC_TYPE_ID).subscribe({
      next: () => {
        this.showToast('ลบสิ่งอำนวยความสะดวกสำเร็จ', 'success');
        this.loadData();
      },
      error: () => this.showToast('เกิดข้อผิดพลาดในการลบ', 'danger')
    });
  }

  // ─────────────────────────────────────────
  // APPROVE / REJECT REQUESTS
  // ─────────────────────────────────────────
  async approveFacility(fac: FacilityItem) {
    const alert = await this.alertCtrl.create({
      header: 'ยืนยันการอนุมัติ',
      message: `คุณต้องการอนุมัติ "${fac.FAC_TYPE_NAME}" ใช่หรือไม่?`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        { 
          text: 'ยืนยัน', 
          handler: () => {
            this.dormSv.approveFacility(fac.FAC_TYPE_ID).subscribe({
              next: () => {
                this.showToast('อนุมัติสำเร็จ', 'success');
                this.loadData();
              },
              error: () => this.showToast('เกิดข้อผิดพลาดในการอนุมัติ', 'danger')
            });
          } 
        }
      ]
    });
    await alert.present();
  }

  async rejectFacility(fac: FacilityItem) {
    const alert = await this.alertCtrl.create({
      header: 'ยืนยันการปฏิเสธ',
      message: `คุณต้องการปฏิเสธคำร้องขอ "${fac.FAC_TYPE_NAME}" ใช่หรือไม่?`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        { 
          text: 'ยืนยัน', 
          handler: () => {
            this.dormSv.rejectFacility(fac.FAC_TYPE_ID).subscribe({
              next: () => {
                this.showToast('ปฏิเสธคำร้องขอสำเร็จ', 'success');
                this.loadData();
              },
              error: () => this.showToast('เกิดข้อผิดพลาดในการปฏิเสธ', 'danger')
            });
          } 
        }
      ]
    });
    await alert.present();
  }

  async deleteFacility(fac: FacilityItem) {
    this.openDeleteModal(fac);
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
