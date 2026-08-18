import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonBackButton, IonButton, IonIcon,
  IonLabel, IonItem, IonInput, IonTextarea, IonSelect, IonSelectOption,
  IonCheckbox, IonList, IonSpinner, LoadingController, ToastController, AlertController, ActionSheetController, ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  saveOutline, imageOutline, homeOutline, wifi,
  bedOutline, trashOutline, addCircleOutline, locationOutline, cloudUploadOutline, closeCircle,
  locateOutline, documentTextOutline, arrowBackOutline, arrowForwardOutline, imagesOutline,
  personOutline, personAddOutline, bulbOutline, checkmarkCircle, timeOutline, snowOutline, waterOutline, shirtOutline, shieldCheckmarkOutline, flashOutline, carOutline, pawOutline, barbellOutline, restaurantOutline, cubeOutline,
  refreshOutline, listOutline, homeOutline as homeOutlineIcon, checkmarkCircleOutline, searchOutline, alertCircleOutline, eyeOutline, closeCircleOutline } from 'ionicons/icons';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { DormitoryService } from '../../../services/dormitory';
import { lastValueFrom } from 'rxjs';
import { GoogleMapsModule, MapInfoWindow, MapMarker, MapCircle } from '@angular/google-maps';
import { SuccessModalComponent } from '../../../components/success-modal/success-modal.component';
import { DormDetailPage } from '../../dorm-detail/dorm-detail.page';
import { UserService } from '../../../services/user';

addIcons({
  saveOutline, homeOutline, locationOutline, wifi,
  bedOutline, addCircleOutline, trashOutline, imageOutline,
  cloudUploadOutline, closeCircle, locateOutline, documentTextOutline,
  arrowBackOutline, arrowForwardOutline, imagesOutline, personOutline, personAddOutline,
  bulbOutline, checkmarkCircle, timeOutline, snowOutline, waterOutline, shirtOutline,
  shieldCheckmarkOutline, flashOutline, carOutline, pawOutline, barbellOutline,
  restaurantOutline, cubeOutline, refreshOutline, listOutline, checkmarkCircleOutline, searchOutline
});

@Component({
  selector: 'app-dorm-form',
  templateUrl: './dorm-form.page.html',
  styleUrls: ['./dorm-form.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonButtons, IonBackButton, IonButton, IonIcon,
    IonLabel, IonItem, IonInput, IonTextarea, IonSelect, IonSelectOption,
    IonCheckbox, IonList, IonSpinner, GoogleMapsModule, MapInfoWindow, MapMarker, MapCircle,
    SuccessModalComponent, DormDetailPage, RouterModule
  ]
})
export class DormFormPage implements OnInit {
  @ViewChild('infoWindow') infoWindow!: MapInfoWindow;
  @ViewChild('dormInfoWindow') dormInfoWindow!: MapInfoWindow;
  @ViewChild('userMarker') marker!: MapMarker;

  duplicateDormName: string | null = null;
  selectedDormForMap: any = null;

  currentStep: number = 1;
  dormId: number = 0;
  isResubmitMode: boolean = false;
  existingGallery: string[] = [];

  // ✅ ควบคุมการแสดง popup สำเร็จแบบ custom (แทน alertCtrl ที่ไม่ render HTML)
  showSuccessModal: boolean = false;

  // ✅ แสดง Preview ก่อนส่งข้อมูล
  showPreviewModal: boolean = false;

  formState: 'editing' | 'pending' | 'rejected' = 'editing';
  rejectReason: string = '';
  
  isReadOnly: boolean = false;
  isLocating: boolean = false; // For map location loading state
  isApproved: boolean = false;
  isSubmitting: boolean = false;



  // ✅ เก็บข้อมูล user เต็มๆ ไว้ใช้ตลอด
  currentUser: any = null;
  ownerId: number = 0;       // USER_ID จาก USERS table
  isAdmin: boolean = false;  // true ถ้า ROLE_TYPE_ID === 3

  formData: any = {
    name: '', address: '',
    lat: 16.245279, lng: 103.250106,
    zone_id: 1,
    type_id: 1,
    water_unit: null, water_lump: null, elect_unit: null, detail: '',
    new_facilities: [] // { name: string, icon: string }
  };

  zones: any[] = [];
  facilities: any[] = [];
  roomTypes: any[] = [];
  priceTypes: any[] = [];
  
  // ✅ สำหรับตัวเลือกจาก Database
  dormTypesDB: any[] = [];
  roomTypesDB: any[] = [];
  bedTypesDB: any[] = [];
  currentZoneName: string = 'กรุณาปักหมุดเพื่อเลือกตำแหน่งหอพักและโซน';
  overlappingZones: any[] = [];

  // ✅ สำหรับแอดมินเลือกเจ้าของหอพัก
  dormOwners: any[] = [];
  selectedOwnerId: number | null = null;

  selectedFiles: any = {
    FRONT_DORM_IMG: null, LICENSE_IMG: null,
    BED_IMG: null, WALL_IMG: null, CEILING_IMG: null,
    FLOOR_IMG: null, BATHROOM_IMG: null, BALCONY_IMG: null,
    OTHER_IMG: []
  };
  previews: any = {
    FRONT_DORM_IMG: null, LICENSE_IMG: null,
    BED_IMG: null, WALL_IMG: null, CEILING_IMG: null,
    FLOOR_IMG: null, BATHROOM_IMG: null, BALCONY_IMG: null,
    OTHER_IMG: []
  };

  center: google.maps.LatLngLiteral = { lat: 16.245279, lng: 103.250106 };
  zoom = 15;
  markerPosition: google.maps.LatLngLiteral = { lat: 16.245279, lng: 103.250106 };
  mapOptions: google.maps.MapOptions = { streetViewControl: false, mapTypeControl: false };
  markerOptions: google.maps.MarkerOptions = { draggable: true };
  
