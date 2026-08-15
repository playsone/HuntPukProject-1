import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ActionSheetController } from '@ionic/angular';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  menuOutline, homeOutline, listOutline, starOutline, logOutOutline, person,
  business, people, documentText, map, time, businessOutline, mapOutline,
  peopleOutline, personCircleOutline, documentTextOutline, statsChart, alertCircle,
  shieldCheckmark, closeCircle, close, locationOutline, globeOutline, checkmarkCircleOutline, powerOutline, banOutline, alertCircleOutline, arrowForwardOutline
} from 'ionicons/icons';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables } from 'chart.js';
import { DormitoryService } from '../../services/dormitory';
import { UserService } from '../../services/user';
import { OwnerRequestService } from '../../services/owner-request';
import { firstValueFrom } from 'rxjs';
import { HeaderComponent } from '../../components/header/header.component';
import { WelcomeModalComponent } from '../../components/welcome-modal/welcome-modal.component';
import { GoogleMapsModule, MapInfoWindow, MapMarker } from '@angular/google-maps';

Chart.register(...registerables);

interface ZoneBreakdown {
  zoneId: number;
  zoneName: string;
  dormCount: number;
}
interface DormStatusBreakdown {
  statusName: string;
  count: number;
}
interface DormTypeBreakdown {
  typeName: string;
  count: number;
}
interface UserStatusBreakdown {
  activeUsers: number;
  deactiveUsers: number;
  bannedUsers: number;
}
interface ViewsPerMonthBreakdown {
  year: number;
  month: number;
  count: number;
}
interface TopPopularDorm {
  dormId: number;
  dormName: string;
  views: number;
}
interface DashboardStats {
  dormCount: number;
  memberCount: number;
  ownerCount: number;
  zoneCount: number;
  totalWebsiteViews: number;
  popularDormName: string;
  popularDormViews: number;
  topPopularDorms: TopPopularDorm[];
  allDormViews: any[];
  totalDormViews: number;
  zoneBreakdown: ZoneBreakdown[];
  dormStatusBreakdown: DormStatusBreakdown[];
  dormTypeBreakdown: DormTypeBreakdown[];
  userStatusBreakdown: UserStatusBreakdown;
  viewsPerMonthBreakdown: ViewsPerMonthBreakdown[];
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, BaseChartDirective, HeaderComponent, WelcomeModalComponent, GoogleMapsModule, MapInfoWindow, MapMarker]
})
export class DashboardPage implements OnInit {

  @ViewChild('dormStatusCanvas') dormStatusCanvas!: ElementRef;
  @ViewChild('dormTypeCanvas') dormTypeCanvas!: ElementRef;
  @ViewChild('viewCanvas') viewCanvas!: ElementRef;
  @ViewChild('dormViewStatsCanvas') dormViewStatsCanvas!: ElementRef;
  @ViewChild('userRoleCanvas') userRoleCanvas!: ElementRef;
  @ViewChild(MapInfoWindow) infoWindow!: MapInfoWindow;

  currentUser: any = null;
  isLoading = true;
  error = false;
  
  selectedDormForMap: any = null;

  stats: DashboardStats | null = null;
  pendingRequests: number = 0;
  pendingDormReqs: number = 0;
  pendingOwnerReqs: number = 0;
  isRequestModalOpen = false;

  showWelcomeModal = false;
  today: Date = new Date();

  // Modals state
  isDormModalOpen = false;
  isUserModalOpen = false;
  isZoneModalOpen = false;
  isViewModalOpen = false;
  
  isDormViewStatsModalOpen = false;
  selectedDormForViews: any = null;
  dormViewsBreakdown: any[] = [];
  isDormViewStatsLoading = false;
  hasDormViewStatsData = false;
  selectedDormYearForTable: number | null = null;

  selectedYearForTable: number | null = null;
  allYears: number[] = [];
  private charts: Chart[] = [];
  
  // Sort state for dorm views
  dormViewsSortOrder: 'desc' | 'asc' = 'desc';

  // Zone map
  zoneMapCenter: google.maps.LatLngLiteral = { lat: 16.245, lng: 103.250 };
  zoneMapZoom = 12;
  zoneMarkers: any[] = [];
  dormMarkers: any[] = []; // To hold dorm markers
  zonesWithCoords: any[] = [];
  isZoneMapLoading = false;
  mapOptions: google.maps.MapOptions = {
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    zoomControl: true,
  };

