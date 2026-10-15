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

describe("Listado y detalle de empleados", () => {
    it("filtra por habilitados y muestra estadísticas de técnicos activos", () => {
        render(<EmpleadosListado empleados={[empleado, inactivo]} onVer={vi.fn()} onCrear={vi.fn()} />);
        fireEvent.change(screen.getByLabelText("Habilitación técnica"), { target: { value: "habilitados" } });
        expect(screen.getByText("T-001")).toBeTruthy();
        expect(screen.queryByText("T-002")).toBe(null);
    });
    it("filtra por no habilitados", () => {
        render(<EmpleadosListado empleados={[empleado, inactivo]} onVer={vi.fn()} onCrear={vi.fn()} />);
        fireEvent.change(screen.getByLabelText("Habilitación técnica"), { target: { value: "no-habilitados" } });
        expect(screen.getByText("T-002")).toBeTruthy();
        expect(screen.queryByText("T-001")).toBe(null);
    });
    it("consulta el ID indicado al pulsar detalle", () => {
        const onVer = vi.fn();
        render(<EmpleadosListado empleados={[empleado]} onVer={onVer} onCrear={vi.fn()} />);
        fireEvent.click(screen.getByRole("button", { name: "Ver detalle" }));
        expect(onVer).toHaveBeenCalledWith(1);
    });
    it("presenta estado vacío con opción de registro", () => {
        const onCrear = vi.fn();
        render(<EmpleadosListado empleados={[]} onVer={vi.fn()} onCrear={onCrear} />);
        fireEvent.click(screen.getByRole("button", { name: "Registrar empleado" }));
        expect(onCrear).toHaveBeenCalledOnce();
    });
    it("pagina después de diez empleados", () => {
        const datos = Array.from({ length: 12 }, (_, indice) => ({
            ...empleado,
            id: indice + 1,
            codEmpleado: `T-${indice + 1}`,
        }));
        render(<EmpleadosListado empleados={datos} onVer={vi.fn()} onCrear={vi.fn()} />);
        expect(screen.getByText("T-1")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
        expect(screen.queryByText("T-1")).toBe(null);
        expect(screen.getByText("T-12")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
        expect(screen.getByText("T-1")).toBeTruthy();
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
