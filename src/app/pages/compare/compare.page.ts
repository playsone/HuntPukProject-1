import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, NavController, ModalController } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { HttpClientModule, HttpClient, HttpClientJsonpModule } from '@angular/common/http';
import { GoogleMapsModule, MapMarker, MapDirectionsRenderer } from '@angular/google-maps';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DormitoryService } from '../../services/dormitory'; 
import { addIcons } from 'ionicons';
import {  
  checkmarkCircle, arrowBack, locationOutline, wifi, car, snow, 
  cashOutline, layersOutline, callOutline, checkmarkCircleOutline,
  logoFacebook, logoInstagram, logoTwitter, paperPlaneOutline, arrowForwardCircle, 
  location, closeCircle, call, chatbubbleEllipsesOutline, trashOutline, eye,
  mapOutline, timeOutline
} from 'ionicons/icons';
import { AlertModalComponent } from '../../components/alert-modal/alert-modal.component';
import { ThaiDatePipe } from '../../pipes/thai-date-pipe';

@Component({
  selector: 'app-compare',
  templateUrl: './compare.page.html',
  styleUrls: ['./compare.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonicModule, RouterModule,
    HttpClientModule, HttpClientJsonpModule, GoogleMapsModule, MapMarker, MapDirectionsRenderer,
    AlertModalComponent, ThaiDatePipe
  ]
})
export class ComparePage implements OnInit {
  apiLoaded: Observable<boolean>;
  
  isMapModalOpen: boolean = false;
  mapCenter: google.maps.LatLngLiteral = { lat: 16.246, lng: 103.252 };
  tempPin: google.maps.LatLngLiteral | null = null;
  dormMarkers: any[] = [];
  directionsResults: google.maps.DirectionsResult[] = [];

  allDorms: any[] = []; 
  selectedDorms: any[] = []; 
  isComparing: boolean = false;
  compareError: string = '';
  
  // ✅ 1. เพิ่ม State ควบคุม Loading แบบ Native ไม่มีทางค้าง!
  isLoading: boolean = false; 

  maxSelection: number = 3; 
  isLoggedIn: boolean = false;

  // จุดอ้างอิงระยะทาง (ม.มหาสารคาม มอใหม่ เป็น default)
  referencePoint = { lat: 16.246, lng: 103.252 };

  // 📍 Mode การเลือกจุดอ้างอิง: 'me' = ตำแหน่งผู้ใช้, 'map' = จากแผนที่, 'dorm' = จากหอที่เลือก
  refMode: 'me' | 'map' | 'dorm' = 'me';
  refDormIndex: number = 0;
  cameFromOtherPage: boolean = false;
  isLocating: boolean = false;

  constructor(
    private dormService: DormitoryService,
    private router: Router,
    private alertCtrl: AlertController,
    private cdr: ChangeDetectorRef,
    private httpClient: HttpClient,
    private navCtrl: NavController,
    private modalCtrl: ModalController
  ) { 
    addIcons({ 
      checkmarkCircle, arrowBack, locationOutline, wifi, car, snow, 
      cashOutline, layersOutline, callOutline, checkmarkCircleOutline,
      logoFacebook, logoInstagram, logoTwitter, paperPlaneOutline, arrowForwardCircle, 
      location, closeCircle, call, chatbubbleEllipsesOutline, trashOutline
    , eye, mapOutline, timeOutline});
    // โหลด referencePoint จาก localStorage ถ้ามี
    try {
      const stored = localStorage.getItem('userLocation');
      if (stored) {
        const loc = JSON.parse(stored);
        if (loc.lat && loc.lng) this.referencePoint = { lat: loc.lat, lng: loc.lng };
      }
    } catch(e) {}

    if (typeof google === 'object' && typeof google.maps === 'object') {
      this.apiLoaded = of(true);
    } else {
      this.apiLoaded = this.httpClient
        .jsonp(`https://maps.googleapis.com/maps/api/js?key=${environment.GGMAPI}`, 'callback')
        .pipe(
          map(() => true),
          catchError(() => of(false))
        );
    }
  }

