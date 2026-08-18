import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, ModalController } from '@ionic/angular';
import { Router, NavigationEnd } from '@angular/router';

import { addIcons } from 'ionicons';
import { 
  home, listOutline, starOutline, person, personCircleOutline, 
  key, create, business, heartOutline, logOutOutline, cubeOutline,
  close, chevronBackOutline, barChartOutline, peopleOutline,
  documentTextOutline, gridOutline, informationCircleOutline, chatbubblesOutline,
  phonePortraitOutline, bookOutline
} from 'ionicons/icons';
import { ActionConfirmModalComponent } from '../action-confirm-modal/action-confirm-modal.component';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ActionConfirmModalComponent]
})
export class MenuComponent implements OnInit, OnDestroy {
  currentUser: any = null;
  isOpen = false;       // เปิด/ปิดเมนู
  isDesktop = false;

  constructor(
    private router: Router, 
    private alertCtrl: AlertController,
    private cdr: ChangeDetectorRef,
    private modalCtrl: ModalController
  ) {
    addIcons({
      home, 
      listOutline, 
      starOutline, 
      person, 
      personCircleOutline,
      key, 
      create, 
      business, 
      heartOutline, 
      logOutOutline,
      cubeOutline,
      close,
      chevronBackOutline,
      barChartOutline,
      peopleOutline,
      documentTextOutline,
      gridOutline,
      informationCircleOutline,
      chatbubblesOutline,
      phonePortraitOutline,
      bookOutline
    });
  }

  ngOnInit() {
    this.checkLoginStatus();
    this.isDesktop = window.innerWidth >= 1024;
    this.isOpen = this.isDesktop; // เปิด sidebar อัตโนมัติบน Desktop
    setTimeout(() => this.dispatchStateChange(), 100);

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy() {}

  @HostListener('window:resize')
  onResize() {
    const wasDesktop = this.isDesktop;
    this.isDesktop = window.innerWidth >= 1024;
    
    // Auto toggle state based on screen size change
    if (this.isDesktop && !wasDesktop) {
      this.isOpen = true;
      this.dispatchStateChange();
      this.cdr.detectChanges();
    } else if (!this.isDesktop && wasDesktop) {
      this.isOpen = false;
      this.dispatchStateChange();
      this.cdr.detectChanges();
    }
  }

  // ✅ รับคำสั่ง toggle จากหน้า Home (hamburger button กดบน mobile/desktop)
  @HostListener('window:toggle-sidebar')
  toggleSidebar() {
    this.checkLoginStatus();
    this.isOpen = !this.isOpen;
    this.dispatchStateChange();
    this.cdr.detectChanges();
  }

  // ✅ ฟังทุกครั้งที่ navigate กลับมาหน้าที่มีเมนู หรือแก้ไขโปรไฟล์
  @HostListener('window:user-logged-in')
  @HostListener('window:user-profile-updated')
  onUserLoggedIn() {
    this.checkLoginStatus();
  }

  // ✅ รับ event ตอน auto logout
  @HostListener('window:user-logged-out')
  onUserLoggedOut() {
    this.currentUser = null;
    this.isOpen = false;
    this.dispatchStateChange();
    this.cdr.detectChanges();
  }

  // ✅ Dispatch event เพื่อให้ app.component sync class
  private dispatchStateChange() {
    window.dispatchEvent(new CustomEvent('sidebar-state-changed', {
      detail: { isOpen: this.isOpen, isDesktop: this.isDesktop } 
    }));
  }

  get userRole(): number {
    if (!this.currentUser) return 0;
    const role = this.currentUser.role_id 
      || this.currentUser.ROLE_TYPE_ID 
      || this.currentUser.role_type_id 
      || 0;
    return Number(role);
  }

  checkLoginStatus() {
    const storedData = localStorage.getItem('loggedIn');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        const userObj = parsed.user ? parsed.user : parsed;

        if (userObj && userObj.id) {
          const status = userObj.accout_status 
            ?? userObj.account_status 
            ?? userObj.ACCOUNT_STATUS 
            ?? 0;

          if (status === 0 || status === 'active') {
            this.currentUser = userObj;
          } else {
            this.currentUser = null;
          }
        } else {
          this.currentUser = null;
        }
      } catch (e) {
        this.currentUser = null;
      }
    } else {
      this.currentUser = null;
    }
    this.cdr.detectChanges();
  }

  // ✅ ปิด sidebar
  closeSidebar() {
    this.isOpen = false;
    this.dispatchStateChange();
    this.cdr.detectChanges();
  }

  // ✅ ปิดจากปุ่ม X
  forceClose() {
    this.isOpen = false;
    this.dispatchStateChange();
    this.cdr.detectChanges();
  }

  isActive(path: string): boolean {
    return this.router.url === path || this.router.url.split('?')[0] === path;
  }

  async navigate(path: string) {
    if (!this.isDesktop) {
      this.isOpen = false;
      this.dispatchStateChange();
    }
    
    // ปิด modals ที่ค้างอยู่
    const topModal = await this.modalCtrl.getTop();
    if (topModal) {
      await this.modalCtrl.dismiss();
    }

    this.router.navigate([path]);
  }

  openManual() {
    if (!this.isDesktop) {
      this.isOpen = false;
      this.dispatchStateChange();
    }
    window.open('https://drive.google.com/drive/folders/1vASmPQ3dB2HEK98GpQ2UUQOFsR08mMwS?usp=sharing', '_blank');
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
      this.currentUser = null;
      if (!this.isDesktop) {
        this.isOpen = false;
        this.dispatchStateChange();
      }
      this.router.navigate(['/login']);
    }
  }
}