import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { DataTable, TablePagination } from '../src/shared/ui';
import { DEFAULT_PAGE_SIZE, paginasVisibles, paginasVisiblesSinTotal } from '../src/shared/pagination';

afterEach(cleanup);

describe('Paginación compartida', () => {
    it('centraliza diez registros y calcula las páginas visibles', () => {
        expect(DEFAULT_PAGE_SIZE).toBe(10);
        expect(paginasVisibles(1, 4)).toEqual([1, 2, 3, 4]);
        expect(paginasVisibles(2, 20)).toEqual([1, 2, 3, 'fin-ellipsis', 20]);
        expect(paginasVisibles(10, 20)).toEqual([1, 'inicio-ellipsis', 10, 'fin-ellipsis', 20]);
        expect(paginasVisibles(19, 20)).toEqual([1, 'inicio-ellipsis', 18, 19, 20]);
        expect(paginasVisiblesSinTotal(1, true)).toEqual([1, 2]);
        expect(paginasVisiblesSinTotal(8, true)).toEqual([1, 'inicio-ellipsis', 7, 8, 9]);
        expect(paginasVisiblesSinTotal(8, false)).toEqual([1, 'inicio-ellipsis', 7, 8]);
    });

    it('permite avanzar con números aun cuando el API no informa el total', () => {
        const onPagina = vi.fn();
        render(<TablePagination pagina={1} cantidad={10} hayMas onPagina={onPagina} />);
        fireEvent.click(screen.getByRole('button', { name: 'Ir a la página 2' }));
        expect(onPagina).toHaveBeenCalledWith(2);
    });

    it('muestra rango, total, elipsis y permite ir a una página concreta', () => {
        const onPagina = vi.fn();
        render(<TablePagination pagina={10} limite={10} cantidad={10} total={200} hayMas onPagina={onPagina} />);
        const navegacion = screen.getByRole('navigation', { name: 'Paginación de registros' });
        expect(within(navegacion).getByText('91–100 de 200 registros')).toBeTruthy();
        expect(within(navegacion).getByLabelText('Página actual, 10')).toBeTruthy();
        expect(within(navegacion).getAllByText('…')).toHaveLength(2);
        fireEvent.click(within(navegacion).getByRole('button', { name: 'Ir a la página 20' }));
        expect(onPagina).toHaveBeenCalledWith(20);
    });

    it('mantiene estados disabled y el selector predeterminado', () => {
        const onLimite = vi.fn();
        render(<TablePagination pagina={1} cantidad={0} total={0} hayMas={false} onPagina={vi.fn()} onLimite={onLimite} />);
        expect(screen.getByRole('button', { name: 'Anterior' })).toHaveProperty('disabled', true);
        expect(screen.getByRole('button', { name: 'Siguiente' })).toHaveProperty('disabled', true);
        expect(screen.getByText('0–0 de 0 registros')).toBeTruthy();
        const selector = screen.getByLabelText('Filas por página') as HTMLSelectElement;
        expect(selector.value).toBe('10');
        fireEvent.change(selector, { target: { value: '25' } });
        expect(onLimite).toHaveBeenCalledWith(25);
    });

    it('expone una tabla semántica con nombre accesible', () => {
        render(<DataTable label="Inventario"><thead><tr><th>Código</th></tr></thead><tbody><tr><td>EQ-1</td></tr></tbody></DataTable>);
        expect(screen.getByRole('table', { name: 'Inventario' })).toBeTruthy();
        expect(screen.getByRole('columnheader', { name: 'Código' })).toBeTruthy();
    });
});
