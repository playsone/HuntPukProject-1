import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { lastValueFrom, firstValueFrom, Observable } from 'rxjs'; // 🌟 เพิ่ม firstValueFrom
import { Constants } from '../config/config';
import { DormFacGetRes } from '../model/res/dorm_fac_get_res';

// ============================================
// 1. Interfaces
// ============================================
export interface Dormitory {
  [x: string]: any; 
  DORM_ID: number;
  DORM_NAME: string;
  ADDRESS: string;
  lat: number;
  lng: number;
  start_price?: number;

  image?: string;
  zone?: string;
  SCORE?: number;

  phone?: string;
  line?: string;
  facilities?: string[];
  gallery?: string[];
  description?: string;

  rooms?: {
    ROOM_TYPE_NAME: string;
    PRICE: number;
  }[];

  isChecked?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// ============================================
// 2. Service Class
// ============================================
@Injectable({
  providedIn: 'root',
})
export class DormitoryService {
  private appConfig = new Constants();
  private apiUrl = this.appConfig.API_ENDPOINT;

  constructor(private http: HttpClient) {}

  /**
   * 1. ดึงหอพักทั้งหมด
   */
  public async getAllDorms(): Promise<ApiResponse<Dormitory[]>> {
    const url = `${this.apiUrl}/dorms`;
    try {
      const res = await lastValueFrom(
        this.http.get<ApiResponse<Dormitory[]>>(url)
      );
      return res;
    } catch (error: any) {
      // 🌟 เอา JSON.stringify ออก เพื่อไม่ให้โค้ดแครชเวลาเจอ CORS/Mixed Content
      throw error;
    }
  }

  /**
   * ✅ ดึงหอพักทั้งหมดสำหรับ Admin (รวมที่ปิดปรับปรุง + ชื่อเจ้าของ)
   */
  public async getAllDormsAdmin(): Promise<ApiResponse<any[]>> {
    const url = `${this.apiUrl}/dorms/admin`; 
    try {
      const res = await lastValueFrom(this.http.get<ApiResponse<any[]>>(url));
      return res;
    } catch (error: any) {
      throw error; // 🌟
    }
  }

  /**
   * 2. ดึงรายละเอียดหอพักตาม ID (🌟 อัปเกรดให้กันค้าง 100%)
   */
  public async getDormById(id: number): Promise<ApiResponse<any>> {
    const url = `${this.apiUrl}/dorms/${id}?_t=${Date.now()}`;
    try {
      const res = await firstValueFrom(this.http.get<ApiResponse<any>>(url));
      return res;
    } catch (error: any) {
      console.error("🔥 Error in Service getDormById:", error);
      throw error;
    }
  }

  /**
   * 3. ค้นหาและกรองหอพัก (รองรับ Keyword, Zone, Price)
   */
  public async searchDorms(
    keyword: string,
    zone?: string,
    min?: number,
    max?: number
  ): Promise<ApiResponse<Dormitory[]>> {
    const url = `${this.apiUrl}/dorms`;
    let params = new HttpParams();

    if (keyword) params = params.set('search', keyword);
    if (zone) params = params.set('zone', zone);
    if (min !== undefined && min !== null) params = params.set('minPrice', min.toString());
    if (max !== undefined && max !== null) params = params.set('maxPrice', max.toString());

    try {
      const res = await lastValueFrom(
        this.http.get<ApiResponse<Dormitory[]>>(url, { params })
      );
      return res;
    } catch (error: any) {
      throw error; // 🌟
    }
  }

  /**
   * 4. หาหอพักใกล้ฉัน
   */
  public async getNearbyDorms(
    lat: number,
    lng: number,
    radius: number = 5
  ): Promise<ApiResponse<Dormitory[]>> {
    const url = `${this.apiUrl}/dorms/nearby`;
    let params = new HttpParams()
      .set('lat', lat.toString())
      .set('lng', lng.toString())
      .set('radius', radius.toString());

    try {
      const res = await lastValueFrom(
        this.http.get<ApiResponse<Dormitory[]>>(url, { params })
      );
      return res;
    } catch (error: any) {
      console.warn('API /dorms/nearby might not be implemented yet.');
      throw error; // 🌟
    }
  }

