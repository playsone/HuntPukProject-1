import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastController, AlertController, IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { 
  closeOutline, personOutline, callOutline, mailOutline, trashOutline,
  logoFacebook, chatbubbles, logoInstagram, logoTwitter, paperPlane, cameraOutline
} from 'ionicons/icons';
import { Auth } from '../../services/auth'; 
import { UserService } from '../../services/user';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.page.html',
  styleUrls: ['./edit-profile.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class EditProfilePage implements OnInit {

  editData = {
    username: '',
    phone_number: ''
  };

  // ข้อมูลเจ้าของหอพัก (แสดงเฉพาะ role 2)
  ownerEditData = {
    first_name: '',
    last_name: '',
    facebook: '',
    line: '',
    instagram: '',
    x: '',
    telegram: ''
  };

  fullUserData: any = {};
  userId: number = 0;
  isOwner: boolean = false; // true ถ้า role_id === 2
  
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  
  returnUrl: string = '/my-account';

  constructor(
    private router: Router,
    private toastController: ToastController,
    private alertController: AlertController,
    private authService: Auth,
    private userService: UserService 
  ) {
    addIcons({ 
      closeOutline, personOutline, callOutline, mailOutline, trashOutline,
      'logo-facebook': logoFacebook, chatbubbles, 'logo-instagram': logoInstagram,
      'logo-twitter': logoTwitter, 'paper-plane': paperPlane, 'camera-outline': cameraOutline
    });
  }

  ngOnInit() {
    this.loadUserData();
  }

  async loadUserData() {
    const navState = this.router.getCurrentNavigation()?.extras.state;
    let userData = navState ? navState['user'] : null;
    let ownerData = navState ? navState['ownerData'] : null;
    if (navState && navState['returnUrl']) {
      this.returnUrl = navState['returnUrl'];
    }

    if (!userData) {
      const stored = localStorage.getItem('loggedIn');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const baseUser = parsed.user ? parsed.user : parsed;
          
          // Fetch complete data from API since navState is missing
          if (baseUser && (baseUser.id || baseUser.user_id || baseUser.USER_ID)) {
             const uid = baseUser.id || baseUser.user_id || baseUser.USER_ID;
             const rawData = await this.userService.getUserProfile(uid);
             if (rawData) {
                userData = {
                  ...baseUser,
                  ...rawData
                };
                if (userData.ROLE_TYPE_ID === 2 || userData.role_id === 2) {
                   ownerData = rawData;
                }
             } else {
                userData = baseUser;
             }
          } else {
             userData = baseUser;
          }
        } catch (e) {}
      }
    }

    if (userData) {
      this.fullUserData = userData;
      this.userId = userData.id || userData.user_id || userData.USER_ID;
      this.isOwner = (userData.role_id === 2 || userData.ROLE_TYPE_ID === 2);

      this.editData.username = userData.username || userData.USERNAME || '';
      this.fullUserData.email = userData.email || userData.EMAIL || '';
      this.editData.phone_number = userData.phone || userData.phone_number || userData.PHONE_NUMBER || '';

      if (userData.profile_image || userData.PROFILE_IMAGE) {
        this.imagePreview = userData.profile_image || userData.PROFILE_IMAGE;
      }
    }

    // โหลดข้อมูลเจ้าของหอพัก (ถ้ามี)
    if (ownerData && this.isOwner) {
      this.ownerEditData.first_name = ownerData.first_name || ownerData.FIRST_NAME || '';
      this.ownerEditData.last_name = ownerData.last_name || ownerData.LAST_NAME || '';
      this.ownerEditData.facebook = ownerData.facebook || ownerData.FACEBOOK || '';
      this.ownerEditData.line = ownerData.line || ownerData.LINE || '';
      this.ownerEditData.instagram = ownerData.instagram || ownerData.INSTAGRAM || '';
      this.ownerEditData.x = ownerData.x || ownerData.X || '';
      this.ownerEditData.telegram = ownerData.telegram || ownerData.TELEGRAM || '';
      
      if (ownerData.PROFILE_IMAGE || ownerData.profile_image) {
        this.imagePreview = ownerData.PROFILE_IMAGE || ownerData.profile_image;
      }
    }
  }

  async confirmSave() {
    if (!this.editData.username || !this.editData.phone_number) {
      this.showToast('กรุณากรอกชื่อและเบอร์โทรศัพท์', 'danger');
      return;
    }

    const phoneRegex = /^0[0-9]{9}$/;
    if (!phoneRegex.test(this.editData.phone_number)) {
      this.showToast('เบอร์โทรศัพท์ไม่ถูกต้อง (ต้องมี 10 หลัก)', 'danger');
      return;
    }

    const alert = await this.alertController.create({
      header: 'ยืนยันการแก้ไข',
      message: 'คุณต้องการบันทึกการเปลี่ยนแปลงข้อมูลใช่หรือไม่?',
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'บันทึก',
          handler: () => {
            this.saveProfile(); 
          }
        }
      ]
    });
    await alert.present();
  }

  async saveProfile() {
    try {
      // สร้าง ownerData ถ้าเป็นเจ้าของหอพัก
      const ownerPayload = this.isOwner ? {
        first_name: this.ownerEditData.first_name,
        last_name: this.ownerEditData.last_name,
        facebook: this.ownerEditData.facebook,
        line: this.ownerEditData.line,
        instagram: this.ownerEditData.instagram,
        x: this.ownerEditData.x,
        telegram: this.ownerEditData.telegram
      } : undefined;

      await this.authService.updateProfile(
        this.userId, 
        this.editData.username, 
        this.editData.phone_number,
        ownerPayload,
        this.selectedFile || undefined
      );

      const storedData = localStorage.getItem('loggedIn');
      if (storedData) {
        let parsed = JSON.parse(storedData);
        
        // 🔥 อัปเดตข้อมูลเข้าไปในกล่อง .user (ถ้ามี)
        if (parsed.user) {
          parsed.user.username = this.editData.username;
          parsed.user.USERNAME = this.editData.username;
          parsed.user.phone = this.editData.phone_number;
          parsed.user.PHONE_NUMBER = this.editData.phone_number;
        } else {
          parsed.username = this.editData.username;
          parsed.USERNAME = this.editData.username;
          parsed.phone = this.editData.phone_number;
          parsed.PHONE_NUMBER = this.editData.phone_number;
        }

        // เซฟกลับเข้า LocalStorage
        localStorage.setItem('loggedIn', JSON.stringify(parsed));
        window.dispatchEvent(new CustomEvent('user-profile-updated'));
      }
      
      await Swal.fire({
        icon: 'success',
        title: 'สำเร็จ',
        text: 'บันทึกข้อมูลเรียบร้อย',
        confirmButtonColor: '#f1c40f',
        confirmButtonText: 'ตกลง'
      }).then(() => {
        this.router.navigateByUrl(this.returnUrl);
      });

    } catch (error: any) { 
      console.error('Update Error:', error);
      let msg = 'บันทึกไม่สำเร็จ';
      
      // 🌟 ดึงข้อความ Error จากเซิร์ฟเวอร์มาแสดงให้ชัดเจน
      if (error.error && error.error.message) {
        msg = error.error.message;
      } else if (error.message) {
        msg = error.message;
      }
      
      await Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: msg,
        confirmButtonColor: '#f1c40f',
        confirmButtonText: 'ตกลง'
      });
    }
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastController.create({ message: msg, duration: 2000, color: color, position: 'top' });
    await toast.present();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        Swal.fire({
          icon: 'error',
          title: 'ขนาดไฟล์เกิน',
          text: 'กรุณาอัปโหลดรูปภาพขนาดไม่เกิน 2MB',
          confirmButtonColor: '#f1c40f',
          confirmButtonText: 'ตกลง'
        });
        event.target.value = null; // reset input
        return;
      }
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  handleImageError() {
    this.imagePreview = null;
  }

  goBack() {
    this.router.navigateByUrl(this.returnUrl);
  }
}