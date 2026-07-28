import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SalesApi, CreatePendingSalePayload, RecordSalePayload, EditSalePayload } from './salesApi';

export const useCreatePendingSale = () => {
  return useMutation({
    mutationFn: (payload: CreatePendingSalePayload) => SalesApi.createPendingSale(payload),
  });
};

export const useCreateManualSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RecordSalePayload) => SalesApi.createManualSale(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-stats'] });
    },
  });
};
export const useSales = (params?: Record<string, string | number | boolean | undefined>) => {
  return useQuery({
    queryKey: ['sales', params],
    queryFn: () => SalesApi.getSales(params),
  });
};

export const useSale = (id?: string) => {
  return useQuery({
    queryKey: ['sale', id],
    queryFn: () => SalesApi.getSale(id!),
    enabled: !!id,
  });
};

export const useCustomerHistory = () => {
  return useQuery({
    queryKey: ['customer-history'],
    queryFn: () => SalesApi.getCustomerHistory(),
  });
};

export const useSalesStats = <TParams extends object = Record<string, never>>(
  params?: TParams,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: ['sales-stats', params],
    queryFn: () =>
      SalesApi.getSalesStats(
        params as Record<string, string | number | boolean | undefined>,
      ),
    enabled: options?.enabled,
  });
};

export const useRecordSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ saleId, payload }: { saleId: string; payload: RecordSalePayload }) =>
      SalesApi.recordSale(saleId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-stats'] });
    },
  });
};

export const useCancelSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (saleId: string) => SalesApi.cancelSale(saleId),
    onSuccess: (data, saleId) => {
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-stats'] });
    },
  });
};

export const useEditSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ saleId, payload }: { saleId: string; payload: EditSalePayload }) =>
      SalesApi.editSale(saleId, payload),
    onSuccess: (data, { saleId }) => {
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-stats'] });
    },
  });
};

export const useCreatePendingCollectSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePendingSalePayload) => SalesApi.createPendingCollectSale(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-stats'] });
    },
  });
};

export const useArchiveSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (saleId: string) => SalesApi.archiveSale(saleId),
    onSuccess: (data, saleId) => {
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-stats'] });
    },
  });
};

export const useUploadReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ saleId, file }: { saleId: string; file: File }) =>
      SalesApi.uploadReceipt(saleId, file),
    onSuccess: (_, { saleId }) => {
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
      queryClient.invalidateQueries({ queryKey: ['public-sale', saleId] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
};

/**
 * Public sale view for the customer pay page. Polls every 5s while the sale
 * is PENDING as a fallback for the confirmation socket.
 */
export const usePublicSale = (saleId?: string, serialNumber?: string) => {
  return useQuery({
    queryKey: ['public-sale', saleId, serialNumber],
    queryFn: () => SalesApi.getPublicSale(saleId!, serialNumber!),
    enabled: !!saleId && !!serialNumber,
    refetchInterval: (query) =>
      query.state.data?.status === 'PENDING' ? 5000 : false,
  });
};

export const useCancelSaleAsCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      saleId,
      serialNumber,
    }: {
      saleId: string;
      serialNumber: string;
    }) => SalesApi.cancelSaleAsCustomer(saleId, serialNumber),
    onSuccess: (_, { saleId }) => {
      queryClient.invalidateQueries({ queryKey: ['public-sale', saleId] });
    },
  });
};

export const useMarkSalePaidByCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      saleId,
      serialNumber,
    }: {
      saleId: string;
      serialNumber: string;
    }) => SalesApi.markSalePaidByCustomer(saleId, serialNumber),
    onSuccess: (_, { saleId }) => {
      queryClient.invalidateQueries({ queryKey: ['public-sale', saleId] });
    },
  });
};

export const useDeleteReceipt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (saleId: string) => SalesApi.deleteReceipt(saleId),
    onSuccess: (_, saleId) => {
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
      queryClient.invalidateQueries({ queryKey: ['public-sale', saleId] });
    },
  });
};

export const useRecordRepayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ saleId, payload }: { saleId: string; payload: { amountPaid: number; paymentMethod?: string; customerId?: string } }) =>
      SalesApi.recordRepayment(saleId, payload),
    onSuccess: (_, { saleId, payload }) => {
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales-stats'] });
      if (payload?.customerId) {
        queryClient.invalidateQueries({ queryKey: ['customer-outstanding-sales', payload.customerId] });
      }
    },
  });
};

export const useCustomerOutstandingSales = (customerId?: string) => {
  return useQuery({
    queryKey: ['customer-outstanding-sales', customerId],
    queryFn: () => SalesApi.getCustomerOutstandingSales(customerId!),
    enabled: !!customerId,
  });
};

export const useOutstandingSummary = (enabled = true) => {
  return useQuery({
    queryKey: ['sales-outstanding-summary'],
    queryFn: () => SalesApi.getOutstandingSummary(),
    enabled,
  });
};

/**
 * Attach the logged-in user as a sale's payer when they commit to paying.
 * No-op-friendly: fails silently for logged-out payers (caller guards on auth).
 */
export const useClaimSalePayer = () => {
  return useMutation({
    mutationFn: ({ saleId }: { saleId: string }) =>
      SalesApi.claimSalePayer(saleId),
  });
};

export const useRecordScan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (saleId: string) => SalesApi.recordScan(saleId),
    onSuccess: (_, saleId) => {
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
};

export const useRecordCopy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (saleId: string) => SalesApi.recordCopy(saleId),
    onSuccess: (_, saleId) => {
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
};