  constructor(
    public router: Router,
    private dormService: DormitoryService,
    private userService: UserService,
    private ownerReqService: OwnerRequestService,
    private actionSheetCtrl: ActionSheetController
  ) {
    addIcons({
      menuOutline, homeOutline, listOutline, starOutline, logOutOutline, person,
      business, people, documentText, map, time, businessOutline, mapOutline,
      peopleOutline, personCircleOutline, documentTextOutline, statsChart, alertCircle,
      shieldCheckmark, closeCircle, close, locationOutline, globeOutline, checkmarkCircleOutline, powerOutline, banOutline, alertCircleOutline, arrowForwardOutline
    });
  }

  ngOnInit() { this.checkAdminAccess(); }
  ionViewWillEnter() { this.checkAdminAccess(); }

  async checkAdminAccess() {
    const storedData = localStorage.getItem('loggedIn');
    if (!storedData) { this.router.navigate(['/login']); return; }

    try {
      const userObj = JSON.parse(storedData);
      this.currentUser = userObj.user ? userObj.user : userObj;

      if (this.currentUser.role_id !== 3 && this.currentUser.ROLE_TYPE_ID !== 3) {
        await this.showAlert('ไม่มีสิทธิ์เข้าถึง', 'หน้านี้สำหรับผู้ดูแลระบบเท่านั้น');
        this.router.navigate(['/home']);
        return;
      }

      if (userObj.showWelcome) {
        userObj.showWelcome = false;
        localStorage.setItem('loggedIn', JSON.stringify(userObj));
        setTimeout(() => { this.showWelcomeModal = true; }, 800);
      }

      this.fetchStats();
    } catch (e) { this.router.navigate(['/login']); }
  }

  onWelcomeClosed() { this.showWelcomeModal = false; }

  handleRefresh(event: any) {
    this.fetchStats();
    setTimeout(() => { event.target.complete(); }, 500);
  }

  async fetchStats() {
    this.isLoading = true;
    this.error = false;
    try {
      const statsRes = await this.dormService.getDashboardStats();
      if (statsRes?.success && statsRes?.data) {
        this.stats = statsRes.data;
        // Pre-compute all years for the view chart
        const yearSet = new Set<number>();
        (this.stats?.viewsPerMonthBreakdown || []).forEach(v => yearSet.add(v.year));
        this.allYears = Array.from(yearSet).sort();
      } else {
        this.error = true;
      }

      const [reqRes, ownerReqRes] = await Promise.all([
        this.dormService.getPendingRequests(),
        firstValueFrom(this.ownerReqService.getAllRequests()).catch(() => [])
      ]);
      
      this.pendingDormReqs = reqRes?.success && reqRes.data ? reqRes.data.length : 0;
      this.pendingOwnerReqs = ownerReqRes && Array.isArray(ownerReqRes) ? ownerReqRes.length : 0;
      this.pendingRequests = this.pendingDormReqs + this.pendingOwnerReqs;

      // Pre-fetch map data in background so it's instant when opened and always up-to-date
      this.fetchMapData();

    } catch (err) {
      console.error('Error fetching dashboard stats', err);
      this.error = true;
    } finally {
      this.isLoading = false;
    }
  }

  // --- Modal Controls ---
  openDormModal() { 
    this.isDormModalOpen = true;
    setTimeout(() => this.renderDormCharts(), 100);
  }
  closeDormModal() { this.isDormModalOpen = false; this.destroyCharts(); }

  openUserModal() { 
    this.isUserModalOpen = true; 
    setTimeout(() => this.renderUserCharts(), 100);
  }
  closeUserModal() { 
    this.isUserModalOpen = false; 
    this.destroyCharts();
  }
  goToManageUsers() {
    this.closeUserModal();
    this.router.navigate(['/manage-users']);
  }
  
  goToManageUsersWithRole(role: string) {
    this.closeUserModal();
    this.router.navigate(['/manage-users'], { queryParams: { roleFilter: role } });
  }

