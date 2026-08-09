import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { downloadOutline, arrowBackOutline, homeOutline } from 'ionicons/icons';
import { Router } from '@angular/router';

@Component({
  selector: 'app-download-app',
  templateUrl: './download-app.page.html',
  styleUrls: ['./download-app.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class DownloadAppPage implements OnInit {

  constructor(private router: Router) { 
    addIcons({ downloadOutline, arrowBackOutline, homeOutline });
  }

  ngOnInit() {
  }

  goHome() {
    this.router.navigate(['/home']);
  }
}