  zoneCenter: google.maps.LatLngLiteral | null = null;
  zoneRadius: number = 500; // 500 meters
  circleOptions: google.maps.CircleOptions = {
    fillColor: '#4285F4', fillOpacity: 0.15,
    strokeColor: '#4285F4', strokeOpacity: 0.6, strokeWeight: 2,
    clickable: false  // ✅ ทำให้คลิกผ่านวงกลมไปยังแผนที่ได้
  };
  zoneMarkerOptions: google.maps.MarkerOptions = { 
    icon: { url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' }
  };
  
  allDorms: any[] = [];
  get filteredDorms(): any[] {
    if (!this.formData.zone_id) return [];
    return this.allDorms.filter(dorm => dorm.ZONE_ID === this.formData.zone_id);
  }
  geocoder: any;


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dormService: DormitoryService,
    private userService: UserService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private actionSheetCtrl: ActionSheetController,
    private modalCtrl: ModalController
  ) {
      addIcons({arrowBackOutline,personOutline,personAddOutline,homeOutline,locationOutline,locateOutline,wifi,bulbOutline,alertCircleOutline,closeCircle,cloudUploadOutline,bedOutline,addCircleOutline,trashOutline,documentTextOutline,imageOutline,imagesOutline,arrowForwardOutline,searchOutline,timeOutline,checkmarkCircleOutline,listOutline,eyeOutline,closeCircleOutline,refreshOutline});}

  isFacImage(fac: any): boolean {
    const iconPath = fac?.FAC_TYPE_ICON || fac?.icon || '';
    return iconPath.includes('/') || iconPath.includes('.png');
  }

  getFacIconPath(fac: any): string {
    let iconPath = fac?.FAC_TYPE_ICON || fac?.icon || '';
    if (!iconPath) return '';
    if (iconPath.startsWith('assets/icon/')) {
      return iconPath.replace('assets/icon/', 'assets/allIcons/');
    }
    return iconPath;
  }

  async ngOnInit() {
    // ✅ FIX: รองรับทุก key ที่ backend อาจส่งกลับมาใน localStorage
    const stored = localStorage.getItem('loggedIn');
    if (!stored) {
      this.showToast('กรุณาเข้าสู่ระบบก่อน', 'danger');
      this.router.navigate(['/login']);
      return;
    }

    try {
      this.currentUser = JSON.parse(stored);
      // รองรับทุกรูปแบบ key ที่ backend อาจส่งมา
      this.ownerId =
        this.currentUser?.USER_ID ??
        this.currentUser?.user_id ??
        this.currentUser?.userId ??
        this.currentUser?.id ??
        0;

      // ✅ ตรวจสอบ role: 3 = Admin, 2 = Dorm Owner
      const roleId =
        this.currentUser?.ROLE_TYPE_ID ??
        this.currentUser?.role_id ??
        this.currentUser?.roleId ??
        1;
      this.isAdmin = (roleId === 3);

      console.log('👤 currentUser:', this.currentUser);
      console.log('🔑 ownerId:', this.ownerId, '| isAdmin:', this.isAdmin, '| roleId:', roleId);

      if (!this.ownerId) {
        this.showToast('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่', 'danger');
        this.router.navigate(['/login']);
        return;
      }

      // ✅ ถ้าไม่ใช่ Admin และไม่ใช่ Dorm Owner → ไม่มีสิทธิ์
      if (roleId !== 2 && roleId !== 3) {
        this.showToast('คุณไม่มีสิทธิ์ลงทะเบียนหอพัก', 'danger');
        this.router.navigate(['/home']);
        return;
      }
      
      if (this.isAdmin) {
        this.loadDormOwners();
      }
    } catch (e) {
      console.error('❌ Parse localStorage error:', e);
      this.showToast('ข้อมูล Session ผิดพลาด กรุณา Login ใหม่', 'danger');
      this.router.navigate(['/login']);
      return;
    }

    this.route.paramMap.subscribe(async (params) => {
      const idParam = params.get('id');
      
      if (this.zones.length === 0) {
        await this.loadInitialData();
      }
      this.resetForm();

      if (idParam) {
        this.dormId = Number(idParam);
        this.isResubmitMode = true;
        await this.loadDormData(this.dormId);
      }
    });
  }

  // ย้อนกลับโดยดูว่าเข้ามาจากหน้าไหน
  goBack() {
    const from = this.route.snapshot.queryParamMap.get('from');
    if (from === 'manage-dorm') {
      this.router.navigate(['/manage-dorm']);
    } else {
      this.router.navigate(['/my-dorms']);
    }
  }

  async loadDormOwners() {
    this.dormOwners = await this.userService.getDormOwners();
    if (this.dormOwners.length > 0) {
      this.selectedOwnerId = this.ownerId; // ค่าเริ่มต้นคือตัวแอดมินเอง
    }
  }

  async loadInitialData() {
    try {
      const zoneRes = await this.dormService.getZones();
      if (zoneRes.success) this.zones = zoneRes.data;

      // ✅ โหลดตัวเลือกอื่นๆ จาก DB
      const dtRes: any = await lastValueFrom(this.dormService.getDormTypes());
      this.dormTypesDB = Array.isArray(dtRes) ? dtRes : (dtRes?.data || []);
      
      const rtRes: any = await lastValueFrom(this.dormService.getRoomTypes());
      this.roomTypesDB = Array.isArray(rtRes) ? rtRes : (rtRes?.data || []);

      const btRes: any = await lastValueFrom(this.dormService.getBedTypes());
      this.bedTypesDB = Array.isArray(btRes) ? btRes : (btRes?.data || []);

      // ✅ FIX: รองรับทั้ง array ตรงๆ และแบบห่อ {data: [...]}
      const facRes: any = await lastValueFrom(this.dormService.getFacilities());
      const facArray = Array.isArray(facRes) ? facRes : (facRes?.data || []);

      if (facArray.length > 0) {
        this.facilities = facArray.map((f: any) => ({
          id: f.FAC_TYPE_ID,
          name: f.FAC_TYPE_NAME,
          icon: f.FAC_TYPE_ICON || '',
          // ✅ FIX: ตรวจสอบว่า icon เป็น Font Awesome class หรือ URL
          isFontAwesome: f.FAC_TYPE_ICON &&
            !f.FAC_TYPE_ICON.startsWith('http') &&
            !f.FAC_TYPE_ICON.startsWith('/') &&
            !f.FAC_TYPE_ICON.startsWith('assets'),
          checked: false
        }));
      }

      // โหลด priceTypes
      const priceRes: any = await lastValueFrom(this.dormService.getPriceTypes());
      if (priceRes && priceRes.success && priceRes.data) {
        this.priceTypes = priceRes.data;
      }
      
      // Load all dorms for duplicate check
      const dormsRes: any = await this.dormService.getAllDorms();
      if (dormsRes && dormsRes.data) {
        this.allDorms = dormsRes.data;
      }

      // (No longer auto-calculating zone)
      setTimeout(() => window.dispatchEvent(new Event('resize')), 500);
    } catch (error) {
      console.error('❌ loadInitialData error:', error);
    }
  }

