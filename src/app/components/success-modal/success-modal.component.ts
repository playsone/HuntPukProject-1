import { Component, Output, EventEmitter, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { trigger, transition, style, animate } from '@angular/animations';
import { addIcons } from 'ionicons';
import { timeOutline, checkmarkCircle } from 'ionicons/icons';

@Component({
  selector: 'app-success-modal',
  templateUrl: './success-modal.component.html',
  styleUrls: ['./success-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon],
  animations: [
    trigger('popIn', [
      transition(':enter', [
        style({ transform: 'scale(0.85) translateY(20px)', opacity: 0 }),
        animate(
          '350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          style({ transform: 'scale(1) translateY(0)', opacity: 1 })
        )
      ]),
      transition(':leave', [
        animate(
          '180ms ease-in',
          style({ transform: 'scale(0.95)', opacity: 0 })
        )
      ])
    ])
  ]
})
export class SuccessModalComponent implements OnInit {
  @Input() title: string = 'ส่งข้อมูลสำเร็จ!';
  @Input() subTitle: string = 'กำลังรอการอนุมัติ';
  @Input() message: string = 'ระบบได้รับข้อมูลหอพักของคุณแล้ว กรุณารอผู้ดูแลระบบตรวจสอบภายใน 24 ชั่วโมง';
  @Input() icon: string = 'time-outline';
  @Input() buttonText: string = 'ตกลงรับทราบ';
  @Input() showCancelButton: boolean = false;
  @Input() cancelButtonText: string = 'ยกเลิก';

  @Output() confirmed = new EventEmitter<void>();
  @Output() canceled = new EventEmitter<void>();

  isVisible = false;

  constructor() {
    addIcons({ 'time-outline': timeOutline, 'checkmark-circle': checkmarkCircle });
  }

  ngOnInit() {
    setTimeout(() => (this.isVisible = true), 50);
  }

  onOverlayClick(e: Event) {
    // ✅ ตั้งใจไม่ปิดเมื่อคลิก backdrop เพราะเป็นข้อมูลสำคัญที่ต้องกดยืนยันอ่านแล้ว
    // (ตรงกับ backdropDismiss: false ของโค้ดเดิม)
  }

  confirm() {
    this.isVisible = false;
    setTimeout(() => this.confirmed.emit(), 200);
  }

  cancel() {
    this.isVisible = false;
    setTimeout(() => this.canceled.emit(), 200);
  }
}