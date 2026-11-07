import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Paginacion } from '../src/shared/Paginacion';
import { paginasVisibles } from '../src/shared/pagination';

afterEach(cleanup);

describe('Paginacion', () => {
    it('calcula la ventana de páginas como DataTables', () => {
        expect(paginasVisibles(1, 5)).toEqual([1, 2, 3, 4, 5]);
        expect(paginasVisibles(1, 20)).toEqual([1, 2, 3, 4, 5, 'gap', 20]);
        expect(paginasVisibles(10, 20)).toEqual([1, 'gap', 9, 10, 11, 'gap', 20]);
        expect(paginasVisibles(19, 20)).toEqual([1, 'gap', 16, 17, 18, 19, 20]);
    });

    it('con total muestra el conteo, los números y el selector de límite', () => {
        const onPagina = vi.fn(); const onLimite = vi.fn();
        render(<Paginacion pagina={2} limite={10} hayMas total={43} onPagina={onPagina} onLimite={onLimite} />);
        expect(screen.getByText('Mostrando 11 a 20 de 43 registros')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Página 2' }).getAttribute('aria-current')).toBe('page');
        fireEvent.click(screen.getByRole('button', { name: 'Página 5' }));
        expect(onPagina).toHaveBeenCalledWith(5);
        fireEvent.change(screen.getByRole('combobox', { name: 'Registros por página' }), { target: { value: '50' } });
        expect(onLimite).toHaveBeenCalledWith(50);
    });

    it('sin total solo avanza con hayMas', () => {
        render(<Paginacion pagina={3} limite={10} hayMas={false} onPagina={vi.fn()} />);
        expect(screen.getByText('Página 3')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Siguiente' }).hasAttribute('disabled')).toBe(true);
        expect(screen.getByRole('button', { name: 'Anterior' }).hasAttribute('disabled')).toBe(false);
        expect(screen.queryByRole('combobox')).toBeNull();
    });
});
