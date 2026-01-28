export interface Agent {
  _id: string
  agentId: string
  name: string
  phoneNumber: string
  email?: string
  state?: string
  lga?: string
  bustop?: string
  status: 'active' | 'inactive' | 'suspended'
  notes?: string
  referralCode?: string
  bankCode?: string
  bankName?: string
  accountNumber?: string
  accountName?: string
  subaccountCode?: string
  createdAt: string
  updatedAt: string
}

export interface AgentWithStats extends Agent {
  qrKitStats: {
    total: number
    byActivationStatus: {
      pending: number
      activated: number
      deactivated: number
    }
    byPaymentStatus: {
      pending: number
      successful: number
      failed: number
    }
    referralCount: number
  }
}

export interface AgentListResponse {
  data: Agent[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface AgentFilters {
  status?: string
  state?: string
  lga?: string
  search?: string
  page?: number
  limit?: number
}

export interface CreateAgentDto {
  name: string
  phoneNumber: string
  email?: string
  state?: string
  lga?: string
  bustop?: string
  notes?: string
  bankCode?: string
  accountNumber?: string
  bankName?: string
  accountName?: string
}

export interface UpdateAgentDto {
  name?: string
  phoneNumber?: string
  email?: string
  state?: string
  lga?: string
  bustop?: string
  status?: 'active' | 'inactive' | 'suspended'
  notes?: string
  bankCode?: string
  accountNumber?: string
  bankName?: string
  accountName?: string
}

export interface AgentStats {
  total: number
  byStatus: {
    active: number
    inactive: number
    suspended: number
  }
  byState: Record<string, number>
}