  async fetchMapData() {
    try {
      const res = await this.dormService.getZones();
      if (res?.success && res?.data?.length) {
        const zones = res.data;
        this.zonesWithCoords = zones;
        const withCoords = zones.filter((z: any) => z.lat && z.lng);
        this.zoneMarkers = withCoords.map((z: any) => ({
          position: { lat: parseFloat(z.lat), lng: parseFloat(z.lng) },
          zoneName: z.ZONE_NAME || z.name,
          dormCount: this.stats?.zoneBreakdown?.find(b => b.zoneId === (z.ZONE_ID || z.id))?.dormCount || 0
        }));
        if (this.zoneMarkers.length > 0 && !this.zoneMapCenter) {
          this.zoneMapCenter = { ...(this.zoneMarkers[0]!.position) };
          this.zoneMapZoom = 13;
        }
      }
      
      const dormRes = await this.dormService.getAllDormsAdmin();
      if (dormRes?.success && dormRes?.data?.length) {
        this.dormMarkers = dormRes.data
          .filter((d: any) => (d.lat || d.LAT) && (d.lng || d.LNG))
          .map((d: any) => ({
            position: { lat: parseFloat(d.lat || d.LAT), lng: parseFloat(d.lng || d.LNG) },
            dormName: d.DORM_NAME || d.name,
            zoneName: d.ZONE_NAME,
            image: d.image || d.COVERIMAGE
          }));
      }
    } catch (e) {
      console.error('Failed to load zones/dorms for map in background', e);
    }
  }

  async openZoneModal() {
    this.isZoneModalOpen = true;
    
    // If not loaded yet, wait for animation and fetch
    if (this.zoneMarkers.length === 0 || this.dormMarkers.length === 0) {
      this.isZoneMapLoading = true;
      await new Promise(resolve => setTimeout(resolve, 300));
      await this.fetchMapData();
      this.isZoneMapLoading = false;
    } else {
      // Already pre-fetched in background, just wait for animation
      this.isZoneMapLoading = true; // Briefly show loading to hide map during transition
      await new Promise(resolve => setTimeout(resolve, 300));
      this.isZoneMapLoading = false;
    }
  }
  closeZoneModal() { this.isZoneModalOpen = false; }

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

  getDormsInZone(zoneName: string) {
    if (!this.dormMarkers) return [];
    return this.dormMarkers.filter(d => d.zoneName === zoneName);
  }

  openDormInfoWindow(marker: MapMarker, dorm: any) {
    this.selectedDormForMap = dorm;
    this.infoWindow.open(marker);
  }

  goToManageDormWithSearch(dormName: string) {
    this.closeZoneModal();
    this.router.navigate(['/manage-dorm'], { queryParams: { search: dormName } });
  }

  openViewModal() {
    this.isViewModalOpen = true;
    this.selectedYearForTable = null;
    setTimeout(() => this.renderViewChart(), 100);
  }
  closeViewModal() { this.isViewModalOpen = false; this.destroyCharts(); }

  async openDormViewStatsModal(dorm: any) {
    this.selectedDormForViews = dorm;
    this.isDormViewStatsModalOpen = true;
    this.isDormViewStatsLoading = true;
    this.hasDormViewStatsData = false;
    this.selectedDormYearForTable = null;
    try {
      const res = await this.dormService.getDormViewsStats(dorm.dormId || dorm.DORM_ID);
      if (res?.success && res.data && res.data.length > 0) {
        this.dormViewsBreakdown = res.data;
        this.hasDormViewStatsData = true;
        setTimeout(() => this.renderDormViewStatsChart(), 100);
      } else {
        this.dormViewsBreakdown = [];
      }
    } catch (e) {
      console.error(e);
      this.dormViewsBreakdown = [];
    } finally {
      this.isDormViewStatsLoading = false;
    }
  }

  closeDormViewStatsModal() {
    this.isDormViewStatsModalOpen = false;
    this.selectedDormForViews = null;
  }

  goToFilteredZones(zoneName: string) {
    this.closeZoneModal();
    this.router.navigate(['/manage-dorm'], { queryParams: { zoneFilter: zoneName } });
  }

  viewZoneOnMap(zoneName: string) {
    const marker = this.zoneMarkers.find(m => m.zoneName === zoneName);
    if (marker && marker.position) {
      this.zoneMapCenter = { lat: marker.position.lat, lng: marker.position.lng };
      this.zoneMapZoom = 15; // Zoom in closer
    }
  }

  // Navigate from dorm status chart click
  goToManageDormWithStatus(statusName: string) {
    this.closeDormModal();
    this.router.navigate(['/manage-dorm'], { queryParams: { statusFilter: statusName } });
  }

  // Navigate from dorm type chart click
  goToManageDormWithType(typeName: string) {
    this.closeDormModal();
    this.router.navigate(['/manage-dorm'], { queryParams: { typeFilter: typeName } });
  }

  private destroyCharts() {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
  }