  /**
   * 5. ดึงรายชื่อโซนทั้งหมด (สำหรับ Dropdown ตัวกรอง)
   */
  public async getZones(): Promise<ApiResponse<any[]>> {
    const url = `${this.apiUrl}/dorms/zones`;
    try {
      const res = await lastValueFrom(this.http.get<ApiResponse<any[]>>(url));
      return res;
    } catch (error: any) {
      throw error; // 🌟
    }
  }

  public async getDormViewsStats(dormId: number): Promise<ApiResponse<any>> {
    const url = `${this.apiUrl}/dashboard/dorm-views/${dormId}`;
    const response = await this.http.get<ApiResponse<any>>(url).toPromise();
    return response || { success: false, message: 'No data', data: null } as any;
  }

  /**
   * บันทึกยอดเข้าชมเว็บไซต์
   */
  public async recordWebsiteView(): Promise<void> {
    const url = `${this.apiUrl}/views/website`;
    try {
      await lastValueFrom(this.http.post(url, {}));
    } catch (error) {
      console.warn('Failed to record website view', error);
    }
  }

  /**
   * บันทึกยอดเข้าชมหอพัก
   */
  public async recordDormView(dormId: number): Promise<void> {
    const url = `${this.apiUrl}/views/dorm/${dormId}`;
    try {
      await lastValueFrom(this.http.post(url, {}));
    } catch (error) {
      console.warn('Failed to record dorm view', error);
    }
  }

