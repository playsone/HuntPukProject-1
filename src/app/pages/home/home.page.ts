import { Component, OnInit, ViewChild, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, MenuController, ViewDidEnter, ToastController, AlertController, ModalController } from '@ionic/angular';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClientModule, HttpClient, HttpClientJsonpModule } from '@angular/common/http';

import {
  GoogleMapsModule,
  GoogleMap,
  MapInfoWindow,
  MapMarker,
  MapCircle,
  MapDirectionsRenderer,
} from '@angular/google-maps';

import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { HeaderComponent } from '../../components/header/header.component';
import { DormitoryService, Dormitory } from '../../services/dormitory';
import { environment } from '../../../environments/environment';
import { addIcons } from 'ionicons';
import { DormDetailPage } from '../dorm-detail/dorm-detail.page';
import { WelcomeModalComponent } from '../../components/welcome-modal/welcome-modal.component';
import { SplashScreenComponent } from '../../components/splash-screen/splash-screen.component';
import { AlertModalComponent } from '../../components/alert-modal/alert-modal.component';
import { RequireLoginModalComponent } from '../../components/require-login-modal/require-login-modal.component';
import { ActionConfirmModalComponent } from '../../components/action-confirm-modal/action-confirm-modal.component';
import { ThaiDatePipe } from '../../pipes/thai-date-pipe';

import {
  menuOutline, caretDownOutline, layersOutline, close,
  locationOutline, checkmarkCircle, chevronDownCircleOutline,
  call, chatbubbleEllipsesOutline, chatbubbleEllipses, logoFacebook,
  logoInstagram, paperPlaneOutline, paperPlane, optionsOutline,
  navigateCircleOutline, timeOutline, walkOutline, carOutline,
  locate, navigate, createOutline, star, lockClosedOutline,
  bedOutline, checkmarkCircleOutline, locationSharp, chevronForwardOutline,
  listOutline, starOutline, arrowForwardOutline, gitBranchOutline, logoTwitter, chatbubblesOutline, location, closeCircle,
  personCircleOutline, alertCircleOutline, bookmark, bookmarkOutline, pinOutline, pin,
  arrowDownOutline, arrowUpOutline, chevronDownOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonicModule, RouterModule,
    HttpClientModule, HttpClientJsonpModule, GoogleMapsModule,
    HeaderComponent, MapDirectionsRenderer, MapCircle, MapMarker,
    WelcomeModalComponent, SplashScreenComponent, RequireLoginModalComponent,
    ActionConfirmModalComponent, ThaiDatePipe
  ],
})
export class HomePage implements OnInit, ViewDidEnter {
  apiLoaded: Observable<boolean>;
  @ViewChild('mapRef') googleMapComponent!: GoogleMap;
  
  // 🗺️ แผนที่
  center: google.maps.LatLngLiteral = { lat: 16.246, lng: 103.252 };
  zoom = 15; 
  mapOptions: google.maps.MapOptions = {
    disableDefaultUI: false, zoomControl: false, mapTypeControl: false,
    streetViewControl: false, fullscreenControl: false,
    styles: [
      {
        featureType: 'poi.business',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      },
      {
        featureType: 'poi.school',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      }
    ]
  };

  dormMarkerIcon: any = {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24"><path fill="#fbc02d" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path fill="#fbc02d" d="M12 6l-5 4v7h3v-4h4v4h3v-7l-5-4z"/></svg>')
  };
  availableDormMarkerIcon: any = null;
  fullDormMarkerIcon: any = null;
  closedDormMarkerIcon: any = null;
  deletedDormMarkerIcon: any = null;

  @ViewChild('hoverInfoWindow') hoverInfoWindow!: MapInfoWindow;
  hoverDorm: any = null;

  // 🔍 ระบบ Filter ค้นหา
  searchText: string = '';
  dorms: Dormitory[] = [];
  allDorms: Dormitory[] = [];
  isModalOpen = false;
  isNotFoundModalOpen = false;
  minPrice: number | null = null;
  maxPrice: number | null = null;
  selectedZone: string = '';
  maxDistance: number = 2;
  zoneOptions: any[] = [];
  minScore: number | null = null;
  maxWaterUnit: number | null = null;  // ค่าน้ำแบบรายหน่วย
  maxWaterLump: number | null = null;  // ค่าน้ำแบบเหมา
  maxElect: number | null = null;

  // 🗺️ Map loading state
  isMapLoading: boolean = true;

  // 🏢 ข้อมูลหอพัก และ Side Panel
  selectedDormDetail: Dormitory | null = null;
  selectedDorm: any = null;
  currentUser: any = null;
  nearbyDorms: any[] = [];  
  dormStatusList: any[] = [];
  
  sidePanelTab: 'info' | 'reviews' = 'info';
  reviews: any[] = [];
  isLoadingReviews: boolean = false;
  isPanelLoading: boolean = false;
  isPanelMinimized: boolean = false;
  
  isDesktop: boolean = false;
  isAlertShowing: boolean = false;
  searchTimeout: any;

  // ⭕ จุดอ้างอิงและวงกลม
  referencePoint: google.maps.LatLngLiteral = { lat: 16.246, lng: 103.252 };
  circleCenter: google.maps.LatLngLiteral | undefined = this.referencePoint;
  circleRadius: number = 1000;
  circleOptions: google.maps.CircleOptions = {
    fillColor: '#FFD600', fillOpacity: 0.2, strokeColor: '#FFD600',
    strokeOpacity: 0.8, strokeWeight: 2, clickable: false,
  };
  userLocationGranted: boolean = false;

  // 🧭 ระบบนำทาง
  directionsService: google.maps.DirectionsService | undefined;
  directionsResult: google.maps.DirectionsResult | undefined = undefined;
  
  walkingTime = '-';
  walkingDistance = '-';
  drivingTime = '-';
  drivingDistance = '-';
  possibleRoutesCount = 0;
  activeTravelMode: 'WALKING' | 'DRIVING' = 'DRIVING';

  mainRouteOptions: google.maps.DirectionsRendererOptions = {
    suppressMarkers: true,
    polylineOptions: { 
      strokeColor: '#ff4d4d', strokeOpacity: 0.9, strokeWeight: 6, zIndex: 5,
      icons: [
        {
          icon: { path: 2, scale: 4, strokeColor: '#ffffff', fillColor: '#ffffff', fillOpacity: 0.8 },
          offset: '50%',
          repeat: '100px'
        }
      ]
    }
  };
  altRouteRenderers: google.maps.DirectionsResult[] = []; 

