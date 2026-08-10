import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController } from '@ionic/angular';
import { HeaderComponent } from '../../components/header/header.component';
import { addIcons } from 'ionicons';
import {
  mapOutline,
  flashOutline,
  shieldCheckmarkOutline,
  mailOutline,
  logoFacebook,
  logoTwitter,
  logoInstagram,
  arrowBackCircleOutline,
  callOutline,
  documentTextOutline,
  shieldOutline,
  warningOutline,
  closeCircleOutline,
} from 'ionicons/icons';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-about',
  templateUrl: './about.page.html',
  styleUrls: ['./about.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, HeaderComponent]
})
export class AboutPage implements OnInit, OnDestroy {

  showWarningPopup = false;
  warningMessage = '';

  adviser = {
    name: 'ผศ.ดร.สำรวน เวียงสมุทร',
    position: 'อาจารย์ที่ปรึกษาโปรเจค',
    imageUrl:
      'https://cs.it.msu.ac.th/uploads/faculty/assistant_prof_3_1758177117.jpg',
  };

  developers = [
    {
      name: 'นายพัทธดนย์ สุดหลักทอง',
      position: 'Mobile Developer',
      imageUrl: '/assets/devTeam/Phattadon.jpg',
    },
    {
      name: 'นายอรรมนาถ แป้นโสม',
      position: 'Web Developer',
      imageUrl: '/assets/devTeam/Oammanat.jpg',
    },
  ];

  constructor(private navCtrl: NavController) {
    addIcons({
      mapOutline,
      flashOutline,
      shieldCheckmarkOutline,
      mailOutline,
      logoFacebook,
      logoTwitter,
      logoInstagram,
      arrowBackCircleOutline,
      callOutline,
      documentTextOutline,
      shieldOutline,
      warningOutline,
      closeCircleOutline,
    });
  }

  ngOnInit() {
    this.setupScreenshotDetection();
  }

  ngOnDestroy() {
    this.cleanupScreenshotDetection();
  }

  private keyHandler = (e: KeyboardEvent) => {
    // ตรวจจับ PrintScreen
    if (e.key === 'PrintScreen' || e.keyCode === 44) {
      e.preventDefault();
      this.triggerWarning('printscreen');
      // ล้าง clipboard ด้วย blank เพื่อไม่ให้แคปหน้าจอได้
      try {
        navigator.clipboard.writeText('').catch(() => {});
      } catch {}
    }
    // ตรวจจับ Windows + Shift + S (Snipping Tool)
    if ((e.metaKey || e.key === 'Meta') && e.shiftKey && e.key === 'S') {
      this.triggerWarning('printscreen');
    }
  };

  private visibilityHandler = () => {
    if (document.visibilityState === 'hidden') {
      // อาจมีการแคปหน้าจอหรือ switch app
    }
  };

  private setupScreenshotDetection() {
    document.addEventListener('keyup', this.keyHandler);
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private cleanupScreenshotDetection() {
    document.removeEventListener('keyup', this.keyHandler);
    document.removeEventListener('visibilitychange', this.visibilityHandler);
  }

  triggerWarning(type: string) {
    if (type === 'printscreen') {
      this.warningMessage = 'printscreen';
    }
    this.showWarningPopup = true;
    // ปิด popup อัตโนมัติหลัง 6 วินาที
    setTimeout(() => {
      this.showWarningPopup = false;
    }, 6000);
  }

  closeWarning() {
    this.showWarningPopup = false;
  }

  goBack() {
    this.navCtrl.back();
  }
}