  // คำนวณระยะทาง Haversine (กม.)
  calcDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // รัศมีโลก (กม.)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  goToDetail(dorm: any) {
    this.router.navigate(['/dorm-detail', dorm.DORM_ID]);
  }

  ngOnInit() {
    this.checkUserQuota();
    this.fetchDorms();
  }

  checkUserQuota() {
    const stored = localStorage.getItem('loggedIn');
    if (stored) {
      this.isLoggedIn = true;
      this.maxSelection = 5; 
    } else {
      this.isLoggedIn = false;
      this.maxSelection = 2; 
    }
  }

  async fetchDorms() {
    this.compareError = '';
    try {
      const res = await this.dormService.getAllDorms();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        
        // รับค่า compareIds จากการ navigate (เช่น จากหน้า favorites)
        const nav = this.router.getCurrentNavigation();
        const state = nav?.extras.state || history.state;
        const compareIds: number[] = state?.compareIds || [];

        this.allDorms = res.data.map((d: any) => ({ 
          ...d, 
          isChecked: compareIds.includes(d.DORM_ID) || compareIds.includes(d.id) 
        }));

        // ถ้ามีการส่ง compareIds มาให้เริ่มเปรียบเทียบทันที
        if (compareIds.length > 0) {
          this.cameFromOtherPage = true;
          setTimeout(() => {
            this.startCompare();
          }, 300);
        }

      } else {
        this.allDorms = [];
        this.compareError = 'ไม่สามารถโหลดข้อมูลหอพักได้ กรุณาลองใหม่อีกครั้ง';
      }
    } catch (err) {
      console.error(err);
      this.allDorms = [];
      this.compareError = 'เกิดข้อผิดพลาดขณะดึงข้อมูลหอพัก กรุณาลองใหม่อีกครั้ง';
    } finally {
      this.cdr.detectChanges();
    }
  }

  getSelectedCount() {
    return this.allDorms.filter(d => d.isChecked).length;
  }

  clearSelection() {
    this.allDorms.forEach(d => d.isChecked = false);
    this.cdr.detectChanges();
  }

  async onSelectDorm(dorm: any) {
    const selectedCount = this.getSelectedCount();

    if (dorm.isChecked && selectedCount > this.maxSelection) {
      setTimeout(() => { 
        dorm.isChecked = false;
        this.cdr.detectChanges();
      }, 50); 

      let header = 'เกินจำนวนที่กำหนด';
      let msg = this.isLoggedIn 
        ? 'สมาชิกเปรียบเทียบได้สูงสุด 5 หอพักครับ' 
        : 'บุคคลทั่วไปเปรียบเทียบได้สูงสุด 2 หอพัก\n(เข้าสู่ระบบเพื่อเปรียบเทียบได้มากขึ้น)';

      const modal = await this.modalCtrl.create({
        component: AlertModalComponent,
        componentProps: {
          title: header,
          message: msg,
          type: 'warning'
        },
        cssClass: 'custom-alert-modal'
      });
      await modal.present();
    }
  }

  async startCompare() {
    const selectedBasic = this.allDorms.filter((d: any) => d.isChecked);

    if (selectedBasic.length < 2) {
      this.showAlert('แจ้งเตือน', 'กรุณาเลือกหอพักอย่างน้อย 2 แห่งเพื่อเปรียบเทียบ');
      return;
    }

    // ✅ 2. เปิดหน้ากาก Loading แท้
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const results: any[] = [];
      for (const d of selectedBasic) {
         try {
           const res = await this.dormService.getDormById(d.DORM_ID || d.id);
           if (res && res.success && res.data) {
              results.push({ ...d, ...res.data });
           } else {
              results.push(d); 
           }
         } catch (apiErr) {
           results.push(d); 
         }
      }

      // ✅ 3. คำนวณ distance + สลับหน้าเป็นตาราง
      this.selectedDorms = results.map((d: any) => ({
        ...d,
        calcDistance: (d.lat && d.lng)
          ? this.calcDistanceKm(this.referencePoint.lat, this.referencePoint.lng, Number(d.lat), Number(d.lng)).toFixed(1)
          : null
      }));
      this.isComparing = true;

    } catch (error) {
      console.error('Compare Error:', error);
      this.showAlert('ข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลเปรียบเทียบได้');
    } finally {
      // ✅ 4. พอดึงข้อมูลเสร็จค่อยดึงหน้ากาก Loading ออก
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  cancelCompare() {
    this.isComparing = false;
    this.selectedDorms = [];
    this.refMode = 'me';
    this.cdr.detectChanges();
  }

  // 📍 เปลี่ยนจุดอ้างอิงกลับเป็นตำแหน่งผู้ใช้
  setRefMode(mode: 'me') {
    if (this.isLocating) return;
    this.refMode = mode;
    this.isLocating = true;
    
    // โหลด referencePoint จาก localStorage
    try {
      const stored = localStorage.getItem('userLocation');
      if (stored) {
        const loc = JSON.parse(stored);
        if (loc.lat && loc.lng) {
           this.referencePoint = { lat: loc.lat, lng: loc.lng };
           this.recalcDistances();
           this.isLocating = false;
           this.cdr.detectChanges();
           return;
        }
      }
    } catch(e) {}
    
    // ถ้าไม่มีให้ลองใช้ Geolocation API ของ Browser
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        this.referencePoint = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        this.recalcDistances();
        this.isLocating = false;
        this.cdr.detectChanges();
      }, () => {
        // Fallback to default
        this.referencePoint = { lat: 16.246, lng: 103.252 };
        this.recalcDistances();
        this.isLocating = false;
        this.cdr.detectChanges();
      });
    } else {
      this.referencePoint = { lat: 16.246, lng: 103.252 };
      this.recalcDistances();
      this.isLocating = false;
      this.cdr.detectChanges();
    }
  }

  openMapModal() {
    this.isMapModalOpen = true;
    this.tempPin = { ...this.referencePoint };
    this.mapCenter = { ...this.referencePoint };
    this.updateMapMarkers();
    this.calcRoutes(this.tempPin);
    this.cdr.detectChanges();
  }

  closeMapModal() {
    this.isMapModalOpen = false;
    this.cdr.detectChanges();
  }

  onCompareMapClick(event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      this.tempPin = { lat: event.latLng.lat(), lng: event.latLng.lng() };
      this.calcRoutes(this.tempPin);
      this.cdr.detectChanges();
    }
  }

  updateMapMarkers() {
    this.dormMarkers = this.selectedDorms
      .filter(d => d.lat && d.lng)
      .map(d => ({
         position: { lat: Number(d.lat), lng: Number(d.lng) },
         title: d.DORM_NAME
      }));
  }

  calcRoutes(origin: google.maps.LatLngLiteral) {
    this.directionsResults = [];
    if (!origin) return;
    
    const directionsService = new google.maps.DirectionsService();
    
    this.selectedDorms.forEach(dorm => {
      if (dorm.lat && dorm.lng) {
        directionsService.route({
          origin: origin,
          destination: { lat: Number(dorm.lat), lng: Number(dorm.lng) },
          travelMode: google.maps.TravelMode.DRIVING
        }, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            this.directionsResults.push(result);
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  confirmMapPin() {
    if (this.tempPin) {
      this.referencePoint = { ...this.tempPin };
      this.refMode = 'map';
      this.recalcDistances();
    }
    this.isMapModalOpen = false;
    this.cdr.detectChanges();
  }

  // 📍 เปลี่ยนจุดอ้างอิงเป็นหอพักที่เลือก
  setRefToDorm(index: number) {
    const dorm = this.selectedDorms[index];
    if (!dorm || !dorm.lat || !dorm.lng) {
      alert('หอพักนี้ไม่มีผังเดิน GPS ไม่สามารถใช้เป็นจุดอ้างอิงได้');
      return;
    }
    this.refMode = 'dorm';
    this.refDormIndex = index;
    this.referencePoint = { lat: Number(dorm.lat), lng: Number(dorm.lng) };
    this.recalcDistances();
    this.cdr.detectChanges();
  }

  // 🔄 คำนวณระยะทางใหม่ทุกหอจากจุดอ้างอิงปัจจุบัน
  recalcDistances() {
    this.selectedDorms = this.selectedDorms.map((d: any) => ({
      ...d,
      calcDistance: (d.lat && d.lng)
        ? this.calcDistanceKm(this.referencePoint.lat, this.referencePoint.lng, Number(d.lat), Number(d.lng)).toFixed(1)
        : null
    }));
  }

  goBack() {
    if (this.isComparing) {
      if (this.cameFromOtherPage) {
        this.navCtrl.back();
      } else {
        this.cancelCompare();
      }
    } else {
      this.navCtrl.back();
    }
  }

  async showAlert(header: string, msg: string) {
    const modal = await this.modalCtrl.create({
      component: AlertModalComponent,
      componentProps: {
        title: header,
        message: msg,
        type: 'warning'
      },
      cssClass: 'custom-alert-modal'
    });
    await modal.present();
  }

  getWaterLump(item: any): string {
    const v = item.WATER_LUMP ?? item.water_lump;
    if (v === null || v === undefined) return '-';
    if (Number(v) === 0) return 'ไม่ระบุ';
    return v + ' บ./ด.';
  }

}