  directLinePath: google.maps.LatLngLiteral[] | undefined;
  directLineOptions: google.maps.PolylineOptions = {
    strokeOpacity: 0, // ซ่อนเส้นหลักเพื่อให้เห็นแค่ลูกศรบนเส้นแดง
    icons: [
      { 
        icon: { path: 2, scale: 3, strokeColor: '#ffffff', fillColor: '#ffffff', fillOpacity: 1 }, 
        offset: '50%', 
        repeat: '100px' 
      }
    ],
    clickable: false,
    zIndex: 6 // ให้อยู่เหนือเส้นแดง (ซึ่งมี zIndex = 5)
  };

  @ViewChild(MapInfoWindow) infoWindow: MapInfoWindow | undefined;

  // 🧭 สถานะนำทางแบบ Real-time
  isNavigating: boolean = false;
  watchPositionId: number | null = null;
  lastOffRouteAlertTime: number = 0;
  navMarkerIcon: any = null;

  // 🎉 Welcome Modal
  showWelcomeModal = false;

  // ⏳ Splash Screen
  isInitialLoading = true;

  // 🔵 วงกลมครอบโซน
  zoneCircleCenter: google.maps.LatLngLiteral | undefined = undefined;
  zoneCircleRadius: number = 0;
  
  // 🌟 แก้ไข: เอา strokeDashArray ออก เพื่อล้าง Error
  zoneCircleOptions: google.maps.CircleOptions = {
    fillColor: '#2196F3', fillOpacity: 0.08,
    strokeColor: '#2196F3', strokeOpacity: 0.6,
    strokeWeight: 2,
    clickable: false,
  };

  get zoneMarkerOptions(): google.maps.MarkerOptions {
    const canUseGoogle = typeof google === 'object' && typeof google.maps === 'object';
    return {
      icon: canUseGoogle ? {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#2196F3" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/><path fill="#fff" d="M12 12c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm0-5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm0 3c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/></svg>'),
        scaledSize: new google.maps.Size(40, 40),
        labelOrigin: new google.maps.Point(20, -15)
      } as google.maps.Icon : null,
      label: {
        text: this.selectedZone || '',
        color: '#1976d2',
        fontWeight: 'bold',
        fontSize: '15px',
        className: 'map-zone-label'
      },
      zIndex: 998
    };
  }

