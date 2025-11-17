import { useEffect, useState } from "react";

/**
 * Devuelve el valor estabilizado tras el retraso indicado.
 * Útil para evitar llamadas excesivas al teclear en la barra de búsqueda.
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

export default useDebounce;
