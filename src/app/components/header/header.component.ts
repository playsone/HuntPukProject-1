import { Component, EventEmitter, Input, Output, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { search, personCircle, personCircleOutline, logOutOutline, closeCircle, personAddOutline, logInOutline } from 'ionicons/icons';
import { ActionConfirmModalComponent } from '../action-confirm-modal/action-confirm-modal.component';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ActionConfirmModalComponent]
})
export class HeaderComponent implements OnInit {

  @Input() title: string = '';
  @Input() userData: any = null;
  @Input() dormList: any[] = [];       // รายชื่อหอพักทั้งหมด สำหรับ autocomplete
  @Input() hasActiveFilter: boolean = false; // มีตัวกรอง active อยู่หรือไม่

  @Output() searchChange = new EventEmitter<string>();          // real-time update markers
  @Output() dormSelected = new EventEmitter<any>();             // กดเลือกหอพักจาก dropdown
  @Output() searchSubmit = new EventEmitter<{ text: string; keepFilter: boolean }>(); // กดปุ่มค้นหา

  searchText: string = '';
  suggestions: any[] = [];  // รายการ dropdown ที่กรองแล้ว
  showSuggestions: boolean = false;

  constructor(private router: Router, private modalCtrl: ModalController) {
    addIcons({ search, personCircle, personCircleOutline, logOutOutline, closeCircle, personAddOutline, logInOutline });
  }

  ngOnInit() {}

  // พิมพ์ตัวอักษร → filter suggestions + อัปเดต markers real-time
  onInput() {
    const val = this.searchText.trim();
    if (val.length >= 1) {
      this.suggestions = this.dormList
        .filter(d => (d.DORM_NAME || '').toLowerCase().includes(val.toLowerCase()))
        .slice(0, 8);
      this.showSuggestions = this.suggestions.length > 0;
    } else {
      this.suggestions = [];
      this.showSuggestions = false;
    }
    // อัปเดต markers real-time
    this.searchChange.emit(this.searchText);
  }

  // กดเลือกหอพักจาก dropdown
  selectSuggestion(dorm: any) {
    this.searchText = dorm.DORM_NAME;
    this.showSuggestions = false;
    this.suggestions = [];
    this.dormSelected.emit(dorm);
  }

  // กด Enter หรือปุ่มค้นหา
  onSearchSubmit() {
    this.showSuggestions = false;
    this.searchSubmit.emit({ text: this.searchText, keepFilter: this.hasActiveFilter });
  }

  clearSearch() {
    this.searchText = '';
    this.suggestions = [];
    this.showSuggestions = false;
    this.searchChange.emit('');
  }

  // ปิด dropdown เมื่อคลิกนอก
  @HostListener('document:click', ['$event'])
  onDocClick(e: Event) {
    const target = e.target as HTMLElement;
    if (!target.closest('.search-section')) {
      this.showSuggestions = false;
    }
  }

  goToLogin() { this.router.navigate(['/login']); }
  goToRegister() { this.router.navigate(['/register']); }

  goToHome() { this.router.navigate(['/home']); }

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
      window.location.reload();
    }
  }

  goToMyAccount() {
    this.router.navigate(['/my-account']);
  }
}