  // --- Chart Rendering Methods ---
  renderDormCharts() {
    if (!this.stats || !this.dormStatusCanvas || !this.dormTypeCanvas) return;

    // Inline plugin to draw numbers inside the pie slices
    const drawDataLabels = {
      id: 'drawDataLabels',
      afterDraw(chart: any) {
        const ctx = chart.ctx;
        chart.data.datasets.forEach((dataset: any, i: number) => {
          const meta = chart.getDatasetMeta(i);
          if (!meta.hidden) {
            meta.data.forEach((element: any, index: number) => {
              const val = dataset.data[index];
              if (val > 0) {
                ctx.fillStyle = '#fff';
                const fontSize = 16;
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const position = element.tooltipPosition();
                ctx.fillText(val.toString(), position.x, position.y);
              }
            });
          }
        });
      }
    };

    const getColorForStatus = (statusName: string) => {
      switch (statusName) {
        case 'เปิดให้บริการ': return '#10b981'; // Green
        case 'ห้องเต็ม': return '#ef4444'; // Red
        case 'ปิดปรับปรุง': return '#f59e0b'; // Yellow
        default: return '#3b82f6';
      }
    };
    const statusColors = this.stats.dormStatusBreakdown.map(d => getColorForStatus(d.statusName));
    
    const statusCtx = this.dormStatusCanvas.nativeElement;
    const statusChart = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: this.stats.dormStatusBreakdown.map(d => d.statusName),
        datasets: [{
          data: this.stats.dormStatusBreakdown.map(d => d.count),
          backgroundColor: statusColors,
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 12,
        }]
      },
      options: {
        responsive: true,
        cutout: '60%',
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw} แห่ง` } }
        },
        onClick: (event, elements) => {
          if (elements && elements.length > 0 && elements[0]) {
            const idx = elements[0].index;
            const statusName = this.stats!.dormStatusBreakdown[idx]?.statusName;
            if (statusName) this.goToManageDormWithStatus(statusName);
          }
        }
      },
      plugins: [drawDataLabels]
    });

    const typeColors = ['#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];
    const typeCtx = this.dormTypeCanvas.nativeElement;
    const typeChart = new Chart(typeCtx, {
      type: 'doughnut',
      data: {
        labels: this.stats.dormTypeBreakdown.map(d => d.typeName),
        datasets: [{
          data: this.stats.dormTypeBreakdown.map(d => d.count),
          backgroundColor: typeColors,
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 12,
        }]
      },
      options: {
        responsive: true,
        cutout: '60%',
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw} แห่ง` } }
        },
        onClick: (event, elements) => {
          if (elements && elements.length > 0 && elements[0]) {
            const idx = elements[0].index;
            const typeName = this.stats!.dormTypeBreakdown[idx]?.typeName;
            if (typeName) this.goToManageDormWithType(typeName);
          }
        }
      },
      plugins: [drawDataLabels]
    });
    this.charts.push(statusChart, typeChart);
  }

  renderUserCharts() {
    if (!this.stats || !this.userRoleCanvas) return;

    const drawDataLabels = {
      id: 'drawDataLabels',
      afterDraw(chart: any) {
        const ctx = chart.ctx;
        chart.data.datasets.forEach((dataset: any, i: number) => {
          const meta = chart.getDatasetMeta(i);
          if (!meta.hidden) {
            meta.data.forEach((element: any, index: number) => {
              const val = dataset.data[index];
              if (val > 0) {
                ctx.fillStyle = '#fff';
                const fontSize = 16;
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const position = element.tooltipPosition();
                ctx.fillText(val.toString(), position.x, position.y);
              }
            });
          }
        });
      }
    };

    const roleColors = ['#3b82f6', '#8b5cf6'];
    const roleCtx = this.userRoleCanvas.nativeElement;
    const roleChart = new Chart(roleCtx, {
      type: 'doughnut',
      data: {
        labels: ['สมาชิก (Member)', 'เจ้าของหอ (Owner)'],
        datasets: [{
          data: [this.stats.memberCount, this.stats.ownerCount],
          backgroundColor: roleColors,
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 12,
        }]
      },
      options: {
        responsive: true,
        cutout: '60%',
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw} บัญชี` } }
        },
        onClick: (event, elements) => {
          if (elements && elements.length > 0 && elements[0]) {
            const idx = elements[0].index;
            const role = idx === 0 ? 'member' : 'owner';
            this.goToManageUsersWithRole(role);
          }
        }
      },
      plugins: [drawDataLabels]
    });

    this.charts.push(roleChart);
  }

  renderViewChart() {
    if (!this.stats || !this.viewCanvas) return;

    const yearMap = new Map<number, number>();
    this.stats.viewsPerMonthBreakdown.forEach(v => {
      const current = yearMap.get(v.year) || 0;
      yearMap.set(v.year, current + v.count);
    });

    const labels = Array.from(yearMap.keys()).sort();
    const data = labels.map(year => yearMap.get(year));
    const barColors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    const ctx = this.viewCanvas.nativeElement;
    const viewChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.map(y => `ปี ${y}`),
        datasets: [{
          label: 'ยอดเข้าชม',
          data: data as number[],
          backgroundColor: barColors.slice(0, labels.length),
          borderRadius: 10,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ` ${(ctx.raw as number).toLocaleString()} ครั้ง` } }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 12 } } },
          x: { grid: { display: false }, ticks: { font: { size: 13, weight: 'bold' } } }
        },
        onClick: (event, elements) => {
          if (elements && elements.length > 0 && elements[0]) {
            const index = elements[0].index;
            const clickedYear = labels[index];
            if (clickedYear) {
              this.selectedYearForTable = clickedYear;
            }
          }
        }
      }
    });
    this.charts.push(viewChart);
  }

  renderDormViewStatsChart() {
    if (!this.dormViewStatsCanvas || !this.hasDormViewStatsData) return;
    
    const yearMap = new Map<number, number>();
    this.dormViewsBreakdown.forEach(v => {
      const current = yearMap.get(v.year) || 0;
      yearMap.set(v.year, current + v.count);
    });

    const labels = Array.from(yearMap.keys()).sort();
    const data = labels.map(year => yearMap.get(year));
    const barColors = ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

    const ctx = this.dormViewStatsCanvas.nativeElement;
    const viewChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.map(y => `ปี ${y}`),
        datasets: [{
          label: 'ยอดเข้าชม',
          data: data as number[],
          backgroundColor: barColors.slice(0, labels.length),
          borderRadius: 10,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ` ${(ctx.raw as number).toLocaleString()} ครั้ง` } }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 12 } } },
          x: { grid: { display: false }, ticks: { font: { size: 13, weight: 'bold' } } }
        },
        onClick: (event, elements) => {
          if (elements && elements.length > 0 && elements[0]) {
            const index = elements[0].index;
            const clickedYear = labels[index];
            if (clickedYear) {
              this.selectedDormYearForTable = clickedYear;
            }
          }
        }
      }
    });
    this.charts.push(viewChart);
  }

  // --- Table Data Helpers ---
  getMonthlyTableData() {
    if (!this.stats || !this.selectedYearForTable) return [];
    return this.stats.viewsPerMonthBreakdown.filter(v => v.year === this.selectedYearForTable);
  }

  getTotalViewsForYear(year: number): number {
    if (!this.stats) return 0;
    return this.stats.viewsPerMonthBreakdown
      .filter(v => v.year === year)
      .reduce((sum, v) => sum + v.count, 0);
  }

  getMonthName(monthNumber: number): string {
    const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    return months[monthNumber - 1] || '';
  }

  getDormMonthlyTableData() {
    if (!this.selectedDormYearForTable) return [];
    return this.dormViewsBreakdown.filter(v => v.year === this.selectedDormYearForTable);
  }

  getDormTotalViewsForYear(year: number): number {
    return this.dormViewsBreakdown
      .filter(v => v.year === year)
      .reduce((sum, v) => sum + v.count, 0);
  }

  onSearch(event: any) {
    const keyword = (typeof event === 'string' ? event : event?.target?.value || '').trim();
    if (keyword) this.router.navigate(['/list']);
  }

  openRequestModal() { this.isRequestModalOpen = true; }
  closeRequestModal() { this.isRequestModalOpen = false; }

  goToManageRequestsCreateDorm() {
    this.closeRequestModal();
    this.router.navigate(['/manage-requests-createdorm']);
  }

  goToManageRequestsOwner() {
    this.closeRequestModal();
    this.router.navigate(['/manage-requests-dorm-owner']);
  }

  openMenu() { window.dispatchEvent(new CustomEvent('toggle-sidebar')); }

  async showAlert(header: string, message: string) {
    alert(`${header}\n${message}`);
  }

  // --- Toggle Dorm Views Sorting ---
  toggleDormViewsSort() {
    this.dormViewsSortOrder = this.dormViewsSortOrder === 'desc' ? 'asc' : 'desc';
    if (this.stats && this.stats.allDormViews) {
      this.stats.allDormViews.sort((a: any, b: any) => {
        const viewsA = Number(a.views) || 0;
        const viewsB = Number(b.views) || 0;
        return this.dormViewsSortOrder === 'desc' ? viewsB - viewsA : viewsA - viewsB;
      });
    }
  }
}