import type { ApiError } from "@/api/client";
import {
	type InfiniteData,
	type QueryKey,
	type UseInfiniteQueryOptions,
	type UseMutationOptions,
	type UseQueryOptions,
	useInfiniteQuery,
	useMutation,
	useQuery,
} from "@tanstack/react-query";

const defaults = {
	refetchOnWindowFocus: false,
	gcTime: 1000 * 60 * 5,
	staleTime: 1000 * 30,
	retry: (failureCount: number, error: Error) =>
		failureCount < 3 && [429, 500, 503].includes((error as ApiError).status),
	retryDelay: (attempt: number, error: Error) =>
		(error as ApiError).retryAfterMs ??
		500 * 2 ** attempt + Math.random() * 300,
};

export const useFetchQuery = <T>(options: UseQueryOptions<T>) =>
	useQuery<T>({ ...defaults, ...options });

export const useFetchInfiniteQuery = <T>(
	options: UseInfiniteQueryOptions<
		T,
		Error,
		InfiniteData<T>,
		QueryKey,
		string | undefined
	>
) => useInfiniteQuery({ ...defaults, ...options });

export const useFetchMutation = <TData, TVars>(
	options: UseMutationOptions<TData, Error, TVars>
) =>
	useMutation({
		retry: defaults.retry,
		retryDelay: defaults.retryDelay,
		...options,
	});
