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

export const useSalesStats = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: ['sales-stats', params],
    queryFn: () => SalesApi.getSalesStats(params),
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
  return useMutation({
    mutationFn: (payload: CreatePendingSalePayload) => SalesApi.createPendingCollectSale(payload),
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
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
};
