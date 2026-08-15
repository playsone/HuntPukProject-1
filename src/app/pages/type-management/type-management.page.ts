import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonLabel, IonList, IonItem, IonButton, IonIcon, IonInput, IonItemDivider,
  IonModal, IonButtons, IonSpinner, AlertController, ToastController
} from '@ionic/angular/standalone';
import { DormitoryService } from '../../services/dormitory';
import { MasterType, DormZone } from '../../model/dorm.model';
import { addIcons } from 'ionicons';
import {
  trashOutline, addCircleOutline, locateOutline, locationOutline,
  closeOutline, chevronForwardOutline, arrowBackOutline, saveOutline,
  businessOutline, bedOutline, pricetagOutline, checkmarkCircleOutline, mapOutline, homeOutline
} from 'ionicons/icons';
import { GoogleMapsModule, MapInfoWindow, MapMarker } from '@angular/google-maps';

@Component({
  selector: 'app-type-management',
  templateUrl: './type-management.page.html',
  styleUrls: ['./type-management.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonLabel, IonList, IonItem, IonButton, IonIcon, IonInput, IonItemDivider,
    IonModal, IonButtons, IonSpinner,
    CommonModule, FormsModule, GoogleMapsModule, MapInfoWindow, MapMarker
  ]
})
export class TypeManagementPage implements OnInit {
  selectedSegment: string = 'dormType';

  // ✅ ควบคุมการเปิด/ปิด popup modal ของแต่ละหมวด
  isModalOpen: boolean = false;
  isLoading: boolean = false;
  isSaving: boolean = false;

  @ViewChild(MapInfoWindow) infoWindow!: MapInfoWindow;
  selectedDormForMap: any = null;

  lists: { [key: string]: any[] } = {
    dormType: [],
    roomType: [],
    bedType: [],
    priceType: [],
    dormStatus: [],
    zone: []
  };

  newName: string = '';
  newLat: number | null = null;
  newLng: number | null = null;
  newRadius: number | null = null;

  center: google.maps.LatLngLiteral = { lat: 16.245279, lng: 103.250106 };
  zoom = 14;
  markerPosition: google.maps.LatLngLiteral = { lat: 16.245279, lng: 103.250106 };
  mapOptions: google.maps.MapOptions = { streetViewControl: false, mapTypeControl: false };
  markerOptions: google.maps.MarkerOptions = { draggable: true };

  // ✅ เพิ่ม icon ให้แต่ละ card แยกแยะง่ายขึ้นด้วยตา
  segments = [
    { value: 'dormType', label: 'ประเภทหอพัก', icon: 'home-outline' },
    { value: 'roomType', label: 'ประเภทห้องพัก', icon: 'business-outline' },
    { value: 'bedType', label: 'ประเภทเตียง', icon: 'bed-outline' },
    { value: 'priceType', label: 'ประเภทราคา', icon: 'pricetag-outline' },
    { value: 'dormStatus', label: 'สถานะหอพัก', icon: 'checkmark-circle-outline' },
    { value: 'zone', label: 'โซนหอพัก', icon: 'map-outline' }
  ];

  highlightItem: string = '';
  existingZoneMarkers: { position: google.maps.LatLngLiteral; title: string; radius: number }[] = [];

  constructor(
    private dormServices: DormitoryService,
    private alertController: AlertController,
    private toastCtrl: ToastController,
    private router: Router,
    private route: ActivatedRoute
  ) {
    addIcons({
      trashOutline, addCircleOutline, locateOutline, locationOutline,
      closeOutline, chevronForwardOutline, arrowBackOutline, saveOutline,
      businessOutline, bedOutline, pricetagOutline, checkmarkCircleOutline, mapOutline, homeOutline
    });
  }

  // ✅ ปุ่มกลับ — ปรับ path ปลายทางตามที่ต้องการ (เช่น dashboard ของแอดมิน)
  goBack() {
    this.router.navigate(['/dashboard']);
  }

  ngOnInit() {
    // Read queryParams from dashboard (tab + highlight)
    const params = this.route.snapshot.queryParams;
    if (params['tab']) {
      this.selectedSegment = params['tab'];
      setTimeout(() => {
        this.openSegment(this.selectedSegment);
      }, 500);
    }
    if (params['highlight']) {
      this.highlightItem = params['highlight'];
    }
    this.loadAllData();
  }