  resetForm() {
    this.currentStep = 1;
    this.formData = {
      name: '', address: '',
      lat: 16.245279, lng: 103.250106,
      zone_id: 1, type_id: 1,
      water_unit: null, water_lump: null, elect_unit: null, detail: '',
      new_facilities: []
    };
    
    if (this.dormTypesDB.length > 0) this.formData.type_id = this.dormTypesDB[0].id || this.dormTypesDB[0].DORM_TYPE_ID;

    this.facilities.forEach(f => f.checked = false);

    // ✅ ห้องเริ่มต้น 1 ห้อง
    this.roomTypes = [{
      id: null,
      selectedType: this.roomTypesDB.length > 0 ? (this.roomTypesDB[0].name || this.roomTypesDB[0].ROOM_TYPE_NAME) : 'ห้องแอร์',
      roomType: this.roomTypesDB.length > 0 ? (this.roomTypesDB[0].name || this.roomTypesDB[0].ROOM_TYPE_NAME) : 'ห้องแอร์',
      bedType: this.bedTypesDB.length > 0 ? (this.bedTypesDB[0].id || this.bedTypesDB[0].BED_TYPE_ID)?.toString() : '1',
      prices: this.priceTypes.map(pt => ({ priceTypeId: pt.id, name: pt.name, price: null }))
    }];

    this.selectedFiles = {
      FRONT_DORM_IMG: null, LICENSE_IMG: null,
      BED_IMG: null, WALL_IMG: null, CEILING_IMG: null,
      FLOOR_IMG: null, BATHROOM_IMG: null, BALCONY_IMG: null,
      OTHER_IMG: []
    };
    this.previews = {
      FRONT_DORM_IMG: null, LICENSE_IMG: null,
      BED_IMG: null, WALL_IMG: null, CEILING_IMG: null,
      FLOOR_IMG: null, BATHROOM_IMG: null, BALCONY_IMG: null,
      OTHER_IMG: []
    };

    this.center = { lat: 16.245279, lng: 103.250106 };
    this.markerPosition = { lat: 16.245279, lng: 103.250106 };
  }


  async loadDormData(id: number) {
    const loading = await this.loadingCtrl.create({ message: 'กำลังโหลดข้อมูลหอพักเดิม...' });
    await loading.present();

    try {
      const res = await this.dormService.getDormById(id);
      if (res.success) {
        const d = res.data;
          
        this.isApproved = (d.REQ_STATUS === 1);
        
        if (d.REQ_STATUS === 2) {
           this.isReadOnly = true;
           this.formState = 'rejected';
           this.rejectReason = d.REJECT_REASON || 'ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง';
        } else if (d.REQ_STATUS === 0 || d.REQ_STATUS === 3) {
           this.isReadOnly = true;
           this.formState = 'pending';
        } else if (d.REQ_STATUS === 4) {
           this.isReadOnly = false;
           this.formState = 'editing';
        } else {
           // REQ_STATUS = 1 (Approved) goes here
           this.isReadOnly = true;
           this.formState = 'editing';
        }
        
        this.markerOptions = { draggable: !this.isReadOnly };

        this.formData = {
          name: d.DORM_NAME,
          address: d.ADDRESS,
          lat: parseFloat(d.lat) || 16.245279,
          lng: parseFloat(d.lng) || 103.250106,
          zone_id: d.ZONE_ID,
          type_id: d.DORM_TYPE_ID,
          water_unit: d.WATER_UNIT || 0,
          water_lump: d.WATER_LUMP || 0,
          elect_unit: d.ELECT_UNIT || 0,
          detail: d.ADD_DORM_DATA || '',
          new_facilities: d.new_facilities ? d.new_facilities.map((nf: any) => ({
            name: nf.name || nf.FAC_NAME || '',
            icon: nf.icon || nf.FAC_ICON || 'cube-outline'
          })) : []
        };

        this.center = { lat: this.formData.lat, lng: this.formData.lng };
        this.markerPosition = { lat: this.formData.lat, lng: this.formData.lng };

        const dormFacs = d.facilities || [];
        this.facilities.forEach((fac: any) => {
          if (dormFacs.some((df: any) => df.name === fac.name)) {
             fac.checked = true;
          }
        });

        if (d.rooms && d.rooms.length > 0) {
          this.roomTypes = d.rooms.map((r: any) => {
            const mappedPrices = this.priceTypes.map(pt => {
              const existing = r.prices?.find((rp: any) => rp.priceTypeId === pt.id);
              return { priceTypeId: pt.id, name: pt.name, price: existing ? existing.price : null };
            });
            const selectedType = r.ROOM_TYPE_NAME;
            let matchedBedId = '1';
            const bedNameLower = (r.bedType || '').toLowerCase();
            if (bedNameLower.includes('double') || bedNameLower.includes('คู่')) {
               const bmatch = this.bedTypesDB.find(bt => (bt.name || bt.BED_TYPE_NAME || '').toLowerCase().includes('คู่'));
               if(bmatch) matchedBedId = (bmatch.id || bmatch.BED_TYPE_ID).toString();
            } else {
               const bmatch = this.bedTypesDB.find(bt => (bt.name || bt.BED_TYPE_NAME || '').toLowerCase().includes('เดี่ยว'));
               if(bmatch) matchedBedId = (bmatch.id || bmatch.BED_TYPE_ID).toString();
            }
            return {
              id: r.ROOM_TYPE_ID,
              selectedType: selectedType,
              roomType: r.ROOM_TYPE_NAME,
              bedType: matchedBedId,
              prices: mappedPrices
            };
          });
        }

        this.previews.FRONT_DORM_IMG = d.FRONT_DORM_IMAGE || d.image || null;
        this.previews.LICENSE_IMG = d.DORM_LICENSE || null;
        this.previews.BED_IMG = d.bed_img || null;
        this.previews.WALL_IMG = d.wall_img || null;
        this.previews.CEILING_IMG = d.ceiling_img || null;
        this.previews.FLOOR_IMG = d.floor_img || null;
        this.previews.BATHROOM_IMG = d.bathroom_img || null;
        this.previews.BALCONY_IMG = d.balcony_img || null;
        this.existingGallery = d.gallery || [];
      }
      setTimeout(() => window.dispatchEvent(new Event('resize')), 500);
    } catch (error) {
      this.showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  // ==========================
  // Multi-Zone Detection & Selection
  // ==========================
  async detectAndSelectZone(lat: number, lng: number) {
    if (!this.zones || this.zones.length === 0) return;

    // Find all zones whose radius covers this pin
    const matchingZones = this.zones.filter((zone: any) => {
      if (zone.lat == null || zone.lng == null) return false;
      const distM = this.getDistanceFromLatLonInKm(lat, lng, zone.lat, zone.lng) * 1000;
      return distM <= (zone.ZONE_RADIUS || this.zoneRadius);
    });

    if (matchingZones.length === 0) {
      // No zone covers the pin — fall back to nearest
      let minDistance = Infinity;
      let nearestZone = this.zones[0];
      for (const zone of this.zones) {
        if (zone.lat != null && zone.lng != null) {
          const dist = this.getDistanceFromLatLonInKm(lat, lng, zone.lat, zone.lng);
          if (dist < minDistance) { minDistance = dist; nearestZone = zone; }
        }
      }
      this.applyZone(nearestZone);
      this.showToast(`ไม่อยู่ในรัศมีโซนใด — เลือกโซนใกล้ที่สุด: ${nearestZone.ZONE_NAME}`, 'warning');
    } else if (matchingZones.length === 1) {
      this.applyZone(matchingZones[0]);
    } else {
      // Multiple overlapping zones — let user choose
      const buttons = matchingZones.map((zone: any) => ({
        text: zone.ZONE_NAME,
        handler: () => { this.applyZone(zone); }
      }));
      buttons.push({ text: 'ยกเลิก', handler: () => {} } as any);

      const sheet = await this.actionSheetCtrl.create({
        header: '🗺️ ตำแหน่งนี้อยู่ใน ' + matchingZones.length + ' โซน — กรุณาเลือกโซน',
        buttons
      });
      await sheet.present();
    }
  }

  applyZone(zone: any) {
    this.formData.zone_id = zone.ZONE_ID;
    this.currentZoneName = zone.ZONE_NAME;
    if (zone.lat && zone.lng) {
      this.zoneCenter = { lat: zone.lat, lng: zone.lng };
      this.zoneRadius = zone.ZONE_RADIUS || 500;
    }
  }

  /** @deprecated use detectAndSelectZone instead */
  calculateNearestZone(lat: number, lng: number) {
    this.detectAndSelectZone(lat, lng);
  }

  getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2-lat1);
    const dLon = this.deg2rad(lon2-lon1); 
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; 
  }

