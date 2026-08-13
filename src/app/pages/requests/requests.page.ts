import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ViewWillEnter, AlertController } from '@ionic/angular'; // 🌟 เอา LoadingController ออกแล้ว
import { addIcons } from 'ionicons'; 

import { personOutline, callOutline, arrowBack, logoFacebook, chatbubbles, arrowForward, logoInstagram, logoTwitter, paperPlane, alertCircle, time, checkmarkCircle, image, cloudUploadOutline, camera, heartDislikeOutline, personCircleOutline } from 'ionicons/icons'; 

import { OwnerRequestService, UserDormOwnerReqPostReq } from '../../services/owner-request'; 
import { UserService } from '../../services/user';
import { Router } from '@angular/router';

@Component({
  selector: 'app-requests',
  templateUrl: './requests.page.html',
  styleUrls: ['./requests.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule] 
})
export class RequestsPage implements OnInit, ViewWillEnter {

  formData: UserDormOwnerReqPostReq = {
    user_id: 0, first_name: '', last_name: '', phone_number: '',
    facebook: '', line: '', instagram: '', x: '', telegram: ''
  };

  selectedFile: File | null = null;
  previewImage: string | ArrayBuffer | null = null;

  errorMessage: string = '';
  isSubmitted: boolean = false;
  isSuccess: boolean = false; 
  isSubmitting: boolean = false; 
  isRejectedRetry: boolean = false;

  isAdmin: boolean = false;
  membersList: any[] = [];
  selectedMemberId: number | null = null;

  constructor(
    private ownerRequestService: OwnerRequestService,
    private userService: UserService,
    private router: Router,
    private alertCtrl: AlertController
    // 🌟 เอา private loadingCtrl ออกไปแล้วครับ
  ) {
    addIcons({ personOutline, callOutline, arrowBack, logoFacebook, chatbubbles, arrowForward, logoInstagram, logoTwitter, paperPlane, alertCircle, time, checkmarkCircle, image, cloudUploadOutline, camera, heartDislikeOutline, personCircleOutline });
  }

  ngOnInit() {}

  ionViewWillEnter() {
    this.checkUserAccess();
    this.resetFormState();
  }

  resetFormState() {
    this.errorMessage = '';
    this.isSubmitted = false;
    this.isSubmitting = false;
    this.isSuccess = false;
    this.isRejectedRetry = false;
    this.selectedFile = null; 
    this.previewImage = null; 
    
    this.formData.first_name = ''; this.formData.last_name = '';
    this.formData.facebook = ''; this.formData.line = '';
    this.formData.instagram = ''; this.formData.x = ''; this.formData.telegram = '';
    
    this.checkUserAccess();
  }

  async checkUserAccess() {
    const storedData = localStorage.getItem('loggedIn');
    if (storedData) {
      try {
        const user = JSON.parse(storedData);
        const userId = user.id || user.user_id || user.USER_ID;
        const roleId = user.role_id || user.ROLE_TYPE_ID;
        
        if (userId) {
             this.formData.user_id = userId; 
             if (user.phone || user.phone_number || user.PHONE_NUMBER) {
                 this.formData.phone_number = user.phone || user.phone_number || user.PHONE_NUMBER;
             }
             
             if (roleId === 3) {
                 this.isAdmin = true;
                 this.loadMembers();
             } else {
                 this.fetchMyRequestData();
             }
        } else { this.forceLogout(); }
      } catch (e) { this.forceLogout(); }
    } else { this.forceLogout(); }
  }

  fetchMyRequestData() {
    this.ownerRequestService.getMyDormOwnerReq().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const data = res.data;
          // ถ้าถูกปฏิเสธ (REQ_STATUS === 2) ให้นำข้อมูลเดิมมาใส่
          if (data.REQ_STATUS === 2) {
            this.isRejectedRetry = true;
            this.formData.first_name = data.FIRST_NAME || '';
            this.formData.last_name = data.LAST_NAME || '';
            this.formData.facebook = data.FACEBOOK || '';
            this.formData.line = data.LINE || '';
            this.formData.instagram = data.INSTAGRAM || '';
            this.formData.x = data.X || '';
            this.formData.telegram = data.TELEGRAM || '';
            this.previewImage = data.PROFILE_IMAGE || null;
            // แจ้งผู้ใช้ว่าเป็นการส่งข้อมูลใหม่แทนที่ข้อมูลเดิมที่ถูกปฏิเสธ
          }
        }
      },
      error: (err) => {
        console.error('No previous request found or error', err);
      }
    });
  }

  async loadMembers() {
    try {
      const allUsers = await this.userService.getAllUsers();
      // Filter only members (Role 1)
      this.membersList = allUsers.filter(u => u.role_id === 1);
    } catch (e) {
      console.error('Failed to load members', e);
    }
  }

  onMemberSelect(event: any) {
    const selectedId = event.detail.value;
    if (selectedId) {
       this.formData.user_id = selectedId;
       // ดึงเบอร์โทรจากข้อมูลสมาชิกที่เลือก
       const member = this.membersList.find(m => m.id === selectedId);
       if (member && member.phone) {
         this.formData.phone_number = member.phone;
       } else {
         this.formData.phone_number = '';
       }
    }
  }

  async forceLogout() {
    const alert = await this.alertCtrl.create({
      header: 'แจ้งเตือน', message: 'กรุณาเข้าสู่ระบบก่อนทำรายการ', buttons: ['ตกลง']
    });
    await alert.present();
    this.router.navigate(['/login']);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => { this.previewImage = reader.result; };
      reader.readAsDataURL(file);
    }
  }

  onCancel() { this.router.navigate(['/home']); }

  async onSubmit() {
    console.log('👉 กดปุ่มยืนยันการขอสิทธิ์แล้ว!'); 
    
    if (this.isSubmitting) {
      console.log('🚫 ระบบกำลังประมวลผล ห้ามกดซ้ำ!');
      return;
    }

    this.isSubmitted = true;
    this.errorMessage = '';

    if (this.formData.user_id === 0) { this.forceLogout(); return; }
    if (!this.formData.first_name || !this.formData.last_name || !this.formData.phone_number) {
      this.errorMessage = 'กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน'; return;
    }
    const nameRe = /^[฀-๿a-zA-Z\s]+$/;
    if (!nameRe.test(this.formData.first_name)) {
      this.errorMessage = 'ชื่อต้องเป็นตัวอักษรเท่านั้น (ไม่อนุญาตให้ใช้ตัวเลข)'; return;
    }
    if (!nameRe.test(this.formData.last_name)) {
      this.errorMessage = 'นามสกุลต้องเป็นตัวอักษรเท่านั้น (ไม่อนุญาตให้ใช้ตัวเลข)'; return;
    }
    
    const phoneRe = /^0[0-9]{9}$/;
    if (!phoneRe.test(this.formData.phone_number)) {
      this.errorMessage = 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (10 หลัก เริ่มต้นด้วย 0)'; return;
    }
    if (!this.selectedFile && !this.isRejectedRetry) {
      this.errorMessage = 'กรุณาอัปโหลดรูปโปรไฟล์'; return;
    }
    
    const alert = await this.alertCtrl.create({
      header: 'ยืนยันการขอสิทธิ์',
      message: this.isRejectedRetry ? 'คุณต้องการส่งข้อมูลชุดใหม่เพื่อแทนที่คำขอเดิมที่ถูกปฏิเสธหรือไม่?' : 'คุณแน่ใจหรือไม่ว่าต้องการขอสิทธิ์เป็นเจ้าของหอพัก?',
      buttons: [
        {
          text: 'ยกเลิก',
          role: 'cancel',
          handler: () => {
            this.isSubmitting = false;
          }
        },
        {
          text: 'ยืนยัน',
          handler: () => {
            this.proceedSubmit();
          }
        }
      ]
    });
    await alert.present();
  }

  proceedSubmit() {
    console.log('✅ ข้อมูลครบถ้วน เตรียมส่ง API...');
    this.isSubmitting = true; // 🌟 ล็อกปุ่มให้เป็นตัวหมุนๆ (Spinner)
    
    try {
      console.log('🚀 โค้ดวิ่งทะลุไปหาหลังบ้านแล้ว (ไม่มี Loading มากวนใจ!)');
      
      const formData = new FormData();
      if (this.selectedFile) {
        formData.append('file', this.selectedFile); 
      }
      formData.append('user_id', this.formData.user_id.toString());
      formData.append('first_name', this.formData.first_name);
      formData.append('last_name', this.formData.last_name);
      formData.append('phone_number', this.formData.phone_number); 
      formData.append('facebook', this.formData.facebook || '');
      formData.append('line', this.formData.line || '');
      formData.append('instagram', this.formData.instagram || '');
      formData.append('x', this.formData.x || '');
      formData.append('telegram', this.formData.telegram || '');
      
      if (this.isRejectedRetry) {
        formData.append('override', 'true');
      }

      this.ownerRequestService.requestToBeOwner(formData).subscribe({
        next: (res) => {
          console.log('🎉 Success:', res);
          this.isSuccess = true;
          this.isSubmitting = false; // ปลดล็อกปุ่ม
        },
        error: (err) => {
          console.error('💥 Error:', err);
          
          if (err.status === 409) {
               this.errorMessage = 'คุณได้ส่งคำขอไปแล้ว หรือเป็นเจ้าของหอพักอยู่แล้ว';
          } else {
               this.errorMessage = err.error?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
          }
          this.isSubmitting = false; // ปลดล็อกปุ่ม
        }
      });

    } catch (error) {
      console.error('🔥 System Error:', error);
      this.errorMessage = 'เกิดข้อผิดพลาดในระบบหน้าเว็บ';
      this.isSubmitting = false; // ปลดล็อกปุ่ม
    }
  }
}