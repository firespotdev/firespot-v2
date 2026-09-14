import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ReportsApi, CreateReportPayload } from './reportsApi';

export const useSubmitReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReportPayload) => ReportsApi.submitReport(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

export const useReports = () => {
  return useQuery({
    queryKey: ['reports'],
    queryFn: () => ReportsApi.getReports(),
  });
};