  loadAllData() {
    this.isLoading = true;
    const tasks = [
      new Promise(r => this.dormServices.getDormTypes().subscribe({ next: (res: any) => { this.lists['dormType'] = res.data || res; r(null); }, error: () => r(null) })),
      new Promise(r => this.dormServices.getRoomTypes().subscribe({ next: (res: any) => { this.lists['roomType'] = res.data || res; r(null); }, error: () => r(null) })),
      new Promise(r => this.dormServices.getBedTypes().subscribe({ next: (res: any) => { this.lists['bedType'] = res.data || res; r(null); }, error: () => r(null) })),
      new Promise(r => this.dormServices.getPriceTypes().subscribe({ next: (res: any) => { this.lists['priceType'] = res.data || res; r(null); }, error: () => r(null) })),
      new Promise(r => this.dormServices.getDormStatuses().subscribe({ next: (res: any) => { this.lists['dormStatus'] = res.data || res; r(null); }, error: () => r(null) })),
      this.dormServices.getZones().then((res: any) => { this.lists['zone'] = res.data || []; }).catch(() => {})
    ];
    Promise.all(tasks).finally(() => this.isLoading = false);
  }

  // ✅ เปิด popup สำหรับหมวดที่กด พร้อมรีเซ็ตฟอร์ม
  openSegment(value: string) {
    this.selectedSegment = value;
    this.newName = '';
    this.newLat = null;
    this.newLng = null;
    this.newRadius = null;
    this.editingItemId = null;
    this.isModalOpen = true;
    // Load existing zones as markers when opening zone segment
    if (value === 'zone') {
      this.loadExistingZoneMarkers();
    }
  }

  // ✅ ปิด popup
  closeModal() {
    this.isModalOpen = false;
    this.existingZoneMarkers = [];
    this.editingItemId = null;
  }

  dormMarkers: any[] = [];

  async loadExistingZoneMarkers() {
    try {
      const res = await this.dormServices.getZones();
      if (res?.success && res?.data?.length) {
        this.existingZoneMarkers = res.data
          .filter((z: any) => z.lat && z.lng)
          .map((z: any) => ({
            position: { lat: parseFloat(z.lat), lng: parseFloat(z.lng) },
            title: z.ZONE_NAME || z.name || 'ไม่ระบุชื่อ',
            radius: z.RADIUS || z.radius || 500
          }));
        if (this.existingZoneMarkers.length > 0) {
          this.center = { ...(this.existingZoneMarkers[0]!.position) };
        }
      }

      const dormRes = await this.dormServices.getAllDormsAdmin();
      if (dormRes?.success && dormRes?.data?.length) {
        this.dormMarkers = dormRes.data
          .filter((d: any) => (d.lat || d.LAT) && (d.lng || d.LNG))
          .map((d: any) => ({
            lat: parseFloat(d.lat || d.LAT),
            lng: parseFloat(d.lng || d.LNG),
            dormName: d.DORM_NAME || d.name
          }));
      }
    } catch (e) {
      console.error('Failed to load existing zone markers', e);
    }
  }

  get filteredDorms() {
    return this.dormMarkers;
  }

