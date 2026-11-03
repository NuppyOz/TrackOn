import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import EmpleadosListado from "../src/features/empleados/EmpleadosListado";
import EmpleadoDetallePanel from "../src/features/empleados/EmpleadoDetallePanel";

const empleado = {
    id: 1,
    codEmpleado: "T-001",
    active: true,
    habilitadoComoTecnico: true,
    persona: { firstName: "Ana", secondName: null, firstLastName: "López", secondLastName: null },
};
const inactivo = {
    id: 2,
    codEmpleado: "T-002",
    active: false,
    habilitadoComoTecnico: false,
    persona: { firstName: "Luis", secondName: null, firstLastName: "Pérez", secondLastName: null },
};

afterEach(() => {
    cleanup();
});

const filtros = { buscar: '', estado: 'todos' as const, tecnico: 'todos' as const, pagina: 1, limite: 10 };
function props(items = [empleado, inactivo]) {
    return {
        datos: { items, pagina: 1, limite: 10, hayMas: false, total: items.length,
            resumen: { total: items.length, activos: items.filter(item => item.active).length, tecnicosHabilitados: items.filter(item => item.active && item.habilitadoComoTecnico).length } },
        filtros,
        cargando: false,
        onFiltros: vi.fn(),
        onPagina: vi.fn(),
        onLimite: vi.fn(),
        onVer: vi.fn(),
        onCrear: vi.fn(),
    };
}

describe("Listado y detalle de empleados", () => {
    it("filtra por habilitados y muestra estadísticas de técnicos activos", () => {
        const propiedades = props();
        render(<EmpleadosListado {...propiedades} />);
        fireEvent.change(screen.getByLabelText("Habilitación técnica"), { target: { value: "habilitados" } });
        expect(propiedades.onFiltros).toHaveBeenCalledWith(expect.objectContaining({ tecnico: 'habilitados', pagina: 1 }), false);
        expect(screen.getByText("Técnicos habilitados")).toBeTruthy();
    });
    it("filtra por no habilitados", () => {
        const propiedades = props();
        render(<EmpleadosListado {...propiedades} />);
        fireEvent.change(screen.getByLabelText("Habilitación técnica"), { target: { value: "no-habilitados" } });
        expect(propiedades.onFiltros).toHaveBeenCalledWith(expect.objectContaining({ tecnico: 'no-habilitados', pagina: 1 }), false);
    });
    it("consulta el ID indicado al pulsar detalle", () => {
        const propiedades = props([empleado]);
        render(<EmpleadosListado {...propiedades} />);
        fireEvent.click(screen.getByRole("button", { name: "Ver detalle" }));
        expect(propiedades.onVer).toHaveBeenCalledWith(1);
    });
    it("presenta estado vacío con opción de registro", () => {
        const propiedades = props([]);
        render(<EmpleadosListado {...propiedades} />);
        fireEvent.click(screen.getByRole("button", { name: "Registrar empleado" }));
        expect(propiedades.onCrear).toHaveBeenCalledOnce();
    });
    it("delega la página y la cantidad al servidor", () => {
        const propiedades = props([empleado]);
        propiedades.datos.hayMas = true;
        propiedades.datos.total = 12;
        render(<EmpleadosListado {...propiedades} />);
        fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
        expect(propiedades.onPagina).toHaveBeenCalledWith(2);
        fireEvent.change(screen.getByLabelText("Filas por página"), { target: { value: "50" } });
        expect(propiedades.onLimite).toHaveBeenCalledWith(50);
    });
    it("no permite habilitar empleado inactivo", () => {
        const onCambiar = vi.fn();
        render(
            <EmpleadoDetallePanel
                empleado={{ ...inactivo, personaId: 10 }}
                ocupada={false}
                onEditar={vi.fn()}
                onCambiarEstado={vi.fn()}
                onCambiarHabilitacion={onCambiar}
            />,
        );
        const boton = screen.getByRole("button", { name: "Habilitar como técnico" }) as HTMLButtonElement;
        expect(boton.disabled).toBe(true);
        fireEvent.click(boton);
        expect(onCambiar).not.toHaveBeenCalled();
    });
});