  locationWatchId?: number | undefined;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private dormService: DormitoryService,
    private httpClient: HttpClient,
    private menuCtrl: MenuController, 
    private cdr: ChangeDetectorRef,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController
  ) {
    addIcons({
      'menu-outline': menuOutline, 'caret-down-outline': caretDownOutline, 'layers-outline': layersOutline, 'close': close, 'close-circle': closeCircle, 'location': location, 'location-outline': locationOutline, 'location-sharp': locationSharp, 'checkmark-circle': checkmarkCircle, 'checkmark-circle-outline': checkmarkCircleOutline, 'chevron-down-circle-outline': chevronDownCircleOutline, 'chevron-forward-outline': chevronForwardOutline, 'call': call, 'chatbubbles-outline': chatbubblesOutline, 'chatbubble-ellipses-outline': chatbubbleEllipsesOutline, 'chatbubble-ellipses': chatbubbleEllipses, 'logo-facebook': logoFacebook, 'logo-instagram': logoInstagram, 'logo-twitter': logoTwitter, 'paper-plane-outline': paperPlaneOutline, 'paper-plane': paperPlane, 'options-outline': optionsOutline, 'navigate-circle-outline': navigateCircleOutline, 'time-outline': timeOutline, 'walk-outline': walkOutline, 'car-outline': carOutline, 'locate': locate, 'navigate': navigate, 'create-outline': createOutline, 'star': star, 'star-outline': starOutline, 'lock-closed-outline': lockClosedOutline, 'bed-outline': bedOutline, 'list-outline': listOutline, 'arrow-forward-outline': arrowForwardOutline, 'git-branch-outline': gitBranchOutline, 'person-circle-outline': personCircleOutline, 'alert-circle-outline': alertCircleOutline, 'bookmark': bookmark, 'bookmark-outline': bookmarkOutline, 'pin-outline': pinOutline, 'pin': pin,
      'arrow-down-outline': arrowDownOutline, 'arrow-up-outline': arrowUpOutline, 'chevron-down-outline': chevronDownOutline
    });

    if (typeof google === 'object' && typeof google.maps === 'object') {
      this.apiLoaded = of(true);
    } else {
      this.apiLoaded = this.httpClient
        .jsonp(`https://maps.googleapis.com/maps/api/js?key=${environment.GGMAPI}&libraries=geometry`, 'callback')
        .pipe(
          map(() => true),
          catchError((err) => {
            console.error('Map Load Error:', err);
            return of(false);
          }),
        );
    }

    this.apiLoaded.subscribe((loaded) => {
      if (loaded && typeof google === 'object' && typeof google.maps === 'object') {
        const getSvgIcon = (color: string) => ({
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24"><path fill="${color}" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path fill="${color}" d="M12 6l-5 4v7h3v-4h4v4h3v-7l-5-4z"/></svg>`),
          scaledSize: new google.maps.Size(36, 36)
        });

        this.dormMarkerIcon = { url: 'assets/yellow.png', scaledSize: new google.maps.Size(36, 36) };
        this.availableDormMarkerIcon = { url: 'assets/green.png', scaledSize: new google.maps.Size(36, 36) };
        this.fullDormMarkerIcon = { url: 'assets/red.png', scaledSize: new google.maps.Size(36, 36) };
        this.closedDormMarkerIcon = { url: 'assets/yellow.png', scaledSize: new google.maps.Size(36, 36) };
        this.deletedDormMarkerIcon = { url: 'assets/gray.png', scaledSize: new google.maps.Size(36, 36) };
        this.mainRouteOptions = {
          suppressMarkers: true,
          polylineOptions: { 
            strokeColor: '#ff4d4d', strokeOpacity: 0.9, strokeWeight: 6, zIndex: 5
          }
        };
      }
    });
  }

  @HostListener('window:resize')
  checkScreenSize() {
    this.isDesktop = window.innerWidth >= 1024;
  }

  ngOnInit() {
    this.checkScreenSize();
    this.checkScreenSize();
    this.checkLoginStatus();
    this.fetchZones();
    this.fetchDormStatuses();
    
    this.fetchDorms().then(() => {
      this.isMapLoading = false;
      setTimeout(() => {
        this.isInitialLoading = false;
        this.checkForNavigationIntent();
        this.cdr.detectChanges();
      }, 1500);
    });

    this.getCurrentLocation(true);
  }

  fetchDormStatuses() {
    this.dormService.getDormStatuses().subscribe({
      next: (res: any) => this.dormStatusList = res.data || res,
      error: () => console.error('Failed to load dorm statuses')
    });
  }

  ionViewWillEnter() {
    // 🧹 เคลียร์ State การเลือกหอพักทุกครั้งที่กลับมาหน้า Home
    // เพื่อป้องกันบั๊กที่หอพักยังถูกเลือกค้างไว้หลังจากกลับมาจากหน้า Login
    this.closeDetailPanel();
  }

  ionViewWillLeave() {
    this.isModalOpen = false;
    if (this.isNavigating) {
      this.stopNavigation();
    }
    this.closeDetailPanel();
  }

  async ionViewDidEnter() {
    const storedData = localStorage.getItem('loggedIn');
    if (storedData) {
      try {
        const userObj = JSON.parse(storedData);
        if ((userObj.id || userObj.USER_ID) && userObj.accout_status === 0) {
          this.currentUser = userObj.user ? userObj.user : userObj;
          await this.refreshFavorites();
          this.cdr.detectChanges();
        }
      } catch (e) {}
    }
  }

  async refreshFavorites() {
    if (this.currentUser && (this.currentUser.id || this.currentUser.USER_ID)) {
      try {
        const favRes = await this.dormService.getMyFavorites(Number(this.currentUser.id || this.currentUser.USER_ID));
        if (favRes) {
          const favoriteIds = (favRes as any[]).map(f => Number(f.DORM_ID || f.dorm_id));
          
          this.allDorms.forEach(d => {
            d.isChecked = favoriteIds.includes(Number(d.DORM_ID || d.id));
          });
          this.dorms.forEach(d => {
            d.isChecked = favoriteIds.includes(Number(d.DORM_ID || d.id));
          });

          if (this.selectedDorm) {
             this.selectedDorm.isChecked = favoriteIds.includes(Number(this.selectedDorm.DORM_ID || this.selectedDorm.id));
          }
          this.cdr.detectChanges();
        }
      } catch (e) { console.error('Fetch fav error:', e); }
    }
  }

  checkLoginStatus() {
    const storedData = localStorage.getItem('loggedIn');
    if (storedData) {
      try {
        const userObj = JSON.parse(storedData);
        if ((userObj.id || userObj.USER_ID) && userObj.accout_status === 0) {
          this.currentUser = userObj.user ? userObj.user : userObj;

          if (userObj.showWelcome === true) {
            userObj.showWelcome = false;
            localStorage.setItem('loggedIn', JSON.stringify(userObj));
            setTimeout(() => {
              this.showWelcomeModal = true;
              this.cdr.detectChanges();
            }, 200);
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
  }

  checkForNavigationIntent() {
    this.route.queryParams.subscribe(params => {
      if (params['navLat'] && params['navLng'] && params['dormId']) {
        const dId = Number(params['dormId']);
        let targetDorm = this.allDorms.find(d => Number(d.DORM_ID) === dId || Number(d.id) === dId);
        
        // ถ้าไม่พบใน allDorms (กรณีข้อมูลยังไม่โหลด หรือมาจากหน้าอื่น) ให้สร้าง Object จำลองเพื่อให้นำทางได้
        if (!targetDorm) {
          targetDorm = {
            DORM_ID: dId,
            id: dId,
            lat: Number(params['navLat']),
            lng: Number(params['navLng']),
            DORM_NAME: 'พิกัดหอพัก',
            dorm_name: 'พิกัดหอพัก',
            images: [],
            price_per_month: 0
          } as any;
        }

        if (targetDorm) {
          setTimeout(() => {
            this.openInfoWindow(null as any, targetDorm);
            if (!this.userLocationGranted) {
               this.getCurrentLocation(false); 
            }
          }, 800);
        }
      }
    });
  }

  isLocating: boolean = false;

  async onDistanceChange(event?: any) {
    if (!this.currentUser) {
      this.maxDistance = 2;
      const modal = await this.modalCtrl.create({
        component: AlertModalComponent,
        componentProps: {
          title: 'สำหรับสมาชิกเท่านั้น',
          message: 'กรุณาเข้าสู่ระบบเพื่อปรับเปลี่ยนระยะทางในการค้นหาหอพัก',
          type: 'warning'
        },
        cssClass: 'custom-alert-modal'
      });
      await modal.present();
      return;
    }
    this.performSearch();
  }

  getCurrentLocation(isSilent = false) {
    if (this.selectedZone) {
      if (!isSilent) this.showToast('คุณกำลังเลือกโซนอยู่ กรุณาล้างตัวกรองโซนก่อนใช้ตำแหน่งปัจจุบัน', 'warning', 'alert-circle-outline');
      return;
    }
    
    if (!isSilent) this.isLocating = true;
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isSilent) {
             this.isLocating = false;
             this.cdr.detectChanges();
          }
          this.userLocationGranted = true;
          const newPos: google.maps.LatLngLiteral = { lat: position.coords.latitude, lng: position.coords.longitude };
          this.referencePoint = newPos;
          this.center = newPos;
          this.zoom = 15;
          
          this.directionsResult = undefined;
          this.altRouteRenderers = [];

          if (this.googleMapComponent?.googleMap) {
            this.googleMapComponent.googleMap.panTo(newPos);
            this.googleMapComponent.googleMap.setZoom(15);
          }
          this.cdr.detectChanges();
          
          if (this.selectedDorm) {
            this.calculateActiveTravelMode(this.selectedDorm.lat, this.selectedDorm.lng);
          }
          
          this.performSearch();
          
          if (!isSilent) this.showToast('ดึงตำแหน่งปัจจุบันสำเร็จ', 'success', 'location-outline');

          if (this.locationWatchId === undefined) {
            this.locationWatchId = navigator.geolocation.watchPosition(
              (pos) => {
                const newLat = pos.coords.latitude;
                const newLng = pos.coords.longitude;
                const dist = this.calculateDistance(this.referencePoint.lat, this.referencePoint.lng, newLat, newLng);
                if (dist > 5) {
                  this.referencePoint = { lat: newLat, lng: newLng };
                  this.cdr.detectChanges();
                }
              },
              (err) => console.error('Watch position error:', err),
              { enableHighAccuracy: true }
            );
          }
        },
        (error) => { 
          if (!isSilent) {
             this.isLocating = false;
             this.cdr.detectChanges();
          }
          this.userLocationGranted = false;
          if (!isSilent) this.showLocationAlert(); 
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else { 
      if (!isSilent) {
         this.isLocating = false;
         this.showToast('เบราว์เซอร์นี้ไม่รองรับการดึงตำแหน่ง (GPS)', 'danger', 'alert-circle-outline');
         this.cdr.detectChanges();
      }
    }
  }

  async showLocationAlert() {
    const modal = await this.modalCtrl.create({
      component: AlertModalComponent,
      componentProps: {
        title: 'ต้องการเปิด GPS',
        message: 'เพื่อประสบการณ์ที่ดีที่สุดในการค้นหา กรุณาอนุญาตการเข้าถึงตำแหน่งของอุปกรณ์ หรือลองกดปุ่มพิกัดอีกครั้งครับ',
        type: 'error'
      },
      cssClass: 'custom-alert-modal'
    });
    await modal.present();
  }

  async showAuthAlert() {
    const modal = await this.modalCtrl.create({
      component: AlertModalComponent,
      componentProps: {
        title: 'สำหรับสมาชิกเท่านั้น',
        message: 'กรุณาเข้าสู่ระบบเพื่อใช้งานตัวกรองนี้ครับ',
        type: 'warning'
      },
      cssClass: 'custom-alert-modal'
    });
    await modal.present();
  }

  async showToast(msg: string, color: string, icon: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      color: color,
      duration: 3000,
      position: 'top', 
      icon: icon
    });
    toast.present();
  }

  openMenu() { window.dispatchEvent(new CustomEvent('toggle-sidebar')); }

  pinMode: boolean = false;
  async togglePinMode() {
    // เช็คว่าล็อกอินหรือยัง
    if (!this.currentUser || !(this.currentUser.id || this.currentUser.USER_ID)) {
      const modal = await this.modalCtrl.create({
        component: AlertModalComponent,
        componentProps: {
          title: 'สำหรับสมาชิกเท่านั้น',
          message: 'กรุณาเข้าสู่ระบบก่อนใช้งานโหมดย้ายตำแหน่งครับ',
          type: 'warning'
        },
        cssClass: 'custom-alert-modal'
      });
      await modal.present();
      return;
    }

    if (this.selectedZone) {
      this.showToast('คุณกำลังเลือกโซนอยู่ กรุณาล้างตัวกรองโซนก่อนย้ายตำแหน่ง', 'warning', 'alert-circle-outline');
      return;
    }
    this.pinMode = !this.pinMode;
    if (this.pinMode) {
      this.showToast('คลิกบนแผนที่เพื่อปักหมุดจุดอ้างอิง', 'warning', 'pin');
    } else {
      this.showToast('ยกเลิกโหมดปักหมุดแล้ว', 'medium', 'close');
    }
  }

  onMapClick(event: google.maps.MapMouseEvent) { 
    if (this.infoWindow) this.infoWindow.close(); 
    
    if (this.pinMode && event.latLng) {
      if (this.selectedZone) {
        this.showToast('คุณกำลังเลือกโซนอยู่ กรุณาล้างตัวกรองโซนก่อนย้ายตำแหน่ง', 'warning', 'alert-circle-outline');
        this.pinMode = false;
        return;
      }
      this.referencePoint = { lat: event.latLng.lat(), lng: event.latLng.lng() };
      this.center = this.referencePoint;
      
      this.showToast('อัปเดตจุดอ้างอิงสำเร็จ', 'success', 'location-sharp');
      
      // Auto toggle off pin mode after clicking
      this.pinMode = false;
      
      this.performSearch();
    }
  }

  async fetchZones() {
    try { const res = await this.dormService.getZones(); if (res.success) this.zoneOptions = res.data; } 
    catch (error) { console.error('Fetch Zones Error:', error); }
  }

  async fetchDorms() {
    try {
      const res = await this.dormService.getAllDorms();
      let favoriteIds: number[] = [];
      if (this.currentUser && (this.currentUser.id || this.currentUser.USER_ID)) {
        try {
           const favRes = await this.dormService.getMyFavorites(Number(this.currentUser.id || this.currentUser.USER_ID));
           if (favRes) {
              favoriteIds = (favRes as any[]).map(f => Number(f.DORM_ID || f.dorm_id));
           }
        } catch (e) { console.error('Fetch fav error:', e); }
      }

      if (res.success && res.data) {
        const formatImg = (url: string | null | undefined): string | null => {
            return url || null;
        };

        let processedDorms = res.data.map((d: any) => ({ 
          ...d, 
          image: formatImg(d.image),
          FRONT_DORM_IMAGE: formatImg(d.FRONT_DORM_IMAGE),
          lat: Number(d.lat), 
          lng: Number(d.lng),
          isChecked: favoriteIds.includes(Number(d.DORM_ID || d.id))
        })) as any[];        

        // Filter out closed (2) and deleted (4) dorms for non-admins (role != 3)
        const userRole = this.currentUser ? (this.currentUser.role_id || this.currentUser.ROLE_ID || this.currentUser.role) : null;
        if (Number(userRole) !== 3) {
            processedDorms = processedDorms.filter((d: any) => {
                const sId = Number(d.status || d.DORM_STATUS_ID);
                return sId === 1 || sId === 3; // Only show open (1) and full (3)
            });
        }
        
        this.allDorms = processedDorms;
        this.dorms = [...this.allDorms];
        // ✅ Call performSearch to apply initial radius filter
        this.performSearch();
      } else {
        this.showToast('ไม่พบข้อมูลหอพักในระบบขณะนี้', 'warning', 'alert-circle-outline');
      }
    } catch (err) {
      console.error('Search Dorms Error:', err);
      // เปลี่ยนมาใช้ AlertModalComponent ตามคำแนะนำ
      const modal = await this.modalCtrl.create({
        component: AlertModalComponent,
        componentProps: {
          title: 'เกิดข้อผิดพลาด',
          message: 'ไม่สามารถโหลดข้อมูลหอพักได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตหรือเซิร์ฟเวอร์',
          type: 'error',
          isMapCentered: true
        },
        cssClass: 'custom-alert-modal'
      });
      await modal.present();
    }
  }

  onZoomChanged() {
    if (this.googleMapComponent?.googleMap) {
      this.zoom = this.googleMapComponent.googleMap.getZoom() || this.zoom;
    }
  }

  trackByDormId(index: number, dorm: any): number {
    return dorm?.DORM_ID;
  }

  getDormMarkerIcon(dorm: any): any {
    const statusId = Number(dorm.status || dorm.DORM_STATUS_ID);
    if (statusId === 1) return this.availableDormMarkerIcon || this.dormMarkerIcon;
    if (statusId === 3) return this.fullDormMarkerIcon || this.dormMarkerIcon;
    if (statusId === 2) return this.closedDormMarkerIcon || this.dormMarkerIcon;
    if (statusId === 4) return this.deletedDormMarkerIcon || this.dormMarkerIcon;
    return this.dormMarkerIcon;
  }

  hoverTimeout: any;
  mouseX = 0;
  mouseY = 0;

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  }

  openHoverCard(marker: MapMarker, dorm: any) {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
    this.hoverDorm = dorm;
    if (this.hoverInfoWindow) {
      this.hoverInfoWindow.open(marker);
    }
  }

  closeHoverCard() {
    this.hoverTimeout = setTimeout(() => {
      this.hoverDorm = null;
      if (this.hoverInfoWindow) {
        this.hoverInfoWindow.close();
      }
    }, 200);
  }

  keepHoverCardOpen() {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
  }

  getFacIconPath(fac: any): string {
    const iconName = fac?.FAC_TYPE_ICON || fac?.icon;
    if (!iconName) return '';
    if (iconName.startsWith('http') || iconName.startsWith('assets/')) {
      return iconName;
    }
    return `assets/allIcons/${iconName}`;
  }

  onSearch(text: any) {
    const searchValue = (typeof text === 'string' ? text : text?.target?.value || '').trim();
    this.searchText = searchValue;
    this.performSearch();
  }

  // กดเลือกหอพักจาก autocomplete dropdown
  onDormSelected(dorm: any) {
    this.searchText = dorm.DORM_NAME;
    const target = this.allDorms.find(d =>
      Number(d.DORM_ID) === Number(dorm.DORM_ID || dorm.id)
    ) || dorm;
    this.openInfoWindow(null as any, target);
  }

  // กดปุ่มค้นหา — ถาม filter ใน alert ถ้ามีตัวกรอง active
  async onSearchSubmit(payload: { text: string; keepFilter: boolean }) {
    this.searchText = payload.text;
    if (payload.keepFilter && this.hasActiveFilter()) {
      const alert = await this.alertCtrl.create({
        header: '🔍 ค้นหา "' + payload.text + '"',
        message: 'คุณตั้งตัวกรองไว้ ต้องการใช้ตัวกรองนั้นร่วมด้วยหรือไม่?',
        buttons: [
          {
            text: 'ค้นหาตรงๆ (ล้างตัวกรอง)',
            role: 'cancel',
            handler: () => {
              this.clearAllFilters();
              this.performSearch();
            }
          },
          {
            text: 'ใช้ตัวกรองด้วย ✔️',
            handler: () => { this.performSearch(); }
          }
        ]
      });
      await alert.present();
    } else {
      this.performSearch();
    }
  }

  get hasActiveFilterComputed(): boolean { return this.hasActiveFilter(); }

  hasActiveFilter(): boolean {
    return (this.minPrice !== null && this.minPrice !== undefined && this.minPrice !== 0) || 
           (this.maxPrice !== null && this.maxPrice !== undefined && this.maxPrice !== 0) || 
           !!this.selectedZone ||
           (this.maxDistance !== null && this.maxDistance !== undefined && this.maxDistance !== 2) || 
           (this.minScore !== null && this.minScore !== undefined && this.minScore !== 0) || 
           (this.maxWaterUnit !== null && this.maxWaterUnit !== undefined && this.maxWaterUnit !== 0) || 
           (this.maxWaterLump !== null && this.maxWaterLump !== undefined && this.maxWaterLump !== 0) || 
           (this.maxElect !== null && this.maxElect !== undefined && this.maxElect !== 0);
  }

  clearAllFilters() {
    this.minPrice = null; this.maxPrice = null; this.selectedZone = '';
    this.maxDistance = 2; this.minScore = null; this.maxWaterUnit = null;
    this.maxWaterLump = null; this.maxElect = null;
    this.zoneCircleCenter = undefined; this.zoneCircleRadius = 0;
    this.circleCenter = this.referencePoint;
    this.circleRadius = 1000;
  }

  applyFilter() { this.setOpen(false); this.performSearch(); }

  performSearch() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this._doPerformSearch();
    }, 300);
  }

  async _doPerformSearch() {
    try {
      const res = await this.dormService.searchDorms(
        this.searchText, 
        this.selectedZone, 
        this.minPrice !== null ? this.minPrice : undefined, 
        this.maxPrice !== null ? this.maxPrice : undefined
      );
      if (res.success && res.data) {
        let tempDorms = res.data.map((d: any) => ({ ...d, lat: Number(d.lat), lng: Number(d.lng) })) as any[];
        
        if (this.selectedZone) {
          const targetZone = this.zoneOptions.find(z => z.ZONE_NAME === this.selectedZone);
          if (targetZone && targetZone.lat && targetZone.lng) {
            const newCenter = { lat: Number(targetZone.lat), lng: Number(targetZone.lng) };
            this.center = newCenter;
            this.zoom = 14;
            if (this.googleMapComponent?.googleMap) {
              this.googleMapComponent.googleMap.panTo(newCenter);
              this.googleMapComponent.googleMap.setZoom(14);
            }

            const dormsInZone = tempDorms;
            if (dormsInZone.length > 0) {
              const maxDist = Math.max(...dormsInZone.map((d: any) =>
                this.calculateDistance(newCenter.lat, newCenter.lng, d.lat, d.lng) * 1000
              ));
              this.zoneCircleCenter = newCenter;
              this.zoneCircleRadius = Math.max(maxDist + 300, 800); 
            } else {
              this.zoneCircleCenter = newCenter;
              this.zoneCircleRadius = 1000;
            }
          }
        } else {
          this.zoneCircleCenter = undefined;
          this.zoneCircleRadius = 0;
        }

        if (this.maxDistance !== null && this.maxDistance !== undefined) {
          const searchOrigin = this.selectedZone && this.zoneCircleCenter ? this.zoneCircleCenter : this.referencePoint;
          this.circleCenter = searchOrigin;
          this.circleRadius = this.maxDistance * 1000;
          tempDorms = tempDorms.filter((dorm: any) =>
            this.calculateDistance(searchOrigin.lat, searchOrigin.lng, dorm.lat, dorm.lng) <= this.maxDistance!
          );
        } else {
          this.circleCenter = undefined;
        }

        if (this.minScore !== null && this.minScore !== undefined) {
          if (this.minScore === 5) {
            tempDorms = tempDorms.filter((dorm: any) => dorm.SCORE === 5);
          } else {
            tempDorms = tempDorms.filter((dorm: any) => dorm.SCORE >= this.minScore! && dorm.SCORE < (this.minScore! + 1));
          }
        }
        if (this.maxWaterUnit !== null && this.maxWaterUnit !== undefined) tempDorms = tempDorms.filter((dorm: any) => dorm.WATER_UNIT > 0 && dorm.WATER_UNIT <= this.maxWaterUnit!);
        if (this.maxWaterLump !== null && this.maxWaterLump !== undefined) tempDorms = tempDorms.filter((dorm: any) => dorm.WATER_LUMP > 0 && dorm.WATER_LUMP <= this.maxWaterLump!);
        if (this.maxElect !== null && this.maxElect !== undefined) tempDorms = tempDorms.filter((dorm: any) => dorm.ELECT_UNIT <= this.maxElect!);

        this.dorms = tempDorms as any[];

        // ถ้า selectedDorm ถูก filter ออกจากรัศมีใหม่ ให้ล้างการเลือกและเส้นทาง
        if (this.selectedDorm) {
          const stillExists = this.dorms.some(
            (d: any) => Number(d.DORM_ID) === Number(this.selectedDorm.DORM_ID)
          );
          if (!stillExists) {
            this.selectedDorm = null;
            this.directionsResult = undefined;
            this.directLinePath = undefined;
            this.altRouteRenderers = [];
            this.isNavigating = false;
          }
        }

        this.cdr.detectChanges();

        if (this.dorms.length === 0) {
          if (!this.isAlertShowing) {
            this.isAlertShowing = true;
            setTimeout(async () => {
              const top = await this.modalCtrl.getTop();
              if (top) {
                this.isAlertShowing = false;
                return;
              }
              const hasFilter = this.hasActiveFilter();
              const modal = await this.modalCtrl.create({
                component: AlertModalComponent,
                componentProps: {
                  title: 'ไม่พบหอพัก',
                  message: hasFilter 
                    ? 'ไม่มีหอพักที่ตรงกับเงื่อนไขที่คุณตั้งไว้ กรุณาลองปรับตัวกรองหรือขยายระยะทางเพิ่มเติม' 
                    : 'ไม่พบหอพักในบริเวณนี้ กรุณาลองขยายระยะทางเพิ่มเติม (เช่น 2 กม. หรือ 3 กม.)',
                  type: 'warning',
                  isMapCentered: true
                },
                cssClass: 'custom-alert-modal'
              });
              modal.onDidDismiss().then(() => this.isAlertShowing = false);
              await modal.present();
            }, 300);
          }
        }

        if (!this.selectedZone && this.dorms.length > 0) {
          if (this.maxDistance === null || this.maxDistance === undefined) {
            const firstDorm = this.dorms[0];
            if (firstDorm) this.center = { lat: firstDorm.lat, lng: firstDorm.lng };
          }
          this.zoom = 15;
          if (this.googleMapComponent?.googleMap) {
            this.googleMapComponent.googleMap.panTo(this.center);
            this.googleMapComponent.googleMap.setZoom(15);
          }
        }
      } else {
        this.dorms = [];
        this.circleCenter = undefined;
        this.zoneCircleCenter = undefined;
        this.cdr.detectChanges();
        if (!this.isAlertShowing) {
          this.isAlertShowing = true;
          setTimeout(async () => {
            const top = await this.modalCtrl.getTop();
            if (top) {
              this.isAlertShowing = false;
              return;
            }
            const modal = await this.modalCtrl.create({
              component: AlertModalComponent,
              componentProps: {
                title: 'ไม่พบข้อมูล',
                message: 'ไม่พบหอพักจากระบบ กรุณาลองใหม่อีกครั้ง',
                type: 'warning',
                isMapCentered: true
              },
              cssClass: 'custom-alert-modal'
            });
            modal.onDidDismiss().then(() => this.isAlertShowing = false);
            await modal.present();
          }, 300);
        }
      }
    } catch (err) { 
      console.error('Search Error:', err); 
      this.showToast('เกิดข้อผิดพลาดในการค้นหาหอพัก', 'danger', 'alert-circle-outline');
    }
  }

  getDormMinPrice(dorm: any): number {
    if (!dorm) return 0;
    return Number(dorm.start_price || dorm.START_PRICE || 0);
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  deg2rad(deg: number): number { return deg * (Math.PI / 180); }

  togglePanelSize() {
    this.isPanelMinimized = !this.isPanelMinimized;
  }

  openInfoWindow(marker: MapMarker, dorm: any) {
    this.selectedDorm = { ...dorm };
    this.sidePanelTab = 'info';
    this.isPanelMinimized = false;
    this.isPanelLoading = true;
    
    if (this.googleMapComponent?.googleMap) {
      this.googleMapComponent.googleMap.panTo({ lat: dorm.lat, lng: dorm.lng });
      this.googleMapComponent.googleMap.setZoom(16);
      setTimeout(() => {
        this.googleMapComponent?.googleMap?.panBy(0, 150); 
      }, 300);
    } else {
      this.center = { lat: dorm.lat, lng: dorm.lng };
      this.zoom = 16;
    }

    this.directLinePath = undefined;

    this.directionsResult = undefined;
    this.altRouteRenderers = [];
    this.walkingTime = '-';
    this.walkingDistance = '-';
    this.drivingTime = '-';
    this.drivingDistance = '-';

    this.nearbyDorms = this.dorms
      .filter((d: any) => Number(d.DORM_ID) !== Number(dorm.DORM_ID))
      .sort((a: any, b: any) => this.calculateDistance(this.referencePoint.lat, this.referencePoint.lng, a.lat, a.lng) - this.calculateDistance(this.referencePoint.lat, this.referencePoint.lng, b.lat, b.lng));
    this.cdr.detectChanges(); 

    setTimeout(async () => {
      try {
        const res = await this.dormService.getDormById(dorm.DORM_ID);
        if (res.success && res.data) {
          // ดึง isChecked ล่าสุดจาก allDorms เสมอ เพื่อไม่ให้ค่าเก่าทับค่าใหม่
          const latestChecked = this.allDorms.find(d => Number(d.DORM_ID) === Number(dorm.DORM_ID))?.isChecked ?? dorm.isChecked;
          this.selectedDorm = { ...this.selectedDorm, ...res.data, isChecked: latestChecked };
          this.cdr.detectChanges();
        }
      } catch (e) { console.error(e); }

      const dist = this.calculateDistance(this.referencePoint.lat, this.referencePoint.lng, dorm.lat, dorm.lng);
      if (dist <= 15) {
        this.calculateActiveTravelMode(dorm.lat, dorm.lng);
      } else {
        this.drivingTime = 'ระยะทางไกลเกินไป';
        this.drivingDistance = `> ${dist.toFixed(0)} กม.`;
        this.walkingTime = 'ระยะทางไกลเกินไป';
        this.walkingDistance = `> ${dist.toFixed(0)} กม.`;
      }
      this.loadReviews(dorm.DORM_ID);
      this.isPanelLoading = false;
      this.cdr.detectChanges();
    }, 300); 
  }

  closeDetailPanel() { 
    if (this.isNavigating) return;
    this.selectedDorm = null; 
    this.isPanelMinimized = false; 
    this.isPanelLoading = false;
    this.directLinePath = undefined;
    this.directionsResult = undefined; 
    this.altRouteRenderers = []; 
    this.nearbyDorms = [];

    this.router.navigate([], { queryParams: {} });
  }

  selectNearbyDorm(dorm: any) { this.openInfoWindow(null as any, dorm); }

  getDistanceText(dorm: any): string {
    const dist = this.calculateDistance(this.referencePoint.lat, this.referencePoint.lng, dorm.lat, dorm.lng);
    return dist < 1 ? `${Math.round(dist * 1000)} ม.` : `${dist.toFixed(1)} กม.`;
  }

  async loadReviews(dormId: number) {
    this.isLoadingReviews = true;
    try {
      const res = await this.dormService.getReviewsByDormId(dormId);
      this.reviews = (res && res.data) ? res.data : [];
    } catch (error) { this.reviews = []; } 
    finally { this.isLoadingReviews = false; this.cdr.detectChanges(); }
  }

  calculateActiveTravelMode(destLat: number, destLng: number) {
    if (!this.directionsService) this.directionsService = new google.maps.DirectionsService();
    
    const origin = this.referencePoint;
    const destination = { lat: destLat, lng: destLng };
    const straightDist = this.calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    
    const provideAlt = false; 

    if (this.activeTravelMode === 'WALKING' && straightDist > 10) {
      this.walkingTime = 'ไกลเกินเดินไหว';
      this.walkingDistance = `> ${straightDist.toFixed(1)} กม.`;
      this.directionsResult = undefined;
      this.altRouteRenderers = [];
      this.cdr.detectChanges();
      return; 
    }

    this.directionsService.route({
      origin, destination, travelMode: google.maps.TravelMode[this.activeTravelMode], provideRouteAlternatives: provideAlt
    }, (res, status) => {
      if (status === google.maps.DirectionsStatus.OK && res) {
        if (this.activeTravelMode === 'DRIVING') {
          this.drivingTime = res.routes[0]?.legs[0]?.duration?.text || '-';
          this.drivingDistance = res.routes[0]?.legs[0]?.distance?.text || '-';
          this.possibleRoutesCount = 1; 
        } else {
          this.walkingTime = res.routes[0]?.legs[0]?.duration?.text || '-';
          this.walkingDistance = res.routes[0]?.legs[0]?.distance?.text || '-';
        }
        this.renderRoutesOnMap(res);
      }
    });
  }

  renderRoutesOnMap(result: google.maps.DirectionsResult) {
    this.directionsResult = result;
    this.altRouteRenderers = []; 
    // นำเส้นทางจริงมาใช้สำหรับวาดลูกศรทับลงไป
    if (result.routes && result.routes.length > 0 && result.routes[0]!.overview_path) {
      // แปลง overview_path เป็น LatLngLiteral[]
      this.directLinePath = result.routes[0]!.overview_path.map(p => ({ lat: p.lat(), lng: p.lng() }));
    }
    this.cdr.detectChanges();
  }

  changeTravelMode(mode: 'WALKING' | 'DRIVING') {
    if (this.activeTravelMode === mode) return; 
    this.activeTravelMode = mode;
    this.directionsResult = undefined; 
    this.altRouteRenderers = [];
    if (this.selectedDorm) { this.calculateActiveTravelMode(this.selectedDorm.lat, this.selectedDorm.lng); }
  }

  getAltRouteOptions() {
    return { suppressMarkers: true, polylineOptions: { strokeColor: '#a4b0be', strokeOpacity: 0.7, strokeWeight: 4, zIndex: 2 } };
  }

  goToDetail() {
    if (this.selectedDorm) {
      const dormId = this.selectedDorm.DORM_ID || this.selectedDorm.id;
      if (dormId) {
        this.selectedDorm = null; // ปิด Panel/Modal ก่อนเปลี่ยนหน้า
        // หน่วงเวลาเล็กน้อยให้ Modal มีเวลาปิดตัวลงก่อนเปลี่ยนหน้า (ป้องกันบั๊กเปิดทับ)
        setTimeout(() => {
          this.router.navigate(['/dorm-detail', dormId]);
        }, 300);
      }
    }
  }

  // ==========================================
  // 🧭 Navigation System (Real-time GPS Tracking)
  // ==========================================
  startNavigation() {
    if (!navigator.geolocation) {
      this.toastCtrl.create({ message: 'อุปกรณ์ของคุณไม่รองรับ GPS', duration: 2000, color: 'danger' }).then(t => t.present());
      return;
    }

    this.isNavigating = true;
    this.isPanelMinimized = true; 

    const isDriving = this.activeTravelMode === 'DRIVING';
    const svgIcon = isDriving 
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24"><path fill="#2196F3" d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24"><path fill="#4CAF50" d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/></svg>';
      
    this.navMarkerIcon = {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgIcon),
      scaledSize: typeof google !== 'undefined' ? new google.maps.Size(46, 46) : null,
      anchor: typeof google !== 'undefined' ? new google.maps.Point(23, 23) : null
    };

    this.watchPositionId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        this.referencePoint = { lat: newLat, lng: newLng };
        
        if (this.googleMapComponent?.googleMap) {
          this.googleMapComponent.googleMap.panTo(this.referencePoint);
        }

        this.checkOffRoute(newLat, newLng);
        this.cdr.detectChanges();
      },
      (err) => { console.error('Watch Position Error', err); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  }

  stopNavigation() {
    this.isNavigating = false;
    if (this.watchPositionId !== null) {
      navigator.geolocation.clearWatch(this.watchPositionId);
      this.watchPositionId = null;
    }
    this.navMarkerIcon = null;
    this.cdr.detectChanges();
  }

  checkOffRoute(lat: number, lng: number) {
    if (!this.directionsResult || !this.directionsResult.routes[0] || !google.maps.geometry) return;

    const path = this.directionsResult.routes[0].overview_path;
    const currentLoc = new google.maps.LatLng(lat, lng);
    const polyline = new google.maps.Polyline({ path: path });

    const isOnRoute = google.maps.geometry.poly.isLocationOnEdge(currentLoc, polyline, 0.0005);
    
    if (!isOnRoute) {
      const now = Date.now();
      if (now - this.lastOffRouteAlertTime > 30000) {
        this.lastOffRouteAlertTime = now;
        this.toastCtrl.create({
          message: '⚠️ คุณออกนอกเส้นทาง! กรุณาตรวจสอบแผนที่อีกครั้ง',
          duration: 3000,
          color: 'warning',
          position: 'top'
        }).then(t => t.present());
      }
    }
  }

  goToLogin() { this.router.navigate(['/login']); }
  goToCompare() { this.router.navigate(['/compare']); }
  setOpen(isOpen: boolean) { this.isModalOpen = isOpen; }
  openFilter() { this.setOpen(true); }
  selectZone(zoneName: string) {
    this.selectedZone = this.selectedZone === zoneName ? '' : zoneName;
    if (!this.selectedZone) {
      this.zoneCircleCenter = undefined;
      this.zoneCircleRadius = 0;
    }
  }



  goToManageDorm(dormId: number) {
    this.router.navigate(['/edit-dorm', dormId]);
  }

  async toggleFavorite(event: Event, dorm: any) {
    event.stopPropagation(); 
    event.preventDefault(); 

    if (!this.currentUser || !(this.currentUser.id || this.currentUser.USER_ID)) {
        const modal = await this.modalCtrl.create({
            component: RequireLoginModalComponent,
            cssClass: 'custom-alert-modal'
        });
        await modal.present();
        
        const { role } = await modal.onDidDismiss();
        if (role === 'login') {
            this.router.navigate(['/login']);
        }
        return;
    }

    const userRole = this.currentUser.role_id || this.currentUser.ROLE_ID;
    if (userRole == 2 || userRole == 3) {
        const modal = await this.modalCtrl.create({
            component: ActionConfirmModalComponent,
            componentProps: {
                title: 'ไม่สามารถใช้งานได้',
                message: 'แอดมินหรือเจ้าของหอพัก ไม่สามารถกดรายการโปรดได้ครับ',
                confirmText: 'ปิด',
                type: 'warning',
                showCancel: false
            },
            cssClass: 'custom-alert-modal'
        });
        await modal.present();
        return;
    }

    const currentUserId = Number(this.currentUser.id || this.currentUser.USER_ID);

    if (dorm.isChecked) {
        const modal = await this.modalCtrl.create({
            component: ActionConfirmModalComponent,
            componentProps: {
                title: 'ยกเลิกการสนใจ',
                message: 'คุณต้องการยกเลิกการสนใจหอพักนี้ใช่หรือไม่?',
                confirmText: 'ใช่, ยกเลิก',
                cancelText: 'ไม่',
                type: 'danger'
            },
            cssClass: 'custom-alert-modal'
        });
        await modal.present();
        
        const { role } = await modal.onDidDismiss();
        if (role === 'confirm') {
            try {
                await this.dormService.removeFavorite(currentUserId, dorm.DORM_ID || dorm.id);
                dorm.isChecked = false;
                const targetInAll = this.allDorms.find(d => Number(d.DORM_ID) === Number(dorm.DORM_ID || dorm.id));
                if (targetInAll) targetInAll.isChecked = false;
                this.showToast('ยกเลิกการสนใจเรียบร้อย', 'medium', 'bookmark-outline');
                this.cdr.detectChanges();
            } catch (error) {
                this.showToast('เกิดข้อผิดพลาดในการยกเลิก', 'danger', 'alert-circle-outline');
            }
        }
        return;
    }

    const modal = await this.modalCtrl.create({
        component: ActionConfirmModalComponent,
        componentProps: {
            title: 'ยืนยัน',
            message: 'คุณสนใจหอพักนี้ใช่หรือไม่?',
            confirmText: 'ใช่, สนใจ',
            cancelText: 'ยกเลิก',
            type: 'confirm'
        },
        cssClass: 'custom-alert-modal'
    });
    await modal.present();
    
    const { role } = await modal.onDidDismiss();
    if (role === 'confirm') {
        try {
            await this.dormService.addFavorite(currentUserId, dorm.DORM_ID || dorm.id);
            dorm.isChecked = true; 
            const targetInAll = this.allDorms.find(d => Number(d.DORM_ID) === Number(dorm.DORM_ID || dorm.id));
            if (targetInAll) targetInAll.isChecked = true;
            this.showToast(`เพิ่ม "${dorm.DORM_NAME}" ลงรายการสนใจเรียบร้อย!`, 'success', 'bookmark');
            this.cdr.detectChanges();
        } catch (error: any) {
            if (error.status === 409 || (error.error && error.error.message === 'Duplicate')) {
                dorm.isChecked = true;
                const targetInAll = this.allDorms.find(d => Number(d.DORM_ID) === Number(dorm.DORM_ID || dorm.id));
                if (targetInAll) targetInAll.isChecked = true;
                this.showToast('หอพักนี้มีในรายการสนใจแล้วครับ', 'warning', 'bookmark');
                this.cdr.detectChanges();
            } else {
                this.showToast('เกิดข้อผิดพลาดในการบันทึก', 'danger', 'alert-circle-outline');
            }
        }
    }
  }
}