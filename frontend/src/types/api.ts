export interface ApiResponse<T> { success: boolean; message?: string; data: T; errors?: Record<string, string[]>; timestamp: string }
export interface PageResponse<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number; hasNext: boolean }
export interface LoginRequest { username: string; password: string }
export interface RegisterRequest { username: string; password: string; email?: string; nickname?: string }
export interface AuthResponse { accessToken: string; refreshToken: string; expiresIn: number; userId: number; username: string; nickname: string; avatar?: string }
export interface UserResponse { id: number; username: string; email?: string; nickname?: string; avatar?: string; createdAt: string; token?: string }
export interface SpotResponse { id: number; name: string; category: string; description?: string; address?: string; latitude: number; longitude: number; popularity: number; avgRating: number; ratingCount?: number; imageUrl?: string; openingHours?: string; ticketPrice?: number; createdAt?: string }
export interface RecommendedSpotResponse extends SpotResponse { reason?: string }
export interface ShopResponse { id: number; name: string; address?: string; description?: string; latitude: number; longitude: number; gcjLatitude?: number; gcjLongitude?: number; cuisine?: string; spotId?: number; avgRating: number; ratingCount?: number; popularity: number; congestionLevel?: string; imageUrl?: string; createdAt?: string }
export interface FoodResponse { id: number; name: string; cuisine?: string; restaurantName?: string; spotId?: number; description?: string; priceRange?: string; latitude?: number; longitude?: number; popularity: number; avgRating: number; ratingCount?: number; imageUrl?: string; createdAt?: string; congestionLevel?: string }
export interface DiaryResponse { id: string; userId: number; title: string; content: string; contentHtml?: string; destination?: string; spotId?: number; images?: string[]; videoMeta?: { url: string; duration?: number; thumbnail?: string }; musicUrl?: string; popularity: number; avgRating: number; ratingCount?: number; isPublic?: boolean; createdAt: string; updatedAt?: string }
export interface RecommendResult { spots: RecommendedSpotResponse[]; foods: any[]; diaries: any[] }
export interface RouteRequest { startLat: number; startLng: number; targets: { lat: number; lng: number; name?: string }[]; strategy?: string; transports?: string[]; finalDestinationIdx?: number }
export interface RouteResponse { path: { nodeId: string; latitude: number; longitude: number; name?: string; isTarget: boolean }[]; totalDistance: number; totalTime: number; visitOrder: string[]; segments?: RouteSegment[] }
export interface RouteSegment { fromNodeId: string; toNodeId: string; distance: number; time: number; roadName?: string; roadType?: string; transport?: string }

/* ── AI Chat ── */
export interface ChatMessage { role: string; content: string; timestamp?: string }
export interface ChatSession { id: string; userId?: number; title: string; messages: ChatMessage[]; createdAt?: string; updatedAt?: string }
export interface ChatResult { reply: string; turnCount: number; sessionId: string; title: string }

/* ── Timeline Trip Editor ── */
export interface TimeSlot {
  id: string
  startTime: string     // "HH:mm"
  endTime: string       // "HH:mm"
  spotId?: number
  spotName?: string
  foodId?: number
  foodName?: string
  text?: string         // free-text notes
  name?: string         // display name (derived from spot/food/text)
  type: 'spot' | 'food' | 'text'
  lat?: number           // NEW: coordinate for map rendering
  lng?: number           // NEW: coordinate for map rendering
  routeOrder?: number    // NEW: order in the walking route
  budget?: number        // 预算（元）
  actualCost?: number    // 实际花费（元）
}

export interface TimelineDay {
  dayIndex: number
  date: string          // "YYYY-MM-DD"
  slots: TimeSlot[]
  routeDistance?: number  // NEW: total walking distance (meters) for this day
  routeTime?: number      // NEW: total walking time (minutes) for this day
}

export interface TimelinePlan {
  version: number       // 3 for timeline format
  title: string
  startDate: string
  endDate: string
  days: TimelineDay[]
  aiSessionId?: string
  budgetResult?: any | null  // NEW: AI budget result
}

/* ── AI Plan & Budget ── */
export interface PlanRequest {
  days: number
  interests: string
  budget: string
  transport: string
  additionalInfo: string
}

export interface PlanActivityItem {
  time: string
  activity: string
  location: string
  duration: string
  notes: string
  matchedSpotId?: number
  matchedFoodId?: number
  matchedLat?: number
  matchedLng?: number
  matchedName?: string
  matchedType?: 'spot' | 'food' | 'amap_geocode' | 'amap_poi' | 'none'
  routePrevDistance?: number
  routePrevTime?: number
}

export interface PlanDaySchedule {
  day: number
  date: string
  theme: string
  schedule: PlanActivityItem[]
  routeTotalDistance?: number
  routeTotalTime?: number
}

export interface PlanResult {
  title: string
  days: PlanDaySchedule[]
  tips: string[]
  estimatedCost: string
  rawResponse?: string
}

export interface BudgetRequest {
  days: number
  peopleCount: number
  spots: string
  transport: string
  diningPref: string
  accommodation: string
}

export interface BudgetCategory {
  name: string
  amount: number
  details: string
}

export interface BudgetResult {
  totalBudget: string
  currency: string
  categories: BudgetCategory[]
  suggestions: string[]
  rawResponse?: string
}