  deg2rad(deg: number) { return deg * (Math.PI/180); }

  // ==========================
  // Zone & Map Logic
  // ==========================

  onZoneChange() {
    if (this.formData.zone_id) {
      const selectedZone = this.zones.find((z: any) => z.ZONE_ID == this.formData.zone_id);
      if (selectedZone && selectedZone.lat && selectedZone.lng) {
        this.zoneCenter = { lat: selectedZone.lat, lng: selectedZone.lng };
        this.currentZoneName = selectedZone.ZONE_NAME;
        // Do not change marker or center unless they want to jump there.
        // Usually, changing zone jumps the map there. Let's jump.
        this.center = { ...this.zoneCenter };
      }
    }
  }

  // ========== Map zone/dorm display helpers ==========
  getZoneCircleOptions(zone: any): google.maps.CircleOptions {
    const isSelected = this.formData.zone_id === zone.ZONE_ID;
    return {
      fillColor: isSelected ? '#f59e0b' : '#4285F4',
      fillOpacity: isSelected ? 0.18 : 0.10,
      strokeColor: isSelected ? '#f59e0b' : '#4285F4',
      strokeOpacity: isSelected ? 0.8 : 0.5,
      strokeWeight: isSelected ? 2.5 : 1.5,
      clickable: false
    };
  }

  getZoneMarkerOptions(zone: any): any {
    const isSelected = this.formData.zone_id === zone.ZONE_ID;
    // SymbolPath.CIRCLE = 0 (numeric fallback to avoid runtime error if google not loaded yet)
    const circlePath = (typeof google !== 'undefined' && google?.maps?.SymbolPath)
      ? google.maps.SymbolPath.CIRCLE
      : 0;
    return {
      icon: {
        path: circlePath,
        scale: 10,
        fillColor: isSelected ? '#f59e0b' : '#4285F4',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
      title: zone.ZONE_NAME,
      label: {
        text: zone.ZONE_NAME || '',
        color: '#333',
        fontSize: '11px',
        fontWeight: '600'
      }
    };
  }

  getDormMarkerOptions(dorm: any): any {
    const scaledSize = (typeof google !== 'undefined' && google?.maps?.Size)
      ? new google.maps.Size(32, 32)
      : undefined;
    return {
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
        ...(scaledSize ? { scaledSize } : {})
      },
      title: dorm.DORM_NAME || dorm.DORMNAME,
      zIndex: 1
    };
  }

  onDormMarkerClick(marker: MapMarker, dorm: any) {
    this.selectedDormForMap = dorm;
    if (this.dormInfoWindow) {
      this.dormInfoWindow.open(marker);
    }
  }

  onZoneMarkerClick(zone: any) {
    this.applyZone(zone);
    this.showToast(`เลือกโซน: ${zone.ZONE_NAME}`, 'success');
  }
  // ==========================
  // ==========================
  // Step Navigation
  // ==========================
  goToStep(step: number) {
    if (step < this.currentStep) {
      this.currentStep = step;
    } else if (step > this.currentStep) {
      while (this.currentStep < step) {
        const oldStep = this.currentStep;
        this.nextStep();
        // ถ้าไม่เปลี่ยน step แสดงว่าติด validation ให้หยุดการกระโดด
        if (this.currentStep === oldStep) {
          break;
        }
      }
    }
  }

