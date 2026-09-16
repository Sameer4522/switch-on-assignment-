import { type UseQueryOptions, useQuery } from "@tanstack/react-query";

export const useFetchQuery = <T>(options: UseQueryOptions<T>) =>
	useQuery<T>({
		retry: false,
		refetchOnWindowFocus: false,
		gcTime: 0,
		staleTime: 1000 * 60 * 0,
		...options,
	});
