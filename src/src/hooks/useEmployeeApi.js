import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

const BASE = "https://haodaasset-backend-1.onrender.com/api/employee";

/**
 * Tiny wrapper around axios for employee self-service endpoints.
 * The Authorization header is already set by AuthContext on login.
 *
 * Usage:
 *   const { data, loading, error, reload } = useGet("/dashboard");
 */
export function useGet(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const cancelRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const controller = new AbortController();
    cancelRef.current = controller;

    axios
      .get(`${BASE}${path}`, { signal: controller.signal })
      .then((r) => setData(r.data))
      .catch((err) => {
        if (axios.isCancel(err)) return;
        setError(
          err.response?.data?.message ||
            "Couldn't reach the API. Is the Spring Boot server running on :8080?"
        );
      })
      .finally(() => setLoading(false));
  }, [path]);

  useEffect(() => {
    load();
    return () => cancelRef.current?.abort();
  }, [load]);

  return { data, loading, error, reload: load };
}

export async function postRequest(body) {
  const { data } = await axios.post(`${BASE}/request`, body);
  return data;
}

export default BASE;

