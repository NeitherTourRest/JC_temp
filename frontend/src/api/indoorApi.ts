import apiClient from './axios'
import type { ApiResponse } from '@/types/api'

export interface IndoorNode {
  id: string
  floor: string
  x: number
  y: number
  name: string
  type: string
  wing?: string
  zone?: string
  roomCategory?: string
  anchorNodeId?: string
  doorNodeId?: string
  aliases?: string[]
  accessible?: boolean
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
  nodePath?: string[]
  textInstructions?: string[]
  totalDistance: number
  floorPlans: Record<string, string>
}

export interface IndoorBuildingMetadata {
  nodes: IndoorNode[]
  edges: { from: string; to: string; dist: number; floor: string }[]
  crossFloorEdges: { from: string; to: string; type: string; dist: number }[]
  floorPlans: Record<string, string>
  floors?: string[]
}

export const indoorApi = {
  navigate: (buildingId: string, from: string, to: string) =>
    apiClient.get<ApiResponse<NavigationResult>>('/indoor/navigate', {
      params: { buildingId, from, to }
    }),
  getBuilding: (buildingId: string) =>
    apiClient.get<ApiResponse<IndoorBuildingMetadata>>('/indoor/building', {
      params: { buildingId }
    })
}
