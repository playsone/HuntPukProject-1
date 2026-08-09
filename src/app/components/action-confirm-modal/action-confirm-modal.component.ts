import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-action-confirm-modal',
  templateUrl: './action-confirm-modal.component.html',
  styleUrls: ['./action-confirm-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
  animations: [
    trigger('popIn', [
      transition(':enter', [
        style({ transform: 'scale(0.85) translateY(20px)', opacity: 0 }),
        animate(
          '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          style({ transform: 'scale(1) translateY(0)', opacity: 1 })
        )
      ])
    ])
  ]
})
export class ActionConfirmModalComponent implements OnInit {
  @Input() title: string = 'ยืนยัน';
  @Input() message: string = 'คุณต้องการดำเนินการต่อใช่หรือไม่?';
  @Input() confirmText: string = 'ตกลง';
  @Input() cancelText: string = 'ยกเลิก';
  @Input() type: 'confirm' | 'danger' | 'warning' = 'confirm'; 
  @Input() showCancel: boolean = true;

  iconColor: string = '#ffc409';
  iconBgColor: string = '#ffc40920';

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
      if (this.type === 'danger') {
          this.iconColor = '#f44336';
          this.iconBgColor = '#f4433620';
      } else if (this.type === 'warning') {
          this.iconColor = '#ff9800';
          this.iconBgColor = '#ff980020';
      }
  }

  cancel() {
    this.modalCtrl.dismiss(null, 'cancel');
  }
  
  confirm() {
    this.modalCtrl.dismiss(null, 'confirm');
  }
}
