import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonFooter,
  IonButtons, IonBackButton, IonButton, IonIcon, 
  IonSegment, IonSegmentButton, IonLabel, 
  IonItem, IonInput, IonTextarea, IonSelect, IonSelectOption,
  IonCheckbox, IonList, IonListHeader, IonModal,
  LoadingController, ToastController, AlertController, ActionSheetController, IonImg
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  saveOutline, imageOutline, homeOutline, wifi, 
  bedOutline, trashOutline, addCircleOutline, locationOutline, cloudUploadOutline, closeCircle,
  checkmarkCircle, checkmarkCircleOutline, arrowBackOutline, arrowForwardOutline, sendOutline,
  timeOutline, gridOutline, imagesOutline, documentTextOutline
} from 'ionicons/icons';
import { ActivatedRoute, Router } from '@angular/router';
import { DormitoryService } from '../../services/dormitory';
import { lastValueFrom, Observable, of } from 'rxjs'; 
import { HttpClientModule, HttpClient, HttpClientJsonpModule } from '@angular/common/http';
import { GoogleMapsModule, MapMarker, MapCircle, MapInfoWindow } from '@angular/google-maps';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { SuccessModalComponent } from '../../components/success-modal/success-modal.component';

@Component({
  selector: 'app-edit-dorm',
  templateUrl: './edit-dorm.page.html',
  styleUrls: ['./edit-dorm.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonFooter,
    IonButtons, IonBackButton, IonButton, IonIcon, 
    IonSegment, IonSegmentButton, IonLabel,
    IonItem, IonInput, IonTextarea, IonSelect, IonSelectOption,
    IonCheckbox, IonList, IonListHeader, IonImg, IonModal,
    CommonModule, FormsModule,
    HttpClientModule, HttpClientJsonpModule, GoogleMapsModule, MapMarker, MapCircle, MapInfoWindow,
    SuccessModalComponent
  ]
})
export class EditDormPage implements OnInit {
  dormId: number = 0;
  activeSegment: string = 'general';
  
  apiLoaded: Observable<boolean>;
  isMapModalOpen: boolean = false;

  @ViewChild('infoWindow') infoWindow!: MapInfoWindow;
  @ViewChild('dormInfoWindow') dormInfoWindow!: MapInfoWindow;
  @ViewChild('userMarker') marker!: MapMarker;

  duplicateDormName: string | null = null;
  selectedDormForMap: any = null;
  center: google.maps.LatLngLiteral = { lat: 16.246, lng: 103.252 };
  markerPosition: google.maps.LatLngLiteral = { lat: 16.246, lng: 103.252 };
  zoom = 15;
  mapOptions: google.maps.MapOptions = { streetViewControl: false, mapTypeControl: false };
  markerOptions: google.maps.MarkerOptions = { draggable: true };
  mapCenter: google.maps.LatLngLiteral | null = null;
  zoneCenter: google.maps.LatLngLiteral | null = null;
  zoneRadius: number = 500;
  circleOptions: google.maps.CircleOptions = {
    fillColor: '#FFD600', fillOpacity: 0.2, // Yellow circle like dorm-form might have or we use blue
    strokeColor: '#FFD600', strokeOpacity: 0.8, strokeWeight: 2,
    clickable: false
  };
  tempPin: google.maps.LatLngLiteral | null = null;
  
