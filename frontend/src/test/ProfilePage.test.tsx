import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProfilePage from '@pages/ProfilePage';
import { AuthProvider, useAuth } from '@context/AuthContext';
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
    <BrowserRouter>
      <AuthProvider>{ui}</AuthProvider>
    </BrowserRouter>
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should not display email and phone fields', async () => {
    const mockUser = { id: '1', firstName: 'Ivan', lastName: 'Ivanov', email: 'ivan@test.com', phone: '+79000000001' };
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    (api.get as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue({ data: mockUser });

    await act(async () => {
      renderWithProviders(<ProfilePage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Профиль')).toBeInTheDocument();
    });

    expect(screen.queryByText('Почта')).not.toBeInTheDocument();
    expect(screen.queryByText('Телефон')).not.toBeInTheDocument();
    expect(screen.queryByText('Не подключено')).not.toBeInTheDocument();
  });
});
