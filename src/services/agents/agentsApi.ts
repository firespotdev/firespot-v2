import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { adminApiClient } from '@/lib/utils/axios'
import type {
  Agent,
  AgentWithStats,
  AgentListResponse,
  AgentFilters,
  CreateAgentDto,
  UpdateAgentDto,
  AgentStats,
} from './interface'
import type { QRKitListResponse } from '@/services/qr'

// API functions
export const agentsApi = {
  getAgents: async (filters?: AgentFilters): Promise<AgentListResponse> => {
    const response = await adminApiClient.get<AgentListResponse>(
      '/admin/agents',
      { params: filters },
    )
    return response.data
  },

  getAgentById: async (id: string): Promise<AgentWithStats> => {
    const response = await adminApiClient.get<AgentWithStats>(
      `/admin/agents/${id}`,
    )
    return response.data
  },

  getStats: async (): Promise<AgentStats> => {
    const response = await adminApiClient.get<AgentStats>('/admin/agents/stats')
    return response.data
  },

  getAgentQRKits: async (
    agentId: string,
    params?: { page?: number; limit?: number },
  ): Promise<QRKitListResponse> => {
    const response = await adminApiClient.get<QRKitListResponse>(
      `/admin/agents/${agentId}/qr-kits`,
      { params },
    )
    return response.data
  },

  createAgent: async (dto: CreateAgentDto): Promise<Agent> => {
    const response = await adminApiClient.post<Agent>('/admin/agents', dto)
    return response.data
  },

  updateAgent: async (id: string, dto: UpdateAgentDto): Promise<Agent> => {
    const response = await adminApiClient.patch<Agent>(
      `/admin/agents/${id}`,
      dto,
    )
    return response.data
  },

  deleteAgent: async (id: string): Promise<void> => {
    await adminApiClient.delete(`/admin/agents/${id}`)
  },
}

// React Query Hooks
export const useAgents = (filters?: AgentFilters) => {
  return useQuery({
    queryKey: ['agents', filters],
    queryFn: () => agentsApi.getAgents(filters),
  })
}

export const useAgent = (id: string | null) => {
  return useQuery({
    queryKey: ['agent', id],
    queryFn: () => {
      if (!id) throw new Error('Agent ID is required')
      return agentsApi.getAgentById(id)
    },
    enabled: !!id,
    placeholderData: keepPreviousData,
  })
}

export const useAgentStats = () => {
  return useQuery({
    queryKey: ['agent-stats'],
    queryFn: () => agentsApi.getStats(),
  })
}

export const useAgentQRKits = (
  agentId: string | null,
  params?: { page?: number; limit?: number },
) => {
  return useQuery({
    queryKey: ['agent-qr-kits', agentId, params],
    queryFn: () => {
      if (!agentId) throw new Error('Agent ID is required')
      return agentsApi.getAgentQRKits(agentId, params)
    },
    enabled: !!agentId,
  })
}

export const useCreateAgent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateAgentDto) => agentsApi.createAgent(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      queryClient.invalidateQueries({ queryKey: ['agent-stats'] })
    },
  })
}

export const useUpdateAgent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateAgentDto }) =>
      agentsApi.updateAgent(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      queryClient.invalidateQueries({ queryKey: ['agent', id] })
      queryClient.invalidateQueries({ queryKey: ['agent-stats'] })
    },
  })
}

export const useDeleteAgent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => agentsApi.deleteAgent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      queryClient.invalidateQueries({ queryKey: ['agent-stats'] })
    },
  })
}
