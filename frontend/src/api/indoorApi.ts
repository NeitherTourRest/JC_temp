import apiClient from './axios'
import type { ApiResponse } from '@/types/api'

export interface IndoorNode {
  id: string
  floor: string
  x: number
  y: number
  name: string
  type: string
}

export interface NavigationStep {
  fromNodeId: string
  toNodeId: string
  fromName: string
  toName: string
  fromFloor: string
  toFloor: string
  distance: number
  crossFloor: boolean
  instruction: string
  fromX: number
  fromY: number
  toX: number
  toY: number
}

export interface NavigationResult {
  success: boolean
  error?: string
  steps: NavigationStep[]
  totalDistance: number
  floorPlans: Record<string, string>
}

export const indoorApi = {
  navigate: (buildingId: string, from: string, to: string) =>
    apiClient.get<ApiResponse<NavigationResult>>('/indoor/navigate', {
      params: { buildingId, from, to }
    }),
  getBuilding: (buildingId: string) =>
    apiClient.get<ApiResponse<{ nodes: IndoorNode[]; edges: { from: string; to: string; dist: number; floor: string }[]; crossFloorEdges: { from: string; to: string; type: string; dist: number }[]; floorPlans: Record<string, string> }>>('/indoor/building', {
      params: { buildingId }
    })
}