  /**
   * เพิ่มรายการโปรด
   */
  public async addFavorite(userId: number, dormId: number) {
    const url = `${this.apiUrl}/other/addFavorite`; 
    const body = { user_id: userId, dorm_id: dormId };

    try {
      const res = await lastValueFrom(this.http.post<any>(url, body));
      return res;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * ลบรายการโปรด
   */
  public async removeFavorite(userId: number, dormId: number) {
    const url = `${this.apiUrl}/other/delFavorite`; 
    try {
      const options = {
        body: { user_id: userId, dorm_id: dormId },
      };
      const res = await lastValueFrom(this.http.delete<any>(url, options));
      return res;
    } catch (error: any) {
      throw error;
    }
  }

  public async getMyFavorites(userId: number): Promise<any[]> {
    const url = `${this.apiUrl}/spec/favorite/${userId}`;
    try {
      const res = await lastValueFrom(this.http.get<any>(url));
  
      const rows: any[] = Array.isArray(res) ? res : (res?.data || []);
  
      return rows.map((item: any) => ({
        DORM_ID:     item.DORMID    || item.DORM_ID,
        DORM_NAME:   item.DORMNAME  || item.DORM_NAME,
        ADDRESS:     item.ADDRESS,
        image:       item.COVERIMAGE || item.image,
        SCORE:       item.SCORE,
        lat:         0,
        lng:         0,
        start_price: Number(item.START_PRICE || item.start_price || 0),
        zone:        item.ZONE_NAME || '',
      }));
    } catch (error: any) {
      if (error?.status === 404 || error?.status === 400) return [];
      throw error; // 🌟
    }
  }

  /**
   * 6. ดึงรายการคำร้องขอหอพักที่รออนุมัติ (Pending Requests)
   */
  public async getPendingRequests(): Promise<ApiResponse<any[]>> {
    const url = `${this.apiUrl}/dorms/pendingReq`;
    try {
      const res = await lastValueFrom(this.http.get<ApiResponse<any[]>>(url));
      return res;
    } catch (error: any) {
      throw error; // 🌟
    }
  }

  /**
   * 7. อนุมัติหรือปฏิเสธคำร้องขอหอพัก
   */
  public async approveRequest(
    dormId: number,
    isApproved: boolean,
    message: string = ''
  ): Promise<any> {
    const url = `${this.apiUrl}/dorms/approve`;
    const body = {
      dorm_id: dormId,
      approve_status: isApproved, 
      msg: message,
    };

    try {
      const res = await lastValueFrom(this.http.post<any>(url, body));
      return res;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * 7b. ส่งกลับให้แก้ไข (REQ_STATUS = 4)
   */
  public async sendBackForRevision(
    dormId: number,
    message: string = ''
  ): Promise<any> {
    const url = `${this.apiUrl}/dorms/approve`;
    const body = {
      dorm_id: dormId,
      approve_status: 4,
      msg: message,
    };

    try {
      const res = await lastValueFrom(this.http.post<any>(url, body));
      return res;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * 7c. ลบ pending request ออกจากระบบ (admin เท่านั้น)
   */
  public async deletePendingRequest(dormId: number): Promise<any> {
    const url = `${this.apiUrl}/spec/dorm/${dormId}`;
    try {
      const res = await lastValueFrom(this.http.delete<any>(url));
      return res;
    } catch (error: any) {
      throw error;
    }
  }



  /**
   * 8. ลบหอพัก (ปิดปรับปรุง / Soft Delete)
   */
  public async removeDorm(dormId: number) {
    const url = `${this.apiUrl}/spec/dorm/${dormId}`;
    try {
      const res = await lastValueFrom(this.http.delete<any>(url));
      return res;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * 9. กู้คืนหอพัก (Restore)
   */
  public async restoreDorm(dormId: number) {
    const url = `${this.apiUrl}/spec/restoreDorm/${dormId}`;
    try {
      const res = await lastValueFrom(this.http.put<any>(url, {}));
      return res;
    } catch (error: any) {
      throw error;
    }
  }

  createDorm(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/dorms`, formData);
  }

  /**
   * 10. ดึงรีวิวของหอพัก (ตาม ID หอพัก)
   */
  public async getReviewsByDormId(dormId: number): Promise<ApiResponse<any[]>> {
    const url = `${this.apiUrl}/dorms/review/${dormId}`;
    try {
      const res = await lastValueFrom(this.http.get<ApiResponse<any[]>>(url));
      return res;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * 11. ลบรีวิว
   */
  public async deleteReview(reviewId: number): Promise<any> {
    const url = `${this.apiUrl}/spec/review/${reviewId}`;
    try {
      const res = await lastValueFrom(this.http.delete<any>(url));
      return res;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * 12. เพิ่มรีวิวใหม่
   */
  public async addReview(
    userId: number,
    dormId: number,
    score: number,
    comment: string
  ): Promise<any> {
    const url = `${this.apiUrl}/user/review`;
    const body = {
      user_id: userId,
      dorm_id: dormId,
      score: score,
      comment: comment,
    };

    try {
      const res = await lastValueFrom(this.http.post<any>(url, body));
      return res;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * 13. ดึงหอพักยอดนิยม (Top Ranking)
   */
  public async getPopularDorms(limit: number = 6, sortBy: 'score' | 'views' = 'score'): Promise<ApiResponse<any[]>> {
    const url = `${this.apiUrl}/dorms/popular`;
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('sortBy', sortBy);

    try {
      const res = await lastValueFrom(
        this.http.get<ApiResponse<any[]>>(url, { params })
      );
      return res;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * 14. ดึงหอพักของฉัน (สำหรับเจ้าของหอ)
   */
  public async getMyDorms(ownerId: number): Promise<ApiResponse<any[]>> {
    const url = `${this.apiUrl}/spec/dorm/${ownerId}`;
    try {
      const res = await lastValueFrom(this.http.get<ApiResponse<any[]>>(url));
      return res;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * 15. อัปเดตข้อมูลหอพัก
   */
  public async updateDorm(dormId: number, formData: FormData): Promise<any> {
    const url = `${this.apiUrl}/spec/dorm/${dormId}`;
    try {
      const res = await lastValueFrom(this.http.put<any>(url, formData));
      return res;
    } catch (error: any) {
      throw error;
    }
  }

  public addFacility(facData: FormData): Observable<any> {
    const url = `${this.apiUrl}/dorms/facility`;
    return this.http.post(url, facData);
  }

  public getFacilities(): Observable<DormFacGetRes> {
    const url = `${this.apiUrl}/dorms/facilities`;
    return this.http.get<DormFacGetRes>(url);
  }

  public updateFacility(facData: FormData, uid: number): Observable<any>{
    const url = `${this.apiUrl}/dorms/facility/${uid}`;
    return this.http.put(url, facData);
  }

  public getPendingFacilities(): Observable<ApiResponse<any[]>> {
    const url = `${this.apiUrl}/dorms/facilities/pending`;
    return this.http.get<ApiResponse<any[]>>(url);
  }

  public approveFacilityReq(facId: number, isApprove: boolean, reason: string = ''): Observable<ApiResponse<any>> {
    const url = `${this.apiUrl}/dorms/facility/approve/${facId}`;
    return this.http.put<ApiResponse<any>>(url, { isApprove, reason });
  }

  // ==========================================
  // 🌟 ฟังก์ชันจัดการสถานะหอพัก (Owner)
  // ==========================================

  // 1. เปลี่ยนสถานะ (ว่าง = 1, เต็ม = 3)
  public async changeDormStatus(dormId: number, statusId: number): Promise<any> {
    const url = `${this.apiUrl}/dorms/changeStatus/${dormId}`;
    try {
      const res = await lastValueFrom(this.http.put<any>(url, { status_id: statusId }));
      return res;
    } catch (error: any) {
      throw error;
    }
  }

  public async cancelDormRequest(dormId: number): Promise<any> {
    const url = `${this.apiUrl}/dorms/cancel-request/${dormId}`;
    try {
      const response = await lastValueFrom(
        this.http.put(url, {})
      );
      return response;
    } catch (error) {
      console.error('Error cancelling dorm request:', error);
      throw error;
    }
  }

  // ============== API Endpoints สำหรับ Dropdown ต่างๆ ============================
  // Admin Methods for Type Management
  // ==========================================
  getDormTypes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dorms/dormTypes`);
  }
  addDormType(name: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/dorms/dormTypes`, { name });
  }
  deleteDormType(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/dorms/dormTypes/${id}`);
  }

  updateMasterType(type: string, id: number, name: string, lat?: number, lng?: number, radius?: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/type_management/${type}/${id}`, { name, lat, lng, radius });
  }

  getRoomTypes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dorms/roomTypes`);
  }
  addRoomType(name: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/dorms/roomTypes`, { name });
  }
  deleteRoomType(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/dorms/roomTypes/${id}`);
  }

  getBedTypes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dorms/bedTypes`);
  }
  addBedType(name: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/dorms/bedTypes`, { name });
  }
  deleteBedType(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/dorms/bedTypes/${id}`);
  }

  getPriceTypes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dorms/priceTypes`);
  }
  addPriceType(name: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/dorms/priceTypes`, { name });
  }
  deletePriceType(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/dorms/priceTypes/${id}`);
  }

  getDormStatuses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dorms/dormStatuses`);
  }
  addDormStatus(name: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/dorms/dormStatuses`, { name });
  }
  deleteDormStatus(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/dorms/dormStatuses/${id}`);
  }

  addZone(name: string, lat: number, lng: number, radius: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/dorms/zones`, { name, lat, lng, radius });
  }
  deleteZone(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/dorms/zones/${id}`);
  }

  // ==========================================
  // Dashboard Stats (Admin)
  // ==========================================
  async getDashboardStats(): Promise<any> {
    return lastValueFrom(
      this.http.get<any>(`${this.apiUrl}/dashboard/stats`)
    );
  }
}