  getDormMarkerOptions(dorm: any): google.maps.MarkerOptions {
    const svgIcon = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22%232563eb%22%20stroke%3D%22%23ffffff%22%20stroke-width%3D%221%22%20width%3D%2232px%22%20height%3D%2232px%22%3E%3Cpath%20d%3D%22M12%203L2%2012h3v8h5v-6h4v6h5v-8h3L12%203z%22%2F%3E%3C%2Fsvg%3E';
    return {
      icon: {
        url: svgIcon,
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16)
      },
      title: dorm.dormName || 'หอพัก',
      zIndex: 5
    };
  }

  onDormMarkerClick(marker: MapMarker, dorm: any) {
    this.selectedDormForMap = dorm;
    this.infoWindow.open(marker);
  }

  isLocating: boolean = false;

  getCurrentLocation() {
    this.isLocating = true;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.newLat = parseFloat(position.coords.latitude.toFixed(6));
          this.newLng = parseFloat(position.coords.longitude.toFixed(6));
          this.center = { lat: this.newLat, lng: this.newLng };
          this.markerPosition = { ...this.center };
          this.isLocating = false;
        },
        async (error) => { 
          console.error('ไม่สามารถดึงตำแหน่งได้:', error);
          this.isLocating = false;
          const alert = await this.alertController.create({
            header: 'ไม่สามารถดึงพิกัดได้',
            message: 'กรุณาเปิด GPS หรือตรวจสอบการตั้งค่าเบราว์เซอร์ว่าอนุญาตให้เข้าถึงตำแหน่ง (Location) หรือไม่',
            buttons: ['ตกลง']
          });
          await alert.present();
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      this.isLocating = false;
      this.alertController.create({
        header: 'เบราว์เซอร์ไม่รองรับ',
        message: 'อุปกรณ์หรือเบราว์เซอร์ของคุณไม่รองรับการดึงตำแหน่งปัจจุบัน',
        buttons: ['ตกลง']
      }).then(a => a.present());
    }
  }

  onMapClick(event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      this.newLat = parseFloat(event.latLng.lat().toFixed(6));
      this.newLng = parseFloat(event.latLng.lng().toFixed(6));
      this.markerPosition = { lat: this.newLat, lng: this.newLng };
    }
  }

  onMarkerDragEnd(event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      this.newLat = parseFloat(event.latLng.lat().toFixed(6));
      this.newLng = parseFloat(event.latLng.lng().toFixed(6));
    }
  }

  onInputCoordChange() {
    if (this.newLat && this.newLng) {
      this.markerPosition = { lat: Number(this.newLat), lng: Number(this.newLng) };
      this.center = { ...this.markerPosition };
    }
  }

  get currentList(): any[] {
    const key = this.selectedSegment as keyof typeof this.lists;
    return (this.lists[key] ?? []) as any[];
  }

  get currentLabel() {
    return this.segments.find(s => s.value === this.selectedSegment)?.label || '';
  }

  editingItemId: number | null = null;

  async addType() {
    if (!this.newName.trim()) return;

    const currentList = (this.lists[this.selectedSegment] ?? []) as any[];
    const existing = currentList.find((i: any) => (i?.name || i?.ZONE_NAME) === this.newName.trim());
    if (existing) {
      const alert = await this.alertController.create({
        header: 'แจ้งเตือน',
        message: `มีข้อมูลชื่อ "${this.newName.trim()}" อยู่ในระบบแล้วครับ`,
        buttons: ['ตกลง']
      });
      await alert.present();
      return;
    }

    const alert = await this.alertController.create({
      header: 'ยืนยันการเพิ่ม',
      message: `คุณต้องการเพิ่ม "${this.newName}" ในหมวดหมู่ ${this.currentLabel} ใช่หรือไม่?`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        { text: 'เพิ่ม', handler: () => this.executeAddType() }
      ]
    });
    await alert.present();
  }

  executeAddType() {
    let obs$;
    switch (this.selectedSegment) {
      case 'dormType': obs$ = this.dormServices.addDormType(this.newName); break;
      case 'roomType': obs$ = this.dormServices.addRoomType(this.newName); break;
      case 'bedType': obs$ = this.dormServices.addBedType(this.newName); break;
      case 'priceType': obs$ = this.dormServices.addPriceType(this.newName); break;
      case 'dormStatus': obs$ = this.dormServices.addDormStatus(this.newName); break;
      case 'zone': obs$ = this.dormServices.addZone(this.newName, this.newLat || 0, this.newLng || 0, this.newRadius || 500); break;
    }

    if (obs$) {
      this.isSaving = true;
      obs$.subscribe({
        next: () => {
          this.newName = '';
          this.newLat = null;
          this.newLng = null;
          this.newRadius = null;
          this.loadAllData();
          this.showToast('เพิ่มข้อมูลสำเร็จ!', 'success');
        },
        error: (err: any) => {
          this.showToast('เกิดข้อผิดพลาด กรุณาลองใหม่', 'danger');
        },
        complete: () => this.isSaving = false
      });
    }
  }

  async confirmDelete(item: any) {
    const id = item.id || item.ZONE_ID;
    const name = item.name || item.ZONE_NAME;

    const alert = await this.alertController.create({
      header: 'ยืนยันการลบ',
      message: `คุณต้องการลบ "${name}" ใช่หรือไม่?`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        { text: 'ลบ', role: 'destructive', handler: () => this.deleteType(id) }
      ]
    });
    await alert.present();
  }

  async editType(item: any) {
    this.editingItemId = item.id || item.ZONE_ID;
    this.newName = item.name || item.ZONE_NAME;

    if (this.selectedSegment === 'zone') {
      this.newLat = item.lat || item.LAT;
      this.newLng = item.lng || item.LNG;
      this.newRadius = item.radius || item.RADIUS || 500;
      if (this.newLat && this.newLng) {
        this.center = { lat: Number(this.newLat), lng: Number(this.newLng) };
        this.markerPosition = { ...this.center };
      }
    }

    // Scroll to top to show map and form
    const modalContent = document.querySelector('.modal-content');
    if (modalContent) {
      (modalContent as any).scrollToTop?.(500);
    }
  }

  cancelEdit() {
    this.editingItemId = null;
    this.newName = '';
    this.newLat = null;
    this.newLng = null;
    this.newRadius = null;
  }

  async saveEdit() {
    if (!this.newName.trim() || !this.editingItemId) return;

    const currentList = (this.lists[this.selectedSegment] ?? []) as any[];
    const existing = currentList.find((i: any) => 
      (i?.name || i?.ZONE_NAME) === this.newName.trim() && 
      (i?.id || i?.ZONE_ID) !== this.editingItemId
    );
    
    if (existing) {
      const alert = await this.alertController.create({
        header: 'แจ้งเตือน',
        message: `มีข้อมูลชื่อ "${this.newName.trim()}" อยู่ในระบบแล้วครับ`,
        buttons: ['ตกลง']
      });
      await alert.present();
      return;
    }

    this.executeEditType(this.editingItemId, this.newName.trim(), this.newLat || undefined, this.newLng || undefined, this.newRadius || undefined);
  }

  executeEditType(id: number, newName: string, lat?: number, lng?: number, radius?: number) {
    let apiType = '';
    switch (this.selectedSegment) {
      case 'dormType': apiType = 'dorm'; break;
      case 'roomType': apiType = 'room'; break;
      case 'bedType': apiType = 'bed'; break;
      case 'priceType': apiType = 'price'; break;
      case 'dormStatus': apiType = 'status'; break;
      case 'zone': apiType = 'zone'; break;
    }
    
    if (!apiType) return;
    if (!newName || !newName.trim()) return;

    this.isSaving = true;
    this.dormServices.updateMasterType(apiType, id, newName, lat, lng, radius).subscribe({
      next: (res) => {
        if (res.success) {
          this.loadAllData();
          if (apiType === 'zone') {
             this.loadExistingZoneMarkers();
          }
          this.cancelEdit();
        } else {
          this.alertController.create({
            header: 'ข้อผิดพลาด',
            message: res.message || 'ไม่สามารถแก้ไขข้อมูลได้',
            buttons: ['ตกลง']
          }).then(a => a.present());
        }
      },
      error: (err) => {
        console.error(err);
        this.alertController.create({
          header: 'เกิดข้อผิดพลาด',
          message: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้',
          buttons: ['ตกลง']
        }).then(a => a.present());
      },
      complete: () => this.isSaving = false
    });
  }

  deleteType(id: number) {
    let obs$;
    switch (this.selectedSegment) {
      case 'dormType': obs$ = this.dormServices.deleteDormType(id); break;
      case 'roomType': obs$ = this.dormServices.deleteRoomType(id); break;
      case 'bedType': obs$ = this.dormServices.deleteBedType(id); break;
      case 'priceType': obs$ = this.dormServices.deletePriceType(id); break;
      case 'dormStatus': obs$ = this.dormServices.deleteDormStatus(id); break;
      case 'zone': obs$ = this.dormServices.deleteZone(id); break;
    }

    if (obs$) {
      obs$.subscribe({
        next: () => {
          this.loadAllData();
          this.showToast('ลบเรียบร้อย!', 'success');
        },
        error: (err: any) => this.showToast('ไม่สามารถลบได้ อาจเป็นเพราะข้อมูลถูกใช้งานอยู่', 'warning')
      });
    }
  }

  async showToast(message: string, color: string = 'dark') {
    const toast = await this.toastCtrl.create({ message, duration: 2200, color, position: 'bottom' });
    toast.present();
  }
}