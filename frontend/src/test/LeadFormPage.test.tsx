import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LeadFormPage from '@pages/LeadFormPage';
import { AuthProvider } from '@context/AuthContext';
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
    <MemoryRouter initialEntries={['/objects/obj-1/lead']}>
      <AuthProvider>
        <Routes>
          <Route path="/objects/:id/lead" element={ui} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('LeadFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should autofill name and phone from user profile', async () => {
    const mockUser = { id: '1', firstName: 'Ivan', lastName: 'Ivanov', phone: '+79000000001' };
    localStorage.setItem('user', JSON.stringify(mockUser));

    (api.get as unknown as { mockImplementation: (fn: (url: string) => Promise<unknown>) => void }).mockImplementation(
      (url: string) => {
        if (url.includes('/api/auth/me')) return Promise.resolve({ data: mockUser });
        if (url.includes('/api/objects/obj-1')) return Promise.resolve({
          data: { id: 'obj-1', title: 'Test Object', location: 'Moscow', price: 1000000 },
        });
        return Promise.resolve({ data: {} });
      },
    );

    await act(async () => {
      renderWithProviders(<LeadFormPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Оставить заявку')).toBeInTheDocument();
    });

    expect((screen.getByLabelText(/ваше имя/i) as HTMLInputElement).value).toBe('Ivan Ivanov');
    expect((screen.getByLabelText(/телефон/i) as HTMLInputElement).value).toContain('+7');
  });

  it('should leave form empty when no user', async () => {
    (api.get as unknown as { mockImplementation: (fn: (url: string) => Promise<unknown>) => void }).mockImplementation(
      (url: string) => {
        if (url.includes('/api/auth/me')) return Promise.reject(new Error('unauthorized'));
        if (url.includes('/api/objects/obj-1')) return Promise.resolve({
          data: { id: 'obj-1', title: 'Test Object', location: 'Moscow', price: 1000000 },
        });
        return Promise.resolve({ data: {} });
      },
    );
    (api.post as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue({ data: { ok: true } });

    await act(async () => {
      renderWithProviders(<LeadFormPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Оставить заявку')).toBeInTheDocument();
    });

    expect((screen.getByLabelText(/ваше имя/i) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(/телефон/i) as HTMLInputElement).value).toBe('+7');
  });
});