  nextStep() {
    if (this.currentStep === 1) {
      if (!this.formData.name?.trim()) {
        this.showToast('กรุณากรอกชื่อหอพัก', 'warning');
        return;
      }
      if (this.formData.water_unit === null || this.formData.water_unit === '' || this.formData.water_unit < 0) {
        this.showToast('กรุณากรอกค่าน้ำ (บาท/หน่วย) ให้ถูกต้อง (ห้ามติดลบ)', 'warning');
        return;
      }
      if (this.formData.water_lump < 0) {
        this.showToast('ค่าน้ำเหมาจ่ายห้ามติดลบ', 'warning');
        return;
      }
      if (this.formData.elect_unit === null || this.formData.elect_unit === '' || this.formData.elect_unit < 0) {
        this.showToast('กรุณากรอกค่าไฟ (บาท/หน่วย) ให้ถูกต้อง (ห้ามติดลบ)', 'warning');
        return;
      }
    }
    if (this.currentStep === 3) {
      // ตรวจสอบว่าแต่ละห้องมีราคาอย่างน้อย 1 ช่อง และห้ามติดลบ
      for (const room of this.roomTypes) {
        const hasPrice = room.prices.some((p: any) => p.price !== null && p.price !== '' && Number(p.price) > 0);
        if (!hasPrice) {
          this.showToast('กรุณากรอกราคาอย่างน้อย 1 ช่อง ในทุกประเภทห้อง', 'warning');
          return;
        }
        for (const p of room.prices) {
          if (p.price !== null && p.price !== '' && Number(p.price) < 0) {
            this.showToast('ราคาห้องพักห้ามติดลบ', 'warning');
            return;
          }
        }
      }
    }
    if (this.currentStep < 4) this.currentStep++;
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      if (this.currentStep === 1) {
        setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
      }
    }
  }

  // ==========================
  // แผนที่
  // ==========================
  getCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.formData.lat = position.coords.latitude;
          this.formData.lng = position.coords.longitude;
          this.center = { lat: this.formData.lat, lng: this.formData.lng };
          this.markerPosition = { ...this.center };
          this.showToast('ดึงตำแหน่งปัจจุบันสำเร็จ ✓', 'success');
        },
        () => { this.showToast('ไม่สามารถดึงตำแหน่งได้ กรุณาเปิด GPS', 'danger'); }
      );
    }
  }

  onMapClick(event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      this.formData.lat = event.latLng.lat();
      this.formData.lng = event.latLng.lng();
      this.markerPosition = { lat: this.formData.lat, lng: this.formData.lng };
      this.detectAndSelectZone(this.formData.lat, this.formData.lng);
      this.geocodeAddress(this.formData.lat, this.formData.lng);
      this.checkDuplicateLocation(this.formData.lat, this.formData.lng);

      // Open InfoWindow after zone resolves
      setTimeout(() => {
        if (this.infoWindow && this.marker) {
          this.infoWindow.open(this.marker);
        }
      }, 400);
    }
  }

  geocodeAddress(lat: number, lng: number) {
    if (!this.geocoder) {
      if (typeof google === 'undefined') return;
      this.geocoder = new google.maps.Geocoder();
    }
    this.geocoder.geocode({ location: { lat, lng }, language: 'th' }, (results: any, status: any) => {
      if (status === 'OK' && results && results[0]) {
        this.formData.address = results[0].formatted_address;
      }
    });
  }

  async checkDuplicateLocation(lat: number, lng: number) {
    if (this.allDorms.length === 0) return;
    for (const dorm of this.allDorms) {
      if (dorm.lat && dorm.lng) {
        const dist = this.getDistanceFromLatLonInKm(lat, lng, dorm.lat, dorm.lng);
        if (dist < 0.02) { // less than 20 meters
          const alert = await this.alertCtrl.create({
            header: 'พบตำแหน่งที่ซ้ำกัน',
            message: `พิกัดนี้อยู่ใกล้เคียงกับหอพัก <b>${dorm.DORM_NAME || dorm.DORMNAME}</b> มาก (ระยะห่างประมาณ ${Math.round(dist * 1000)} เมตร) คุณต้องการใช้พิกัดนี้จริงๆ ใช่หรือไม่?`,
            buttons: ['ตกลง']
          });
          await alert.present();
          break; // alert once
        }
      }
    }
  }

  onInputCoordChange() {
    if (this.formData.lat && this.formData.lng) {
      this.markerPosition = { lat: Number(this.formData.lat), lng: Number(this.formData.lng) };
      this.center = { ...this.markerPosition };
      this.calculateNearestZone(this.markerPosition.lat, this.markerPosition.lng);
      this.geocodeAddress(this.formData.lat, this.formData.lng);
    }
  }

  // ==========================
  // ห้องพัก
  // ==========================
  addRoomType() {
    this.roomTypes.push({
      id: null, 
      selectedType: this.roomTypesDB.length > 0 ? (this.roomTypesDB[0].name || this.roomTypesDB[0].ROOM_TYPE_NAME) : 'ห้องแอร์',
      roomType: this.roomTypesDB.length > 0 ? (this.roomTypesDB[0].name || this.roomTypesDB[0].ROOM_TYPE_NAME) : 'ห้องแอร์',
      bedType: this.bedTypesDB.length > 0 ? (this.bedTypesDB[0].id || this.bedTypesDB[0].BED_TYPE_ID)?.toString() : '1', 
      prices: this.priceTypes.map(pt => ({ priceTypeId: pt.id, name: pt.name, price: null }))
    });
  }

  removeRoomType(index: number) {
    if (this.roomTypes.length > 1) this.roomTypes.splice(index, 1);
  }

  onRoomTypeChange(room: any) {
    room.roomType = room.selectedType;
  }

  // ==========================
  // รูปภาพ
  // ==========================
  onMultiRoomSelect(event: any) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const slots = [
      'BED_IMG',
      'WALL_IMG',
      'CEILING_IMG',
      'FLOOR_IMG',
      'BATHROOM_IMG',
      'BALCONY_IMG',
    ];
    let fileIndex = 0;

    for (let i = 0; i < slots.length && fileIndex < files.length; i++) {
      const field = slots[i];
      const file = files[fileIndex];

      if (file.size > 5 * 1024 * 1024) {
        this.showToast(
          `ไฟล์ที่ ${fileIndex + 1} มีขนาดใหญ่เกินไป (สูงสุด 5MB)`,
          'warning',
        );
        fileIndex++;
        continue;
      }

      this.selectedFiles[field] = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.previews[field] = reader.result;
      };
      reader.readAsDataURL(file);
      fileIndex++;
    }
  }

  removeRoomImage(field: string) {
    this.previews[field] = null;
    this.selectedFiles[field] = null;
  }

  onFileSelect(event: any, field: string) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      this.showToast('รองรับเฉพาะไฟล์รูปภาพ JPG หรือ PNG เท่านั้น', 'warning');
      return;
    }

    // ✅ เช็คขนาดเกิน 5MB
    if (file.size > 5 * 1024 * 1024) {
      this.showToast('ขนาดไฟล์ใหญ่เกินไป (สูงสุด 5MB)', 'warning');
      return;
    }

    this.selectedFiles[field] = file;
    const reader = new FileReader();
    reader.onload = () => { this.previews[field] = reader.result; };
    reader.readAsDataURL(file);
  }

  onPaste(event: ClipboardEvent, field: string) {
    if (this.isReadOnly) return;
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item && item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          if (file.size > 5 * 1024 * 1024) {
            this.showToast('ภาพที่วางมีขนาดใหญ่เกินไป (สูงสุด 5MB)', 'warning');
            return;
          }
          this.selectedFiles[field] = file;
          const reader = new FileReader();
          reader.onload = () => {
            this.previews[field] = reader.result;
          };
          reader.readAsDataURL(file);
          this.showToast('วางรูปภาพสำเร็จ', 'success');
        }
        break; // Process only the first image pasted
      }
    }
  }

  onGallerySelect(event: any) {
    const files = event.target.files;
    if (!files) return;

    const currentCount = this.selectedFiles.OTHER_IMG.length;
    if (currentCount + files.length > 5) {
      this.showToast('คุณอัปโหลดรูปภาพได้สูงสุด 5 รูป', 'warning');
      return;
    }

    let hasOversized = false;
    for (let i = 0; i < files.length; i++) {
      if (files[i].type !== 'image/jpeg' && files[i].type !== 'image/png') {
        this.showToast(`ไฟล์ ${files[i].name} ไม่รองรับ (เฉพาะ JPG/PNG)`, 'warning');
        continue;
      }
      if (files[i].size > 5 * 1024 * 1024) {
        hasOversized = true;
      } else {
        this.selectedFiles.OTHER_IMG.push(files[i]);
        const reader = new FileReader();
        reader.onload = (e) => { this.previews.OTHER_IMG.push(e.target?.result); };
        reader.readAsDataURL(files[i]);
      }
    }

    if (hasOversized) {
      this.showToast('มีรูปภาพบางรูปขนาดเกิน 5MB จึงไม่ถูกเพิ่ม', 'warning');
    }
  }

  removeGalleryImage(index: number, isExisting: boolean = false) {
    if (isExisting) {
      this.existingGallery.splice(index, 1);
    } else {
      this.previews.OTHER_IMG.splice(index, 1);
      this.selectedFiles.OTHER_IMG.splice(index, 1);
    }
  }

  // =========== Custom Facility Modal State ===========
  isAddFacilityModalOpen = false;  // controls overlay div (not ion-modal)
  newFacilityName = '';
  newFacilityCustomIcon: string | null = null; // store base64 string
  newFacilityFile: any = null;
  
  availableIcons = [
    'air-conditioner.png', 'bed.png', 'business-fill.png', 'business-outline.png',
    'cabin.png', 'cable-tv.png', 'car-parking.png', 'cctv-camera.png', 'desk.png',
    'elevator.png', 'fan.png', 'fingerprint.png', 'frig.png', 'furnitures.png',
    'garage.png', 'gym.png', 'home.png', 'key.png', 'kitchen-set.png',
    'laundry-machine.png', 'mart.png', 'motorcycle-parking.png', 'pet.png',
    'policeman.png', 'quarantine.png', 'recycle-bin.png', 'seater-sofa.png',
    'star.png', 'swimming-pool.png', 'tv.png', 'user.png', 'wardrobe.png',
    'water-heater.png', 'wifi.png', 'woman-hair.png'
  ];

  suggestNewFacility() {
    if (this.formData.new_facilities.length > 3) {
      this.showToast('คุณสามารถเสนอสิ่งอำนวยความสะดวกใหม่ได้สูงสุด 3 รายการ', 'warning');
      return;
    }
    
    // Reset state and open modal
    this.newFacilityName = '';
    this.newFacilityCustomIcon = null;
    this.newFacilityFile = null;
    this.isAddFacilityModalOpen = true;
  }

  selectFacilityIcon(iconFile: string) {
    //
  }

  onCustomIconSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
        this.showToast('รองรับเฉพาะไฟล์รูปภาพ JPG หรือ PNG เท่านั้น', 'warning');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.showToast('ขนาดไอคอนใหญ่เกินไป (สูงสุด 5MB)', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.newFacilityCustomIcon = reader.result as string;
        this.newFacilityFile = file;
      };
      reader.readAsDataURL(file);
    }
  }

  closeAddFacilityModal() {
    this.isAddFacilityModalOpen = false;
  }

  async confirmAddFacility() {
    const trimmedName = this.newFacilityName ? this.newFacilityName.trim() : '';
    if (!trimmedName) {
      this.showToast('กรุณาระบุชื่อสิ่งอำนวยความสะดวก', 'warning');
      return;
    }
    
    // 1. Check existing facilities
    const existsInMain = this.facilities.some(f => f.name.toLowerCase() === trimmedName.toLowerCase());
    const existsInNew = this.formData.new_facilities.some((f: any) => f.name.toLowerCase() === trimmedName.toLowerCase());
    
    if (existsInMain || existsInNew) {
      this.showToast(`สิ่งอำนวยความสะดวก "${trimmedName}" มีอยู่แล้วในระบบ`, 'danger');
      return;
    }
    
    const alert = await this.alertCtrl.create({
      header: 'ยืนยันการเพิ่ม',
      message: `ต้องการเพิ่ม "${trimmedName}" ใช่หรือไม่? (สิทธิ์คงเหลือ: ${4 - this.formData.new_facilities.length - 1} รายการ)`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'ตกลง',
          handler: () => {
            // 3. Add to new facilities
            this.formData.new_facilities.push({
              name: trimmedName,
              icon: this.newFacilityCustomIcon ? this.newFacilityCustomIcon : '',
              file: this.newFacilityFile
            });
            this.closeAddFacilityModal();
            this.showToast('เพิ่มสิ่งอำนวยความสะดวกสำเร็จ', 'success');
          }
        }
      ]
    });
    await alert.present();
  }

  removeNewFacility(index: number) {
    this.formData.new_facilities.splice(index, 1);
  }

  // ==========================
  // Submit
  // ==========================
  async onSubmit() {
    const hasFront = this.selectedFiles.FRONT_DORM_IMG || this.previews.FRONT_DORM_IMG;
    const hasLicense = this.isApproved || this.selectedFiles.LICENSE_IMG || this.previews.LICENSE_IMG;
    
    if (!hasFront || !hasLicense) {
      this.showToast('กรุณาแนบ รูปหน้าปก และ เอกสารยืนยันตัวตน ให้ครบ', 'warning');
      return;
    }
    // ✅ บังคับ 5 รูปส่วนประกอบห้อง
    const requiredRoomImgs = [
      { key: 'BED_IMG', label: '1. เตียงนอน' },
      { key: 'WALL_IMG', label: '2. ผนังปลายเตียง' },
      { key: 'CEILING_IMG', label: '3. เพดาน' },
      { key: 'FLOOR_IMG', label: '4. ฝั่งติดประตู' },
      { key: 'BATHROOM_IMG', label: '5. ห้องน้ำ' },
    ];
    for (const img of requiredRoomImgs) {
      if (!this.selectedFiles[img.key] && !this.previews[img.key]) {
        this.showToast(`กรุณาแนบรูปภาพส่วนประกอบห้อง: ${img.label}`, 'warning');
        return;
      }
    }

    // Show Preview Modal using DormDetailPage
    const finalOwnerId = (this.isAdmin && this.selectedOwnerId) ? this.selectedOwnerId : this.ownerId;
    let ownerProfile: any = null;
    try {
      ownerProfile = await this.userService.getUserProfile(finalOwnerId);
    } catch (err) {
      console.warn('Could not fetch owner profile for preview', err);
      ownerProfile = this.currentUser; // fallback
    }

    const previewData = {
      DORM_NAME: this.formData.name || 'ไม่ได้ระบุชื่อหอพัก',
      ADDRESS: this.formData.address || 'ไม่ได้ระบุที่อยู่',
      lat: this.formData.lat,
      lng: this.formData.lng,
      ZONE_NAME: this.zones.find(z => z.ZONE_ID === Number(this.formData.zone_id))?.ZONE_NAME || 'ไม่ได้ระบุโซน',
      DORM_TYPE_NAME: this.dormTypesDB.find(t => t.id === Number(this.formData.type_id))?.name || '',
      start_price: null,
      term_price: null,
      water_unit: this.formData.water_unit,
      water_lump: this.formData.water_lump,
      elect_unit: this.formData.elect_unit,
      description: this.formData.detail,
      facilities: this.facilities.filter((f: any) => f.checked).map((f: any) => ({ name: f.name, icon: f.icon })),
      new_facilities: this.formData.new_facilities || [],
      rooms: this.roomTypes.map(r => ({
        roomType: r.selectedType,
        ROOM_TYPE_NAME: r.selectedType,
        bedType: this.bedTypesDB.find(b => (b.id || b.BED_TYPE_ID).toString() === r.bedType?.toString())?.name || 
                 this.bedTypesDB.find(b => (b.id || b.BED_TYPE_ID).toString() === r.bedType?.toString())?.BED_TYPE_NAME || r.bedType,
        prices: r.prices
      })),
      image: this.previews.FRONT_DORM_IMG || 'assets/dorm-placeholder.jpg',
      gallery: [
        this.previews.BED_IMG,
        this.previews.WALL_IMG,
        this.previews.CEILING_IMG,
        this.previews.FLOOR_IMG,
        this.previews.BATHROOM_IMG,
        this.previews.BALCONY_IMG,
        ...(this.previews.OTHER_IMG || [])
      ].filter(img => img), // กรองเอาค่าว่างหรือ null ออก
      FIRST_NAME: ownerProfile?.FIRST_NAME || ownerProfile?.USER_FNAME || ownerProfile?.USER_FIRSTNAME || ownerProfile?.fname || 'เจ้าของหอพัก',
      LAST_NAME: ownerProfile?.LAST_NAME || ownerProfile?.USER_LNAME || ownerProfile?.USER_LASTNAME || ownerProfile?.lname || '',
      phone: ownerProfile?.PHONE || ownerProfile?.PHONE_NUMBER || '-',
      line: ownerProfile?.LINE || ownerProfile?.LINE_ID || ownerProfile?.line_id || '-',
      facebook: ownerProfile?.FACEBOOK || ownerProfile?.facebook || '-',
      instagram: ownerProfile?.INSTAGRAM || ownerProfile?.IG || ownerProfile?.instagram || '-',
      x: ownerProfile?.X || ownerProfile?.x || '-',
      telegram: ownerProfile?.TELEGRAM || ownerProfile?.telegram || '-'
    };

    const modal = await this.modalCtrl.create({
      component: DormDetailPage,
      cssClass: 'fullscreen-modal',
      componentProps: {
        dormData: previewData,
        isPopup: true
      }
    });

    await modal.present();

    const { role } = await modal.onDidDismiss();
    if (role === 'confirm') {
      this.processSaveData();
    }
  }

  getCheckedFacilitiesCount(): number {
    return this.facilities?.filter((fac: any) => fac.checked).length ?? 0;
  }

  // ✅ เรียกตอนกด "ยืนยันส่งข้อมูล" ใน preview-modal
  onPreviewConfirmed() {
    this.showPreviewModal = false;
    this.processSaveData();
  }

  // ✅ เรียกตอนกด "กลับไปแก้ไข" ใน preview-modal
  onPreviewCancelled() {
    this.showPreviewModal = false;
  }

  async processSaveData() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    const loading = await this.loadingCtrl.create({
      message: 'กำลังส่งข้อมูล...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const form = new FormData();

      // ✅ FIX: ส่ง user_id (USER_ID จาก USERS table)
      // Backend จะไป lookup DORM_OWNER_ID เอง
      // ถ้า Admin ยังไม่มี DORM_OWNERS record → Backend ต้อง auto-create
      const finalOwnerId = (this.isAdmin && this.selectedOwnerId) ? this.selectedOwnerId : this.ownerId;
      form.append('user_id', finalOwnerId.toString());
      form.append('name', this.formData.name?.trim() || '');
      form.append('address', this.formData.address?.trim() || '');
      form.append('lat', (this.formData.lat || 16.245279).toString());
      form.append('lng', (this.formData.lng || 103.250106).toString());
      form.append('zone_id', (this.formData.zone_id || 1).toString());
      form.append('type_id', (this.formData.type_id || 1).toString());
      form.append('detail', this.formData.detail?.trim() || '');
      form.append('water_unit', (this.formData.water_unit || 0).toString());
      form.append('water_lump', (this.formData.water_lump || 0).toString());
      form.append('elect_unit', (this.formData.elect_unit || 0).toString());

      // ✅ FIX: format roomTypes ให้ตรงกับที่ Backend ต้องการ
        const roomTypesFormatted = this.roomTypes.map(r => ({
          roomType: r.selectedType,
          bedType: r.bedType || '1',
          prices: r.prices
        }));
        form.append('roomTypes', JSON.stringify(roomTypesFormatted));

      const selectedFacIds = this.facilities
        .filter((f: any) => f.checked)
        .map((f: any) => f.id);
      form.append('facilities', JSON.stringify(selectedFacIds));

      if (this.formData.new_facilities && this.formData.new_facilities.length > 0) {
        // ส่งแค่ชื่อ ไม่ส่ง icon (Base64) ใน JSON เพราะจะส่งเป็นไฟล์แยกผ่าน FACILITY_IMG_n
        const newFacToSave = this.formData.new_facilities.map((nf: any) => ({
          name: nf.name,
          icon: '' // ไม่ส่ง Base64 ลง column — backend จะอัปเดต icon ทีหลังจากไฟล์ที่แนบมา
        }));
        form.append('new_facilities', JSON.stringify(newFacToSave));

        const facWithFiles = this.formData.new_facilities.filter((nf: any) => nf.file);
        facWithFiles.forEach((nf: any, idx: number) => {
          if (idx < 3) {
            form.append(`FACILITY_IMG_${idx}`, nf.file);
          }
        });
      }

      // รูปภาพ
      if (this.selectedFiles.FRONT_DORM_IMG) form.append('FRONT_DORM_IMG', this.selectedFiles.FRONT_DORM_IMG);
      if (this.selectedFiles.LICENSE_IMG) form.append('LICENSE_IMG', this.selectedFiles.LICENSE_IMG);
      if (this.selectedFiles.BED_IMG) form.append('BED_IMG', this.selectedFiles.BED_IMG);
      if (this.selectedFiles.WALL_IMG) form.append('WALL_IMG', this.selectedFiles.WALL_IMG);
      if (this.selectedFiles.CEILING_IMG) form.append('CEILING_IMG', this.selectedFiles.CEILING_IMG);
      if (this.selectedFiles.FLOOR_IMG) form.append('FLOOR_IMG', this.selectedFiles.FLOOR_IMG);
      if (this.selectedFiles.BATHROOM_IMG) form.append('BATHROOM_IMG', this.selectedFiles.BATHROOM_IMG);
      if (this.selectedFiles.BALCONY_IMG) form.append('BALCONY_IMG', this.selectedFiles.BALCONY_IMG);

      if (this.selectedFiles.OTHER_IMG?.length > 0) {
        this.selectedFiles.OTHER_IMG.forEach((file: File) => {
          form.append('OTHER_IMG', file);
        });
      }

      // Debug log ก่อนส่ง
      console.log('📤 Submitting FormData:');
      form.forEach((val, key) => console.log(`  ${key}:`, typeof val === 'string' ? val : '[File]'));

      if (this.dormId) {
        await this.dormService.updateDorm(this.dormId, form);
      } else {
        await lastValueFrom(this.dormService.createDorm(form));
      }

      await loading.dismiss();
      this.showSuccessFlow();

    } catch (error: any) {
      await loading.dismiss();
      const serverMsg =
        error?.error?.message ||
        error?.error?.error ||
        error?.message ||
        'ไม่ทราบสาเหตุ';
      console.error('❌ createDorm error:', error);
      console.error('📩 Server message:', serverMsg);
      this.showToast(`บันทึกไม่สำเร็จ: ${serverMsg}`, 'danger');
    } finally {
      this.isSubmitting = false;
    }
  }

  async showSuccessFlow() {
    this.showSuccessModal = true;
  }

  // ✅ เรียกตอนกด "ตกลงรับทราบ" ใน success-modal
  onSuccessConfirmed() {
    this.showSuccessModal = false;
    this.router.navigate(['/my-dorms']);
  }

  submitAgain() {
    this.formState = 'editing';
    this.isReadOnly = false;
    this.currentStep = 1; 
  }

  viewPendingInfo() {
    this.formState = 'editing';
  }

  async cancelRequest() {
    const alert = await this.alertCtrl.create({
      header: 'ยืนยันการยกเลิกคำขอ',
      message: 'คุณต้องการยกเลิกคำขอลงทะเบียนนี้ใช่หรือไม่? ข้อมูลจะกลับไปอยู่ในสถานะแบบร่าง และคุณสามารถแก้ไขหรือส่งใหม่ได้ในภายหลัง',
      buttons: [
        { text: 'ไม่ยกเลิก', role: 'cancel' },
        {
          text: 'ยกเลิกคำขอ',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingCtrl.create({ message: 'กำลังยกเลิกคำขอ...' });
            await loading.present();
            try {
              await this.dormService.cancelDormRequest(this.dormId);
              this.showToast('ยกเลิกคำขอเรียบร้อยแล้ว', 'success');
              // เปลี่ยน state เป็น editing ทันทีเพื่อให้แก้ไขต่อได้
              this.formState = 'editing';
              this.isReadOnly = false;
              this.currentStep = 1;
            } catch (error) {
              console.error(error);
              this.showToast('เกิดข้อผิดพลาดในการยกเลิกคำขอ', 'danger');
            } finally {
              loading.dismiss();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async showToast(msg: string, color: 'success' | 'warning' | 'danger') {
    const toast = await this.toastCtrl.create({
      message: msg, duration: 2800, color, position: 'bottom',
      cssClass: 'custom-toast'
    });
    toast.present();
  }
}