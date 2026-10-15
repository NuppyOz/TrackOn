import { useEffect, useState } from 'react';
import { cambiarEstadoEmpleado, cambiarHabilitacionTecnica, crearEmpleado, editarEmpleado, listarEmpleados, obtenerEmpleado } from './empleados.api';
import type { CrearEmpleado, EditarEmpleado, EmpleadoDetalle, EmpleadoResumen } from './empleados.types';
import { nombreEmpleado } from './empleados.types';
import EmpleadosListado from './EmpleadosListado';
import EmpleadoFormulario from './EmpleadoFormulario';
import EmpleadoDetallePanel from './EmpleadoDetallePanel';
import ConfirmarAccionEmpleado from './ConfirmarAccionEmpleado';

type Vista = 'listado' | 'crear' | 'detalle' | 'editar';
type Accion = 'estado' | 'tecnico';

const errorTexto = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la operación.';

export default function EmpleadosManager() {
    const [vista, setVista] = useState<Vista>('listado');
    const [empleados, setEmpleados] = useState<EmpleadoResumen[]>([]);
    const [seleccionado, setSeleccionado] = useState<EmpleadoDetalle | null>(null);
    const [cargando, setCargando] = useState(true);
    const [ocupada, setOcupada] = useState(false);
    const [aviso, setAviso] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
    const [confirmar, setConfirmar] = useState<Accion | null>(null);

    useEffect(() => {
        let activo = true;
        void listarEmpleados().then(datos => { if (activo) setEmpleados(datos); })
            .catch(error => { if (activo) setAviso({ tipo: 'error', texto: errorTexto(error) }); })
            .finally(() => { if (activo) setCargando(false); });
        return () => { activo = false; };
    }, []);

    async function actualizarListado() {
        setEmpleados(await listarEmpleados());
    }

    async function abrirDetalle(id: number) {
        setCargando(true);
        setAviso(null);
        try {
            setSeleccionado(await obtenerEmpleado(id));
            setVista('detalle');
        } catch (error) { setAviso({ tipo: 'error', texto: errorTexto(error) }); }
        finally { setCargando(false); }
    }

    async function guardar(datos: CrearEmpleado | EditarEmpleado) {
        setOcupada(true);
        setAviso(null);
        try {
            const resultado = vista === 'editar' && seleccionado
                ? await editarEmpleado(seleccionado.id, datos)
                : await crearEmpleado(datos as CrearEmpleado);
            await actualizarListado();
            await abrirDetalle(resultado.id);
            setAviso({ tipo: 'exito', texto: vista === 'editar' ? 'Empleado actualizado correctamente.' : 'Empleado registrado correctamente.' });
        } catch (error) { setAviso({ tipo: 'error', texto: errorTexto(error) }); }
        finally { setOcupada(false); }
    }

    async function ejecutarAccion() {
        if (!seleccionado || !confirmar) return;
        setOcupada(true);
        setAviso(null);
        try {
            if (confirmar === 'estado') await cambiarEstadoEmpleado(seleccionado.id, !seleccionado.active);
            else await cambiarHabilitacionTecnica(seleccionado.id, !seleccionado.habilitadoComoTecnico);
            await actualizarListado();
            setSeleccionado(await obtenerEmpleado(seleccionado.id));
            setConfirmar(null);
            setAviso({ tipo: 'exito', texto: 'Los cambios del empleado se guardaron correctamente.' });
        } catch (error) { setAviso({ tipo: 'error', texto: errorTexto(error) }); }
        finally { setOcupada(false); }
    }

    function volver() { setAviso(null); setConfirmar(null); setVista('listado'); }

    const titulo = vista === 'listado' ? 'Empleados' : vista === 'crear' ? 'Registrar empleado' : vista === 'editar' ? 'Editar empleado' : 'Detalle del empleado';
    const nombre = seleccionado ? nombreEmpleado(seleccionado) : '';
    const confirmarTitulo = confirmar === 'estado'
        ? `${seleccionado?.active ? 'Desactivar' : 'Reactivar'} empleado`
        : `${seleccionado?.habilitadoComoTecnico ? 'Retirar habilitación de' : 'Habilitar como técnico a'} ${nombre}`;
    const confirmarDescripcion = confirmar === 'estado'
        ? `Se cambiará el estado de ${nombre}. La disponibilidad y el acceso dependerán de las reglas actuales del sistema.`
        : `Se actualizará la habilitación técnica de ${nombre}. Esta operación puede afectar la elegibilidad para órdenes y cuadrillas.`;

    return <section className="tk-employees" aria-labelledby="tk-employees-title">
        <header className="tk-employee-heading">
            <div><p className="tk-employee-eyebrow">RECURSOS · PERSONAL</p>
                <h2 id="tk-employees-title">{titulo}</h2>
                <p>Gestión de personal interno de MULTICAS y habilitación técnica.</p>
            </div>
            {vista === 'listado' ? <button type="button" className="tk-employee-primary" onClick={() => { setAviso(null); setSeleccionado(null); setVista('crear'); }}>+ Registrar empleado</button>
                : <button type="button" className="tk-employee-secondary" onClick={volver}>← Volver al listado</button>}
        </header>
        {aviso && <div role="alert" className={`tk-employee-notice ${aviso.tipo}`}>{aviso.texto}</div>}
        {cargando ? <div className="tk-employee-panel tk-employee-loading" role="status">Cargando información de empleados…</div> : <>
            {vista === 'listado' && <EmpleadosListado empleados={empleados} onVer={id => void abrirDetalle(id)} onCrear={() => setVista('crear')} />}
            {(vista === 'crear' || vista === 'editar') && <EmpleadoFormulario key={`${vista}-${seleccionado?.id ?? 'nuevo'}`}
                empleado={vista === 'editar' ? seleccionado : null} guardando={ocupada}
                onCancelar={volver} onGuardar={guardar} />}
            {vista === 'detalle' && seleccionado && <EmpleadoDetallePanel empleado={seleccionado} ocupada={ocupada}
                onEditar={() => { setAviso(null); setVista('editar'); }}
                onCambiarEstado={() => setConfirmar('estado')}
                onCambiarHabilitacion={() => setConfirmar('tecnico')} />}
        </>}
        {confirmar && seleccionado && <ConfirmarAccionEmpleado titulo={confirmarTitulo} descripcion={confirmarDescripcion}
            ocupada={ocupada} onCancelar={() => setConfirmar(null)} onConfirmar={() => void ejecutarAccion()} />}
    </section>;
}
