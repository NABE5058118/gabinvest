import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ObjectPage from '@pages/ObjectPage';
import { AuthProvider } from '@context/AuthContext';
import { FavoritesProvider, useFavorites } from '@context/FavoritesContext';
import { api } from '@utils/api';

vi.mock('@utils/api', () => ({
  api: {
    put: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  API_URL: 'http://localhost:3001',
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={['/objects/obj-1']}>
      <AuthProvider>
        <FavoritesProvider>
          <Routes>
            <Route path="/objects/:id" element={ui} />
          </Routes>
        </FavoritesProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('ObjectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should show loading state initially', async () => {
    (api.get as unknown as { mockImplementation: (fn: () => Promise<unknown>) => void }).mockImplementation(
      () => new Promise(() => {})
    );

    await act(async () => {
      renderWithProviders(<ObjectPage />);
    });

    expect(screen.getByText('Загрузка...')).toBeInTheDocument();
  });

  it('should show error when object not found', async () => {
    (api.get as unknown as { mockRejectedValue: (err: Error) => void }).mockRejectedValue(new Error('Not found'));

    await act(async () => {
      renderWithProviders(<ObjectPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Объект не найден')).toBeInTheDocument();
    });
  });

  it('should render object details', async () => {
    const mockObject = {
      id: 'obj-1',
      title: 'Test Object',
      location: 'Moscow',
      price: 1000000,
      yieldPercent: 8,
      area: 100,
      type: 'retail',
      images: [],
      image: null,
      monthlyRent: 50000,
      annualRevenue: 600000,
      leaseEndDate: '2025-12-31',
      anchorTenantName: 'Tenant',
      tenants: [],
      leases: [],
      expenses: [],
      legalConstraints: [],
      engineeringSpec: null,
      vatRate: null,
      placement: null,
      description: 'Test description',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    (api.get as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue({ data: mockObject });

    await act(async () => {
      renderWithProviders(<ObjectPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Object')).toBeInTheDocument();
    });

    expect(screen.getByText('Moscow')).toBeInTheDocument();
    expect(screen.getByText('1 000 000 ₽')).toBeInTheDocument();
    expect(screen.getByText('Доходность: 8%')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });
});
