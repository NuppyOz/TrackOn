import { useEffect, useRef, useState } from 'react';

/** Selectores inmediatos y búsqueda con espera para agrupar las pulsaciones. */
export function useFiltrosListado<T extends object>(iniciales: T) {
    const [filtros, setFiltros] = useState(iniciales);
    const [aplicados, setAplicados] = useState(iniciales);
    const [pendiente, setPendiente] = useState(false);
    const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (temporizador.current !== null) clearTimeout(temporizador.current);
    }, []);

    function aplicarFiltros(nuevos = filtros) {
        if (temporizador.current !== null) clearTimeout(temporizador.current);
        temporizador.current = null;
        setFiltros(nuevos);
        setAplicados({ ...nuevos });
        setPendiente(false);
    }

    function cambiarFiltros(nuevos: T, esperar = false) {
        if (temporizador.current !== null) clearTimeout(temporizador.current);
        setFiltros(nuevos);
        if (!esperar) {
            aplicarFiltros(nuevos);
            return;
        }
        setPendiente(true);
        temporizador.current = setTimeout(() => aplicarFiltros(nuevos), 250);
    }

    return { filtros, aplicados, pendiente, cambiarFiltros, aplicarFiltros };
}