  formData: any = {
    name: '',
    address: '',
    lat: 16.245279,
    lng: 103.250106,
    zone_id: null,
    type_id: null,
    water_unit: null,
    water_lump: null,
    elect_unit: null,
    detail: '',
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
  currentZoneName: string = 'กำลังคำนวณ...';
  
  reqStatus: number = 1;
  isWaitingForAdmin: boolean = false;
  pageMode: 'view' | 'edit' | 'resubmit' = 'edit'; // view=ดูอย่างเดียว, resubmit=แก้ไขและส่งใหม่, edit=ปกติ
  get isViewOnly() { return this.pageMode === 'view'; }
  get isResubmitMode() { return this.pageMode === 'resubmit'; }

  selectedFiles: any = {
    FRONT_DORM_IMG: null,
    BED_IMG: null,
    WALL_IMG: null,
    CEILING_IMG: null,
    FLOOR_IMG: null,
    BATHROOM_IMG: null,
    BALCONY_IMG: null,
    OTHER_IMG: []
  };

  previews: any = {
    FRONT_DORM_IMG: null,
    LICENSE_IMG: null,
    BED_IMG: null,
    WALL_IMG: null,
    CEILING_IMG: null,
    FLOOR_IMG: null,
    BATHROOM_IMG: null,
    BALCONY_IMG: null,
    OTHER_IMG: []
  };

  existingGallery: string[] = [];
  geocoder = new google.maps.Geocoder();

  // =========== Custom Facility Modal State ===========
  isAddFacilityModalOpen = false;
  newFacilityName = '';
  newFacilitySelectedIconPreview: string | ArrayBuffer | null = null;
  newFacilitySelectedIconFile: File | null = null;
  isSubmitting = false;
  showSuccessModal = false;

  getIconPath(iconPath: string): string {
    if (!iconPath) return '';
    if (iconPath.startsWith('assets/icon/')) {
      return iconPath.replace('assets/icon/', 'assets/allIcons/');
    }
    return iconPath;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dormService: DormitoryService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private actionSheetCtrl: ActionSheetController,
    private httpClient: HttpClient
  ) {
    addIcons({
      saveOutline, homeOutline, locationOutline, wifi, 
      bedOutline, addCircleOutline, trashOutline, imageOutline, 
      cloudUploadOutline, closeCircle,
      'checkmark-circle': checkmarkCircle,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'arrow-back-outline': arrowBackOutline,
      'arrow-forward-outline': arrowForwardOutline,
      'send-outline': sendOutline,
      'time-outline': timeOutline,
      'grid-outline': gridOutline,
      'images-outline': imagesOutline,
      'document-text-outline': documentTextOutline
    });

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

  async ngOnInit() {
    this.dormId = Number(this.route.snapshot.paramMap.get('id'));
    // อ่าน mode จาก query param
    const mode = this.route.snapshot.queryParamMap.get('mode');
    if (mode === 'view') this.pageMode = 'view';
    else if (mode === 'resubmit') this.pageMode = 'resubmit';
    else this.pageMode = 'edit';
    
    if (this.dormId) {
      await this.loadInitialData(); 
      await this.loadDormData(this.dormId);
    }
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

  async loadInitialData() {
    try {
      const zoneRes = await this.dormService.getZones();
      if (zoneRes.success) {
        this.zones = zoneRes.data;
      }

      // ✅ โหลดตัวเลือกอื่นๆ จาก DB
      const dtRes: any = await lastValueFrom(this.dormService.getDormTypes());
      this.dormTypesDB = Array.isArray(dtRes) ? dtRes : (dtRes?.data || []);
      
      const rtRes: any = await lastValueFrom(this.dormService.getRoomTypes());
      this.roomTypesDB = Array.isArray(rtRes) ? rtRes : (rtRes?.data || []);

      const btRes: any = await lastValueFrom(this.dormService.getBedTypes());
      this.bedTypesDB = Array.isArray(btRes) ? btRes : (btRes?.data || []);

      const facRes: any = await lastValueFrom(this.dormService.getFacilities());
      const facArray = Array.isArray(facRes) ? facRes : (facRes?.data || []);
      if (facArray.length > 0) {
        this.facilities = facArray.map((f: any) => ({
          id: f.FAC_TYPE_ID,
          name: f.FAC_TYPE_NAME,
          icon: f.FAC_TYPE_ICON || '',
          isFontAwesome: f.FAC_TYPE_ICON &&
            !f.FAC_TYPE_ICON.startsWith('http') &&
            !f.FAC_TYPE_ICON.startsWith('/') &&
            !f.FAC_TYPE_ICON.startsWith('assets'),
          checked: false
        }));
      }

      const priceRes: any = await lastValueFrom(this.dormService.getPriceTypes());
      if (priceRes && priceRes.success && priceRes.data) {
        this.priceTypes = priceRes.data;
      }
      
      const dormsRes: any = await this.dormService.getAllDorms();
      if (dormsRes && dormsRes.data) {
        this.allDorms = dormsRes.data;
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  }

  allDorms: any[] = [];
  get filteredDorms(): any[] {
    if (!this.formData.zone_id) return [];
    return this.allDorms.filter(dorm => dorm.ZONE_ID === this.formData.zone_id);
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

  getZoneMarkerOptions(zone: any): google.maps.MarkerOptions {
    const isSelected = this.formData.zone_id === zone.ZONE_ID;
    return {
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
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

  onZoneMarkerClick(zone: any) {
    this.applyZone(zone);
    this.showToast(`เลือกโซน: ${zone.ZONE_NAME}`, 'success');
  }

  getDormMarkerOptions(dorm: any): google.maps.MarkerOptions {
    return {
      icon: {
        url: 'assets/icon/dorm-pin.png',
        scaledSize: new google.maps.Size(22, 22),
      },
      title: dorm.DORM_NAME || dorm.DORMNAME || 'หอพัก',
      zIndex: 5
    };
  }

  async loadDormData(id: number) {
    const loading = await this.loadingCtrl.create({ message: 'กำลังโหลดข้อมูล...' });
    await loading.present();

    try {
      const res = await this.dormService.getDormById(id);
      if (res.success) {
        const d = res.data;
        
        this.reqStatus = Number(d.REQ_STATUS) || 0;
        this.isWaitingForAdmin = (this.reqStatus === 0 || this.reqStatus === 3);
        // ถ้าไม่ได้ระบุ mode มาจาก URL ให้ auto-detect จาก REQ_STATUS
        if (!this.route.snapshot.queryParamMap.get('mode')) {
          if (this.reqStatus === 4) this.pageMode = 'resubmit';
          else if (this.reqStatus === 0) this.pageMode = 'view';
          else this.pageMode = 'edit';
        }

        this.formData = {
          name: d.DORM_NAME,
          address: d.ADDRESS,
          lat: parseFloat(d.lat) || 0,
          lng: parseFloat(d.lng) || 0,
          zone_id: d.ZONE_ID,
          type_id: d.DORM_TYPE_ID,
          water_unit: d.WATER_UNIT || 0,
          water_lump: d.WATER_LUMP || 0,
          elect_unit: d.ELECT_UNIT || 0,
          detail: d.ADD_DORM_DATA || ''
        };

        this.center = { lat: this.formData.lat, lng: this.formData.lng };
        this.markerPosition = { lat: this.formData.lat, lng: this.formData.lng };
        
        // set zone center
        const selectedZone = this.zones.find((z: any) => z.ZONE_ID == this.formData.zone_id);
        if (selectedZone && selectedZone.lat && selectedZone.lng) {
          this.zoneCenter = { lat: selectedZone.lat, lng: selectedZone.lng };
          this.zoneRadius = selectedZone.ZONE_RADIUS || 500;
          this.currentZoneName = selectedZone.ZONE_NAME;
        }

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
            
            const isStandardRoom = this.roomTypesDB.some(rt => (rt.name || rt.ROOM_TYPE_NAME) === r.ROOM_TYPE_NAME);
            const selectedType = isStandardRoom ? r.ROOM_TYPE_NAME : 'custom';
            
            let matchedBedId = '1';
            const bedNameLower = (r.bedType || '').toLowerCase();
            if (bedNameLower.includes('double') || bedNameLower.includes('คู่')) {
               matchedBedId = '2'; // or search in bedTypesDB
               // More robust matching:
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
        } else {
          this.addRoomType();
        }

        // ✅ Fix: Load cover image and license correctly
        this.previews.FRONT_DORM_IMG = d.image || null;
        this.previews.LICENSE_IMG = d.DORM_LICENSE || null;
        
        // ✅ Fix: Load room images correctly (backend returns them at root level)
        this.previews.BED_IMG = d.bed_img || null;
        this.previews.WALL_IMG = d.wall_img || null;
        this.previews.CEILING_IMG = d.ceiling_img || null;
        this.previews.FLOOR_IMG = d.floor_img || null;
        this.previews.BATHROOM_IMG = d.bathroom_img || null;
        this.previews.BALCONY_IMG = d.balcony_img || null;
        
        // ✅ Fix: Gallery = everything that is NOT the cover
        this.existingGallery = d.gallery || [];
        
        // ✅ Load existing custom (new) facilities
        if (d.new_facilities && Array.isArray(d.new_facilities)) {
          this.formData.new_facilities = d.new_facilities.map((nf: any) => ({
            name: nf.name || nf.FAC_NAME || '',
            icon: nf.icon || nf.FAC_ICON || 'cube-outline'
          }));
        } else {
          this.formData.new_facilities = [];
        }
      }
    } catch (error) {
      this.showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  segmentChanged(event: any) {
    this.activeSegment = event.detail.value;
  }

  goToNextSegment(segment: string) {
    this.activeSegment = segment;
  }

  addRoomType() {
    this.roomTypes.push({
      id: null,
      selectedType: this.roomTypesDB.length > 0 ? (this.roomTypesDB[0].name || this.roomTypesDB[0].ROOM_TYPE_NAME) : 'ห้องแอร์',
      roomType: this.roomTypesDB.length > 0 ? (this.roomTypesDB[0].name || this.roomTypesDB[0].ROOM_TYPE_NAME) : 'ห้องแอร์',
      bedType: this.bedTypesDB.length > 0 ? (this.bedTypesDB[0].id || this.bedTypesDB[0].BED_TYPE_ID)?.toString() : '1',
      prices: this.priceTypes.map(pt => ({ priceTypeId: pt.id, name: pt.name, price: null }))
    });
  }

  onZoneChange() {
    if (this.formData.zone_id) {
      const selectedZone = this.zones.find((z: any) => z.ZONE_ID == this.formData.zone_id);
      if (selectedZone && selectedZone.lat && selectedZone.lng) {
        this.zoneCenter = { lat: selectedZone.lat, lng: selectedZone.lng };
        this.zoneRadius = selectedZone.ZONE_RADIUS || 500;
        this.currentZoneName = selectedZone.ZONE_NAME;
        this.center = { ...this.zoneCenter };
      }
    }
  }

  onCoordChange() {
    // ไม่คำนวณโซนอัตโนมัติแล้ว ให้ผู้ใช้เลือกเองจาก Dropdown ตามที่ร้องขอ
  }

  openMapModal() {
    if (this.isWaitingForAdmin) return;
    this.isMapModalOpen = true;
    this.tempPin = { lat: this.formData.lat, lng: this.formData.lng };
    this.mapCenter = { lat: this.formData.lat, lng: this.formData.lng };
  }

  closeMapModal() {
    this.isMapModalOpen = false;
  }

  onMapClick(event: google.maps.MapMouseEvent) {
    if (this.isWaitingForAdmin) return;
    if (event.latLng) {
      this.formData.lat = event.latLng.lat();
      this.formData.lng = event.latLng.lng();
      this.markerPosition = { lat: this.formData.lat, lng: this.formData.lng };
      this.detectAndSelectZone(this.formData.lat, this.formData.lng);
      this.geocodeAddress(this.formData.lat, this.formData.lng);
      this.checkDuplicateLocation(this.formData.lat, this.formData.lng);

      setTimeout(() => {
        if (this.infoWindow && this.marker) {
          this.infoWindow.open(this.marker);
        }
      }, 400);
    }
  }

  geocodeAddress(lat: number, lng: number) {
    this.geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        this.formData.address = results[0].formatted_address;
      }
    });
  }

  confirmMapPin() {
    if (this.tempPin) {
      this.formData.lat = this.tempPin.lat;
      this.formData.lng = this.tempPin.lng;
    }
    this.isMapModalOpen = false;
  }

  onRoomTypeChange(room: any) {
    if (room.selectedType !== 'custom') {
      room.roomType = room.selectedType;
    } else {
      room.roomType = '';
    }
  }

  // ==========================
  // Auto Zone Calculation
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

  onDormMarkerClick(marker: MapMarker, dorm: any) {
    this.selectedDormForMap = dorm;
    if (this.dormInfoWindow) {
      this.dormInfoWindow.open(marker);
    }
  }

  checkDuplicateLocation(lat: number, lng: number) {
    this.duplicateDormName = null;
    if (this.allDorms.length === 0) return;
    for (const dorm of this.allDorms) {
      if (dorm.lat && dorm.lng && dorm.DORM_ID !== this.dormId) { // ข้ามการเช็คหอพักตัวเอง
        const dist = this.getDistanceFromLatLonInKm(lat, lng, dorm.lat, dorm.lng);
        if (dist < 0.02) { // less than 20 meters
          this.duplicateDormName = dorm.DORM_NAME || dorm.DORMNAME;
          break;
        }
      }
    }
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

  removeRoomType(index: number) {
    if (this.roomTypes.length > 1) {
      this.roomTypes.splice(index, 1);
    } else {
      this.showToast('ต้องมีห้องพักอย่างน้อย 1 ประเภท', 'warning');
    }
  }

  onFileSelect(event: any, field: string) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        this.showToast('ขนาดไฟล์ใหญ่เกินไป (สูงสุด 5MB)', 'warning');
        return;
      }
      this.selectedFiles[field] = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.previews[field] = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onMultiRoomSelect(event: any) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const slots = ['BED_IMG', 'WALL_IMG', 'CEILING_IMG', 'FLOOR_IMG', 'BATHROOM_IMG', 'BALCONY_IMG'];
    let fileIndex = 0;

    for (let i = 0; i < slots.length && fileIndex < files.length; i++) {
      const field = slots[i];
      const file = files[fileIndex];

      if (file.size > 5 * 1024 * 1024) {
        this.showToast(`ไฟล์ที่ ${fileIndex + 1} มีขนาดใหญ่เกินไป (สูงสุด 5MB)`, 'warning');
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

  onGallerySelect(event: any) {
    const files = event.target.files;
    if (files) {
      let hasOversized = false;
      for (let i = 0; i < files.length; i++) {
        const totalCount = this.existingGallery.length + this.selectedFiles.OTHER_IMG.length;
        if (totalCount >= 5) {
          this.showToast('อัปโหลดรูปภาพเพิ่มเติมได้สูงสุด 5 รูป', 'warning');
          break;
        }
        if (files[i].size > 5 * 1024 * 1024) {
          hasOversized = true;
          continue;
        }
        this.selectedFiles.OTHER_IMG.push(files[i]);
        const reader = new FileReader();
        reader.onload = () => {
          this.previews.OTHER_IMG.push(reader.result);
        };
        reader.readAsDataURL(files[i]);
      }
      if (hasOversized) {
        this.showToast('มีรูปภาพบางรูปขนาดเกิน 5MB จึงไม่ถูกเพิ่ม', 'warning');
      }
    }
  }

  // ==========================
  // Paste Image Handler
  // ==========================
  onPaste(event: ClipboardEvent, field: string) {
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
        break;
      }
    }
  }

  removeGalleryImage(index: number, isExisting: boolean) {
    if (isExisting) {
      this.existingGallery.splice(index, 1);
    } else {
      this.previews.OTHER_IMG.splice(index, 1);
      this.selectedFiles.OTHER_IMG.splice(index, 1);
    }
  }

  // =========== Add Custom Facility Logic ===========
  getCheckedFacilitiesCount(): number {
    return this.facilities.filter(f => f.checked).length;
  }

  suggestNewFacility() {
    if (this.formData.new_facilities.length >= 4) {
      this.showToast('คุณสามารถเสนอสิ่งอำนวยความสะดวกใหม่ได้สูงสุด 4 รายการ', 'warning');
      return;
    }
    this.newFacilityName = '';
    this.newFacilitySelectedIconPreview = null;
    this.newFacilitySelectedIconFile = null;
    this.isAddFacilityModalOpen = true;
  }

  onFacIconSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        this.showToast('ขนาดไอคอนใหญ่เกินไป (สูงสุด 5MB)', 'warning');
        return;
      }
      this.newFacilitySelectedIconFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.newFacilitySelectedIconPreview = reader.result;
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
    
    const existsInMain = this.facilities.some(f => f.name.toLowerCase() === trimmedName.toLowerCase());
    const existsInNew = this.formData.new_facilities.some((f: any) => f.name.toLowerCase() === trimmedName.toLowerCase());
    
    if (existsInMain || existsInNew) {
      this.showToast('สิ่งอำนวยความสะดวกนี้มีอยู่แล้ว', 'danger');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'ยืนยันการเพิ่ม',
      message: `ต้องการเพิ่ม "${trimmedName}" ใช่หรือไม่?<br>สิทธิ์คงเหลือ: ${4 - this.formData.new_facilities.length - 1} รายการ`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'ตกลง',
          handler: () => {
            this.formData.new_facilities.push({
              name: trimmedName,
              icon: '',
              file: this.newFacilitySelectedIconFile,
              preview: this.newFacilitySelectedIconPreview
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

  async confirmSave() {
    if (this.isWaitingForAdmin && !this.isResubmitMode) {
      this.showToast('กำลังรอแอดมินตรวจสอบ ไม่สามารถแก้ไขได้ในขณะนี้', 'warning');
      return;
    }
    if (this.isViewOnly) {
      this.showToast('โหมดดูข้อมูล ไม่สามารถบันทึกได้', 'warning');
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'ยืนยันการบันทึก',
      message: this.isResubmitMode 
        ? 'ต้องการส่งข้อมูลใหม่เพื่อขออนุมัติอีกครั้งใช่หรือไม่?'
        : 'ต้องการบันทึกข้อมูลที่แก้ไขอยู่ใช่หรือไม่?',
      buttons: [
        { text: 'ยกเลิก', role: 'cancel', cssClass: 'alert-cancel-btn' },
        {
          text: this.isResubmitMode ? 'ส่งใหม่' : 'บันทึก',
          cssClass: 'alert-confirm-btn',
          handler: () => { this.onSubmit(); }
        }
      ]
    });
    await alert.present();
  }

  onSuccessConfirmed() {
    this.showSuccessModal = false;
    const from = this.route.snapshot.queryParamMap.get('from');
    if (from === 'manage-dorm') {
      this.router.navigate(['/manage-dorm']);
    } else {
      this.router.navigate(['/my-dorms']);
    }
  }

  async onSubmit() {
    if (this.isWaitingForAdmin && !this.isResubmitMode) {
      this.showToast('กำลังรอแอดมินตรวจสอบ ไม่สามารถแก้ไขได้ในขณะนี้', 'warning');
      return;
    }
    if (this.isViewOnly) {
      this.showToast('โหมดดูข้อมูล ไม่สามารถบันทึกได้', 'warning');
      return;
    }
    if (!this.formData.name || !this.formData.address || !this.formData.lat || !this.formData.lng || !this.formData.zone_id) {
      this.showToast('กรุณากรอกข้อมูลสำคัญให้ครบถ้วน', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'กำลังอัปเดตข้อมูล...' });
    await loading.present();

    try {
      const form = new FormData();
      
      // 🌟 ใช้ระบบดักค่าว่าง (|| '') ป้องกัน undefined/null ทำให้ .toString() ทำแอปพัง
      form.append('name', this.formData.name || '');
      form.append('address', this.formData.address || '');
      form.append('lat', (this.formData.lat || 0).toString());
      form.append('lng', (this.formData.lng || 0).toString());
      form.append('zone_id', (this.formData.zone_id || '').toString());
      form.append('type_id', (this.formData.type_id || 1).toString());
      form.append('detail', this.formData.detail || '');

      // 🌟 ส่งค่าน้ำและค่าไฟไปตรงๆ เลยตามช่องที่กรอก (ไม่มี Dropdown waterType มากวนใจแล้ว)
      form.append('water_unit', (this.formData.water_unit || 0).toString());
      form.append('water_lump', (this.formData.water_lump || 0).toString());
      form.append('elect_unit', (this.formData.elect_unit || 0).toString());
      
      const selectedFacIds = this.facilities.filter((f: any) => f.checked).map((f: any) => f.id);
      form.append('facilities', JSON.stringify(selectedFacIds));
      
      const newFacToSave = (this.formData.new_facilities || []).map((nf: any) => ({
        name: nf.name,
        icon: nf.icon
      }));
      form.append('new_facilities', JSON.stringify(newFacToSave));
      
      const facWithFile = (this.formData.new_facilities || []).find((nf: any) => nf.file);
      if (facWithFile) {
        form.append('FACILITY_IMG', facWithFile.file);
      }
      
      form.append('roomTypes', JSON.stringify(this.roomTypes));
      form.append('remaining_gallery', JSON.stringify(this.existingGallery || []));

      if (this.selectedFiles.FRONT_DORM_IMG) form.append('FRONT_DORM_IMG', this.selectedFiles.FRONT_DORM_IMG);
      if (this.selectedFiles.BED_IMG) form.append('BED_IMG', this.selectedFiles.BED_IMG);
      if (this.selectedFiles.WALL_IMG) form.append('WALL_IMG', this.selectedFiles.WALL_IMG);
      if (this.selectedFiles.CEILING_IMG) form.append('CEILING_IMG', this.selectedFiles.CEILING_IMG);
      if (this.selectedFiles.FLOOR_IMG) form.append('FLOOR_IMG', this.selectedFiles.FLOOR_IMG);
      if (this.selectedFiles.BATHROOM_IMG) form.append('BATHROOM_IMG', this.selectedFiles.BATHROOM_IMG);
      if (this.selectedFiles.BALCONY_IMG) form.append('BALCONY_IMG', this.selectedFiles.BALCONY_IMG);
      
      if (this.selectedFiles.OTHER_IMG && this.selectedFiles.OTHER_IMG.length > 0) {
        this.selectedFiles.OTHER_IMG.forEach((file: any) => {
          form.append('OTHER_IMG', file);
        });
      }

      await this.dormService.updateDorm(this.dormId, form);
      
      // ✅ Immediately update previews from the files user selected (don't wait for reload)
      // This ensures cover image and room images show instantly even if cache hasn't cleared yet
      const tempPreviews: any = {};
      if (this.selectedFiles.FRONT_DORM_IMG) {
        tempPreviews.FRONT_DORM_IMG = this.previews.FRONT_DORM_IMG; // already set by onFileSelect
      }

      // ✅ Reload data เพื่อให้รูปหน้าปกและรูปอื่นๆ refresh เสมอ
      await this.loadDormData(this.dormId);

      // ✅ If preview was lost after reload (cache still old), restore from temp
      // Always restore if user selected a new file — local base64 is correct; GCS URL comes on next reload
      if (tempPreviews.FRONT_DORM_IMG) {
        this.previews.FRONT_DORM_IMG = tempPreviews.FRONT_DORM_IMG;
      }
      
      // ✅ Reset selected files (clear queued uploads)
      this.selectedFiles = {
        FRONT_DORM_IMG: null, BED_IMG: null, WALL_IMG: null, CEILING_IMG: null,
        FLOOR_IMG: null, BATHROOM_IMG: null, BALCONY_IMG: null, OTHER_IMG: []
      };

      this.showSuccessModal = true;

    } catch (error: any) {
      console.error(error);
      this.showToast('เกิดข้อผิดพลาดในการบันทึก', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }
}