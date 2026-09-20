import { type UseQueryOptions, useQuery } from "@tanstack/react-query";

export const useFetchQuery = <T>(options: UseQueryOptions<T>) =>
	useQuery<T>({
		retry: false,
		refetchOnWindowFocus: false,
		gcTime: 1000 * 60 * 5,
		staleTime: 1000 * 30,
		...options,
	});
