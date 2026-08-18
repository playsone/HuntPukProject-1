import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router'; 
import { addIcons } from 'ionicons';
import { 
  person, mail, create, arrowBack, arrowForward, chevronForward, logOut, call, shieldCheckmark, home, documentText, 
  close, alertCircle, business, chatbubbleEllipses, logoFacebook, logoInstagram, logoTwitter, paperPlane,
  documentTextOutline, personCircle, createOutline, lockClosedOutline, trashOutline 
} from 'ionicons/icons';
import { UserService } from '../../services/user'; 
import { DormitoryService } from '../../services/dormitory';
import { Auth } from '../../services/auth';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon, IonSpinner, LoadingController, ToastController, AlertController, ModalController } from '@ionic/angular/standalone';
import { ActionConfirmModalComponent } from '../../components/action-confirm-modal/action-confirm-modal.component';

@Component({
  selector: 'app-my-account',
  templateUrl: './my-account.page.html',
  styleUrls: ['./my-account.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, IonIcon, IonSpinner, ActionConfirmModalComponent]
})
export class MyAccountPage implements OnInit {
  user: any = {};
  isLoading: boolean = false;
  isOwnProfile: boolean = true; 
  canEdit: boolean = false;
  
  timestamp: number = Date.now();
  myDorms: any[] = [];
  ownerData: any = null; // เก็บข้อมูลเจ้าของหอพัก (ชื่อ, โซเชียล) สำหรับส่งไป edit-profile

  constructor(
    private router: Router,
    private route: ActivatedRoute, 
    private userService: UserService,
    private dormService: DormitoryService,
    private authService: Auth,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController
  ) { 
    addIcons({ 
      person, mail, create, arrowBack, 'arrow-forward': arrowForward, 
      'chevron-forward': chevronForward, 'log-out-outline': logOut,
      call, shieldCheckmark, home, documentText, 
      close, alertCircle, business, 'chatbubble-ellipses': chatbubbleEllipses, 
      'logo-facebook': logoFacebook, 'logo-instagram': logoInstagram, 'logo-twitter': logoTwitter, 'paper-plane': paperPlane,
      'document-text-outline': documentTextOutline, 'person-circle': personCircle,
      'create-outline': createOutline, 'lock-closed-outline': lockClosedOutline, 'trash-outline': trashOutline 
    });
  }

  ngOnInit() {}

  ionViewWillEnter() {
    this.timestamp = Date.now();
    this.loadUserData();
  }

  extractPhone(data: any): string {
    if (!data) return '-';
    
    // ✅ ครอบคลุมทุก case ที่เป็นไปได้จาก Backend
    const phoneFields = [
      data.PHONE_NUMBER,
      data.phone_number, 
      data.phone,
      data.PHONE,
      data.phoneNumber,
      data.tel,
      data.TEL
    ];

    for (const field of phoneFields) {
      if (field && field !== '-' && field !== 'null' && field.toString().trim() !== '') {
        const cleaned = field.toString().trim();
        console.log('✅ Found phone:', cleaned); // Debug
        return cleaned;
      }
    }

    console.warn('⚠️ No phone found in data:', data); // Debug
    return '-';
  }

  async loadUserData() {
    this.isLoading = true;

    // 1. ดึงข้อมูลจาก LocalStorage ไว้เป็นหลักสำรอง
    const stored = localStorage.getItem('loggedIn');
    let localPhone = '-'; // ✅ เบอร์โทรจาก localStorage (แหล่งที่เชื่อถือได้ 100%)
    let currentUser: any = null;
    let myRole: number = 1;
    let myId: number = 0;

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        currentUser = parsed.user ? parsed.user : parsed;
        myRole = currentUser.role_id || currentUser.role_type_id || currentUser.ROLE_TYPE_ID || 1; 
        myId = currentUser.id || currentUser.user_id || currentUser.USER_ID;

        // ✅ ดึงเบอร์โทรจาก localStorage และเก็บไว้ (ไม่ให้ API ทับ!)
        localPhone = this.extractPhone(currentUser);
      } catch (e) { console.error(e); }
    }

    // 2. ดึงข้อมูลจาก API
    try {
      const routeId = this.route.snapshot.paramMap.get('id');

      if (routeId) {
        // ==========================================
        // กรณีดูโปรไฟล์คนอื่น (admin เข้ามาดูจาก manage-users)
        // ==========================================
        this.isOwnProfile = false;
        this.canEdit = (myRole === 3); // แอดมินแก้ไขโปรไฟล์คนอื่นได้

        // ตั้งค่าเริ่มต้นเป็นว่าง ก่อนโหลด API (เพื่อไม่ให้แสดงข้อมูลของแอดมินเอง)
        this.user = {
          id: Number(routeId),
          username: 'กำลังโหลด...',
          email: '-',
          phone: '-',
          role_id: 1,
          status: 0
        };

        const rawData = await this.userService.getUserProfile(Number(routeId));
        
        if (rawData && (rawData.EMAIL || rawData.email || rawData.PHONE_NUMBER || rawData.phone_number || rawData.PHONE || rawData.phone || rawData.USERNAME || rawData.username)) {
            this.user = {
              id: rawData.USER_ID || rawData.id || Number(routeId),
              username: rawData.USERNAME || rawData.username || 'ไม่ระบุชื่อ',
              email: rawData.EMAIL || rawData.email || '-',
              phone: rawData.PHONE_NUMBER || this.extractPhone(rawData),
              role_id: rawData.ROLE_TYPE_ID || rawData.role_id || 1,
              status: rawData.ACCOUNT_STATUS ?? rawData.status ?? 0,
              first_name: rawData.FIRST_NAME || rawData.first_name || '',
              last_name: rawData.LAST_NAME || rawData.last_name || '',
              profile_image: rawData.PROFILE_IMAGE || rawData.profile_image || ''
            };

            // ถ้าเป็นเจ้าของหอ (role 2) ให้เซ็ต ownerData จากข้อมูล API นี้เลย (REQ_STATUS != null คือมีข้อมูลใน DORM_OWNERS)
            if (rawData.FIRST_NAME || rawData.first_name || rawData.REQ_STATUS !== undefined) {
              this.ownerData = {
                first_name: rawData.FIRST_NAME || rawData.first_name || '',
                last_name: rawData.LAST_NAME || rawData.last_name || '',
                facebook: rawData.FACEBOOK || rawData.facebook || '',
                line: rawData.LINE || rawData.line || '',
                instagram: rawData.INSTAGRAM || rawData.instagram || '',
                x: rawData.X || rawData.x || '',
                telegram: rawData.TELEGRAM || rawData.telegram || '',
                PROFILE_IMAGE: rawData.PROFILE_IMAGE || rawData.profile_image || ''
              };
            }
        } else {
          // API ไม่คืนข้อมูล — แสดงว่าไม่พบผู้ใช้
          this.user.username = 'ไม่พบข้อมูลผู้ใช้';
        }
      } else {
        // ==========================================
        // กรณีดูโปรไฟล์ตัวเอง
        // ==========================================
        this.isOwnProfile = true;
        this.canEdit = true; 

        // นำข้อมูลจาก localStorage ขึ้นจอทันที
        this.user = {
          id: myId,
          username: currentUser?.username || currentUser?.USERNAME || 'ไม่ระบุชื่อ',
          email: currentUser?.email || currentUser?.EMAIL || '-',
          phone: localPhone,
          role_id: myRole,
          status: currentUser?.ACCOUNT_STATUS ?? currentUser?.status ?? 0
        };

        if (myId) {
          const rawData = await this.userService.getUserProfile(myId);

          const isRealData = rawData && (rawData.EMAIL || rawData.email ||rawData.PHONE_NUMBER || rawData.phone_number || rawData.PHONE || rawData.phone || rawData.USERNAME || rawData.username);

          if (isRealData) {
            const apiPhone = this.extractPhone(rawData);
            
            // ✅ ตรรกะสำคัญ: ถ้า API ไม่มีเบอร์ หรือส่งมาเป็น '-' ให้ใช้ของ localStorage
            const finalPhone = (apiPhone !== '-') ? apiPhone : localPhone;

            this.user = {
              id: rawData.USER_ID || rawData.id || this.user.id || 0,
              username: rawData.USERNAME || rawData.username || this.user.username || 'ไม่ระบุชื่อ',
              email: rawData.EMAIL || rawData.email || this.user.email || '-',
              phone: rawData.PHONE_NUMBER || this.user.phone || finalPhone,
              role_id: rawData.ROLE_TYPE_ID || rawData.role_id || this.user.role_id || 1,
              status: rawData.ACCOUNT_STATUS ?? rawData.status ?? this.user.status,
              first_name: rawData.FIRST_NAME || rawData.first_name || '',
              last_name: rawData.LAST_NAME || rawData.last_name || '',
              profile_image: rawData.PROFILE_IMAGE || rawData.profile_image || '',
              facebook: rawData.FACEBOOK || rawData.facebook || '',
              line: rawData.LINE || rawData.line || '',
              instagram: rawData.INSTAGRAM || rawData.instagram || '',
              x: rawData.X || rawData.x || '',
              telegram: rawData.TELEGRAM || rawData.telegram || ''
            };

            if (rawData.FIRST_NAME || rawData.first_name || rawData.FACEBOOK || rawData.LINE || rawData.REQ_STATUS !== undefined) {
              this.ownerData = {
                first_name: rawData.FIRST_NAME || rawData.first_name || '',
                last_name: rawData.LAST_NAME || rawData.last_name || '',
                facebook: rawData.FACEBOOK || rawData.facebook || '',
                line: rawData.LINE || rawData.line || '',
                instagram: rawData.INSTAGRAM || rawData.instagram || '',
                x: rawData.X || rawData.x || '',
                telegram: rawData.TELEGRAM || rawData.telegram || '',
                profile_image: rawData.PROFILE_IMAGE || rawData.profile_image || ''
              };
            }

            // อัปเดตกลับเข้า localStorage
            if (stored) {
              const parsedStore = JSON.parse(stored);
              if (parsedStore.user) {
                parsedStore.user.username = this.user.username;
                parsedStore.user.USERNAME = this.user.username;
                parsedStore.user.phone = this.user.phone;
                parsedStore.user.PHONE_NUMBER = this.user.phone;
              } else {
                parsedStore.username = this.user.username;
                parsedStore.USERNAME = this.user.username;
                parsedStore.phone = this.user.phone;
                parsedStore.PHONE_NUMBER = this.user.phone;
              }
              localStorage.setItem('loggedIn', JSON.stringify(parsedStore));
              window.dispatchEvent(new CustomEvent('user-profile-updated'));
            }
          }
        }
      }
    } catch (e) {
      console.warn('❌ API Error:', e);
      // ถ้าดูโปรไฟล์คนอื่นแล้ว API Error ให้แสดงว่าไม่พบข้อมูล
      if (!this.isOwnProfile) {
        this.user.username = 'ไม่สามารถโหลดข้อมูลได้';
      }
    } finally {
      this.isLoading = false;
      if (this.user.role_id === 2) {
        this.loadOwnerDorms();
      }
    }
  }

  goToEditProfile() {
    this.router.navigate(['/edit-profile'], {
      state: { user: this.user, ownerData: this.ownerData, returnUrl: this.router.url }
    });
  }

  goToMyDorms() {
    this.router.navigate(['/my-dorms']);
  }
  
  goBack() {
    if (!this.isOwnProfile) { this.router.navigate(['/manage-users']); } 
    else { this.router.navigate(['/home']); }
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({ message: msg, duration: 2000, color: color, position: 'bottom' });
    toast.present();
  }

  async loadOwnerDorms() {
    try {
      const res: any = await this.dormService.getMyDorms(this.user.id);
      if (res && res.data) {
        const summaryDorms = res.data;
        // ดึงข้อมูลแบบละเอียดของแต่ละหอพัก เพื่อเอาชื่อเจ้าของ เบอร์ติดต่อ ไลน์ ฯลฯ
        const detailedDorms = await Promise.all(summaryDorms.map(async (dorm: any) => {
          try {
            const detailRes: any = await this.dormService.getDormById(dorm.DORM_ID || dorm.id);
            if (detailRes && detailRes.data) {
              const fullDorm = Array.isArray(detailRes.data) ? detailRes.data[0] : detailRes.data;
              // เก็บข้อมูลเจ้าของหอพักครั้งแรกที่พบ (สำหรับส่งไป edit-profile)
              if (!this.ownerData) {
                this.ownerData = {
                  first_name: fullDorm.FIRST_NAME || fullDorm.OWNER_FIRST_NAME || dorm.FIRST_NAME || this.user.first_name || '',
                  last_name: fullDorm.LAST_NAME || fullDorm.OWNER_LAST_NAME || dorm.LAST_NAME || this.user.last_name || '',
                  facebook: fullDorm.facebook || fullDorm.FACEBOOK || dorm.facebook || dorm.FACEBOOK || this.user.facebook || '',
                  line: fullDorm.line || fullDorm.LINE || dorm.line || dorm.LINE || this.user.line || '',
                  instagram: fullDorm.instagram || fullDorm.INSTAGRAM || dorm.instagram || dorm.INSTAGRAM || this.user.instagram || '',
                  x: fullDorm.x || fullDorm.X || dorm.x || dorm.X || this.user.x || '',
                  telegram: fullDorm.telegram || fullDorm.TELEGRAM || dorm.telegram || dorm.TELEGRAM || this.user.telegram || '',
                  profile_image: this.user.profile_image || fullDorm.PROFILE_IMAGE || ''
                };
              }
              return { 
                ...dorm, 
                ...fullDorm,
                OWNER_FIRST_NAME: fullDorm.FIRST_NAME || fullDorm.OWNER_FIRST_NAME || dorm.FIRST_NAME || this.user.first_name,
                OWNER_LAST_NAME: fullDorm.LAST_NAME || fullDorm.OWNER_LAST_NAME || dorm.LAST_NAME || this.user.last_name,
                OWNER_PHONE: fullDorm.PHONE || fullDorm.PHONE_NUMBER || dorm.PHONE || this.user.phone
              }; // รวมข้อมูลสรุปเข้ากับข้อมูลแบบละเอียด และแนบข้อมูลเจ้าของ
            }
          } catch (err) {
            console.error('Failed to load details for dorm', dorm.DORM_ID, err);
          }
          return {
            ...dorm,
            OWNER_FIRST_NAME: dorm.FIRST_NAME || this.user.first_name,
            OWNER_LAST_NAME: dorm.LAST_NAME || this.user.last_name,
            OWNER_PHONE: dorm.PHONE || dorm.PHONE_NUMBER || this.user.phone
          }; // ถ้าดึงแบบละเอียดไม่สำเร็จ ก็ใช้แบบสรุปไปก่อนและแนบชื่อเจ้าของ
        }));
        this.myDorms = detailedDorms;

        // ซิงค์ข้อมูลกลับไปที่ user หากยังไม่มี
        if (this.ownerData) {
          if (!this.user.first_name) this.user.first_name = this.ownerData.first_name;
          if (!this.user.last_name) this.user.last_name = this.ownerData.last_name;
          if (!this.user.line) this.user.line = this.ownerData.line;
          if (!this.user.facebook) this.user.facebook = this.ownerData.facebook;
          if (!this.user.instagram) this.user.instagram = this.ownerData.instagram;
        }
      }
    } catch (e) {
      console.error('Failed to load owner dorms', e);
    }
  }

  async deleteAccount() {
    const alert = await this.alertCtrl.create({
      header: 'ยืนยันการลบบัญชี',
      message: 'การลบบัญชีไม่สามารถกู้คืนได้ โปรดตัดสินใจให้ดี!\n\nพิมพ์คำว่า "DELETE" เพื่อยืนยันการลบบัญชีของคุณ',
      inputs: [
        {
          name: 'confirmText',
          type: 'text',
          placeholder: 'พิมพ์ DELETE'
        }
      ],
      buttons: [
        { text: 'ยกเลิก', role: 'cancel', cssClass: 'secondary' },
        {
          text: 'ลบบัญชี',
          cssClass: 'danger',
          handler: async (data) => {
            if (data.confirmText === 'DELETE') {
              try {
                // ใช้ deleteAccount แทน deactivateUser เพื่อลบข้อมูลจริงๆ
                const success = await this.userService.deleteAccount(this.user.id);
                if (success) {
                  this.showToast('ลบบัญชีสำเร็จ', 'success');
                  localStorage.removeItem('loggedIn');
                  localStorage.removeItem('rememberLogin');
                  window.dispatchEvent(new CustomEvent('user-logged-out'));
                  this.router.navigate(['/home']);
                  return true;
                } else {
                  throw new Error('Delete account failed');
                }
              } catch (err: any) {
                this.showToast(err.error?.message || 'เกิดข้อผิดพลาดในการลบบัญชี', 'danger');
                return false;
              }
            } else {
              this.showToast('คำยืนยันไม่ถูกต้อง กรุณาพิมพ์ DELETE เพื่อยืนยัน', 'warning');
              return false;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async logout() {
    const modal = await this.modalCtrl.create({
      component: ActionConfirmModalComponent,
      componentProps: {
        title: 'ยืนยันการออกจากระบบ',
        message: 'คุณต้องการออกจากระบบใช่หรือไม่?',
        confirmText: 'ออกจากระบบ',
        cancelText: 'ยกเลิก',
        type: 'danger'
      },
      cssClass: 'custom-alert-modal'
    });
    await modal.present();

    const { role } = await modal.onDidDismiss();
    if (role === 'confirm') {
      localStorage.removeItem('loggedIn');
      localStorage.removeItem('rememberLogin');
      window.dispatchEvent(new CustomEvent('user-logged-out'));
      this.router.navigate(['/login']);
    }
  }

  resetPasswd() {
    this.router.navigate(['/forgot-password'], { queryParams: { email: this.user.email } });
  }
}