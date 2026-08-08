import { useCallback, useEffect, useState } from "react";

export function useApiResource(loader, dependencies = [], { immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(immediate);

  const load = useCallback(
    async ({ signal, silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
        setError("");
      }

      try {
        const result = await loader({ signal });
        setData(result);
        return result;
      } catch (error) {
        if (signal?.aborted || error.name === "AbortError") return null;
        setError(error.message);
        throw error;
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    dependencies
  );

  useEffect(() => {
    if (!immediate) return undefined;

    const controller = new AbortController();
    load({ signal: controller.signal }).catch(() => {});

    return () => controller.abort();
  }, [immediate, load]);

  return {
    data,
    error,
    loading,
    reload: load,
    setData
  };
}
