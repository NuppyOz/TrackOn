#!/usr/bin/env python3
"""Instalador conservador del módulo Empleados para TrackOn.

No modifica el esquema Prisma, no crea usuarios y no ejecuta git add/commit/push.
Exige feature/empleados para evitar mezclar trabajo en dev/otras funciones.
"""
from pathlib import Path
import shutil
import subprocess
import sys

BASE = Path(__file__).resolve().parent
ROOT = BASE.parent


def fallo(mensaje: str) -> None:
    sys.exit('ERROR: ' + mensaje)


def ejecutar(*args: str) -> str:
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()


if not (ROOT / 'pnpm-workspace.yaml').is_file():
    fallo('Extrae la carpeta trackon-empleados en la raíz del repositorio TrackOn.')
try:
    rama = ejecutar('branch', '--show-current')
    if rama != 'feature/empleados':
        fallo(f'Rama activa: {rama or "(ninguna)"}. Cambia a feature/empleados.')
    if ejecutar('status', '--porcelain', '--untracked-files=no'):
        fallo('Hay modificaciones de archivos rastreados. Guarda o revisa esos cambios antes de instalar.')
except (subprocess.CalledProcessError, FileNotFoundError) as exc:
    fallo(f'No se pudo consultar Git: {exc}')

app = ROOT / 'apps/web/src/App.tsx'
sidebar = ROOT / 'apps/web/src/shared/layout/Sidebar.tsx'
layout = ROOT / 'apps/web/src/shared/layout/MainLayout.tsx'
repository = ROOT / 'apps/api/src/modules/empleados/empleados.repository.ts'
originales = {}
for archivo in (app, sidebar, layout, repository):
    if not archivo.is_file():
        fallo(f'No se encontró {archivo.relative_to(ROOT)}')
    originales[archivo] = archivo.read_text(encoding='utf-8')


def reemplazar_uno(data: str, anterior: str, nuevo: str, contexto: str) -> str:
    if nuevo in data:
        return data
    if data.count(anterior) != 1:
        fallo(f'No se reconoció el ancla de {contexto}. No se modificó ningún archivo.')
    return data.replace(anterior, nuevo, 1)


app_txt = originales[app]
app_txt = reemplazar_uno(app_txt,
    'import EquiposManager from "./features/equipos/EquiposManager";',
    'import EquiposManager from "./features/equipos/EquiposManager";\nimport EmpleadosManager from "./features/empleados/EmpleadosManager";',
    'importación de módulos')
app_txt = reemplazar_uno(app_txt,
    'import "./App.css";',
    'import "./App.css";\nimport "./shared/styles/empleados.css";',
    'importación de estilos')
app_txt = reemplazar_uno(app_txt,
    '        case "equipos":',
    '        case "empleados":\n            return puedeGestionar ? <EmpleadosManager /> : <p role="alert">No tienes permisos para acceder a este módulo.</p>;\n\n        case "equipos":',
    'navegación de módulos')
app_txt = reemplazar_uno(app_txt,
    'destino === "cuadrillas" && !puedeGestionar',
    '(destino === "cuadrillas" || destino === "empleados") && !puedeGestionar',
    'guardia de navegación')

sb = originales[sidebar]
if '"empleados"' not in sb.split(';', 1)[0]:
    sb = reemplazar_uno(sb, 'export type Seccion = ',
        'export type Seccion = "empleados" | ', 'tipo de sección')
if 'id: "empleados"' not in sb:
    sb = reemplazar_uno(sb, 'const recursos: Enlace[] = [',
        'const recursos: Enlace[] = [\n    { id: "empleados", etiqueta: "Empleados", icono: "♙" },',
        'menú de recursos')
sb = reemplazar_uno(sb,
    'item.id !== "cuadrillas" || puedeGestionarCuadrillas',
    '(item.id !== "cuadrillas" && item.id !== "empleados") || puedeGestionarCuadrillas',
    'permisos del menú')

layout_txt = originales[layout]
layout_txt = reemplazar_uno(layout_txt, 'const etiquetas: Record<Seccion, string> = {',
    'const etiquetas: Record<Seccion, string> = {\n    empleados: "Empleados",',
    'etiquetas del layout')

repo = originales[repository]
inicio_lista = 'export function listarEmpleados () {'
inicio_detalle = 'export function buscarEmpleadoPorId(id: number) {'
inicio_editar = 'export function actualizarEmpleado('
if any(repo.count(ancla) != 1 for ancla in (inicio_lista, inicio_detalle, inicio_editar)):
    fallo('El repositorio de Empleados cambió de estructura. No se aplicará un parche a ciegas.')
pre, posterior = repo.split(inicio_lista, 1)
lista, posterior = posterior.split(inicio_detalle, 1)
detalle, resto = posterior.split(inicio_editar, 1)
for etiqueta, contenido in [('listado', lista), ('detalle', detalle)]:
    if 'habilitadoComoTecnico: true,' not in contenido and 'active: true,' not in contenido:
        fallo(f'No se pudo localizar la proyección de {etiqueta}.')
if 'habilitadoComoTecnico: true,' not in lista:
    lista = lista.replace('active: true,', 'active: true,\n            habilitadoComoTecnico: true,', 1)
if 'habilitadoComoTecnico: true,' not in detalle:
    detalle = detalle.replace('active: true,', 'active: true,\n            habilitadoComoTecnico: true,', 1)
repo = pre + inicio_lista + lista + inicio_detalle + detalle + inicio_editar + resto

archivos = {app: app_txt, sidebar: sb, layout: layout_txt, repository: repo}
fuentes = [
    'apps/web/src/features/empleados/empleados.types.ts',
    'apps/web/src/features/empleados/empleados.api.ts',
    'apps/web/src/features/empleados/empleados.form.ts',
    'apps/web/src/features/empleados/EmpleadosManager.tsx',
    'apps/web/src/features/empleados/EmpleadosListado.tsx',
    'apps/web/src/features/empleados/EmpleadoFormulario.tsx',
    'apps/web/src/features/empleados/EmpleadoDetallePanel.tsx',
    'apps/web/src/features/empleados/ConfirmarAccionEmpleado.tsx',
    'apps/web/src/shared/styles/empleados.css',
    'apps/web/test/empleados.api.test.ts',
    'apps/web/test/empleados.form.test.ts',
    'apps/web/test/EmpleadosManager.test.tsx',
    'apps/web/test/EmpleadosListado.test.tsx',
    'apps/api/test/empleados.proyeccion.test.ts',
]
for relative in fuentes:
    src = BASE / relative
    destino = ROOT / relative
    if not src.is_file():
        fallo(f'El paquete está incompleto: {relative}')
    if destino.exists():
        fallo(f'Ya existe {relative}; se detuvo la instalación para evitar sobrescribir cambios.')
    archivos[destino] = src.read_text(encoding='utf-8')

respaldo = ROOT / '.respaldo-empleados'
for archivo in originales:
    target = respaldo / archivo.relative_to(ROOT)
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        shutil.copy2(archivo, target)
for destino, texto in archivos.items():
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(texto, encoding='utf-8')
print('Empleados integrado. Archivos compartidos y backend ajustados. Ejecuta build, lint y pruebas.')
print('Los respaldos están en .respaldo-empleados/; no los incluyas en el commit.')
