import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import Swal from 'sweetalert2';
import { addIcons } from 'ionicons';
import { 
  people, folderOpenOutline, close, logoFacebook, chatbubbles, 
  checkmarkCircle, closeCircle, time, logoInstagram, logoTwitter, paperPlane 
} from 'ionicons/icons'; // ✅ เพิ่ม paperPlane สำหรับ Telegram
import { OwnerRequestService, OwnerRequest } from '../../services/owner-request';

@Component({
  selector: 'app-manage-requests-dorm-owner',
  templateUrl: './manage-requests-dorm-owner.page.html',
  styleUrls: ['./manage-requests-dorm-owner.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ManageRequestsDormOwnerPage implements OnInit {

  requests: OwnerRequest[] = [];
  filteredRequests: OwnerRequest[] = [];
  isLoading = false;
  isModalOpen = false;
  selectedReq: OwnerRequest | null = null;
  searchQuery: string = '';

  constructor(
    private requestService: OwnerRequestService
  ) { 
    // เพิ่มไอคอนให้ครบ
    addIcons({ people, folderOpenOutline, close, logoFacebook, chatbubbles, checkmarkCircle, closeCircle, time, logoInstagram, logoTwitter, paperPlane });
  }

  ngOnInit() {}

  ionViewWillEnter() {
    this.fetchRequests();
  }

  async fetchRequests() {
    this.isLoading = true;
    this.requestService.getAllRequests().subscribe({
      next: (res) => {
        // กรองคำขอที่ซ้ำซ้อนโดยใช้ user_id
        const uniqueRequests = res.filter((req, index, self) =>
          index === self.findIndex((t) => (
            t.user_id === req.user_id
          ))
        );
        this.requests = uniqueRequests;
        this.filteredRequests = uniqueRequests;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error:', err);
        this.isLoading = false;
      }
    });
  }

  searchRequests() {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredRequests = [...this.requests];
    } else {
      this.filteredRequests = this.requests.filter(req => {
        const fullName = `${req.first_name || ''} ${req.last_name || ''}`.toLowerCase();
        const phone = req.phone_number || '';
        return fullName.includes(query) || phone.includes(query);
      });
    }
  }

  
  handleImageError(event: any) {
    event.target.onerror = null; 
    event.target.src = 'https://placehold.co/150x150?text=No+Image';
  }

  getStatusLabel(status: string): string {
    switch(status) {
      case 'approved': return 'อนุมัติแล้ว';
      case 'rejected': return 'ปฏิเสธแล้ว';
      default: return 'รอการตรวจสอบ';
    }
  }

  openDetailModal(req: OwnerRequest) {
    this.selectedReq = req;
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedReq = null;
  }

  async updateStatus(req: OwnerRequest, status: 'approved' | 'rejected') {
    if (status === 'approved') {
      await this.showApproveAlert(req);
    } else {
      await this.showRejectAlert(req);
    }
  }

  async showApproveAlert(req: OwnerRequest) {
    this.closeModal(); // ปิด Modal ป้องกันบั๊ก Focus

    const result = await Swal.fire({
      title: 'ยืนยันการอนุมัติ',
      text: `คุณต้องการให้สิทธิ์คุณ ${req.first_name} เป็นเจ้าของหอพักใช่หรือไม่?`,
      icon: 'question',
      heightAuto: false,
      showCancelButton: true,
      confirmButtonColor: '#111',
      cancelButtonColor: '#d33',
      confirmButtonText: 'ยืนยันอนุมัติ',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
      customClass: {
        popup: 'swal-custom-popup',
        title: 'swal-custom-title',
        confirmButton: 'swal-custom-confirm'
      }
    });

    if (result.isConfirmed) {
      this.processUpdate(req.user_id, true, '');
    } else {
      this.openDetailModal(req); // เปิด Modal คืนถ้ากดยกเลิก
    }
  }

  async showRejectAlert(req: OwnerRequest) {
    this.closeModal(); // ปิด Modal ก่อนเพื่อไม่ให้ Ionic บล็อกการพิมพ์ (Focus trap)

    const result = await Swal.fire({
      title: 'ปฏิเสธคำขอ',
      text: 'กรุณาระบุเหตุผลที่ไม่อนุมัติคำขอนี้',
      icon: 'warning',
      heightAuto: false,
      input: 'textarea',
      inputPlaceholder: 'ระบุเหตุผล...',
      showCancelButton: true,
      confirmButtonColor: '#C62828',
      cancelButtonColor: '#777',
      confirmButtonText: 'ยืนยันปฏิเสธ',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
      inputValidator: (value) => {
        if (!value || value.trim() === '') {
          return 'กรุณาระบุเหตุผลในการปฏิเสธคำขอ!';
        }
        return null;
      },
      customClass: {
        popup: 'swal-custom-popup',
        title: 'swal-custom-title',
        confirmButton: 'swal-custom-confirm-danger'
      }
    });

    if (result.isConfirmed) {
      const msg = result.value.trim();
      this.processUpdate(req.user_id, false, msg);
    } else {
      this.openDetailModal(req); // เปิด Modal คืนถ้ากดยกเลิก
    }
  }

  async processUpdate(userId: number, approveStatus: boolean, msg: string) {
    Swal.fire({
      title: 'กำลังดำเนินการ...',
      allowOutsideClick: false,
      heightAuto: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.requestService.approveRequest(userId, approveStatus, msg).subscribe({
      next: async () => {
        // ลบข้อมูลที่ดำเนินการแล้วออกจากหน้ารายการทันที
        this.requests = this.requests.filter(req => req.user_id !== userId);
        this.searchRequests(); // อัปเดต list ที่แสดงผล
        this.closeModal();

        await Swal.fire({
          icon: 'success',
          title: approveStatus ? 'อนุมัติสำเร็จ!' : 'ปฏิเสธสำเร็จ!',
          text: approveStatus 
            ? 'คำขอถูกอนุมัติและอัปเดตสิทธิ์เรียบร้อยแล้ว' 
            : 'คำขอถูกปฏิเสธเรียบร้อยแล้ว',
          confirmButtonColor: '#111',
          timer: 2000,
          showConfirmButton: false,
          heightAuto: false
        });
      },
      error: async (err) => {
        await Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
          confirmButtonColor: '#C62828',
          heightAuto: false
        });
      }
    });
  }
}