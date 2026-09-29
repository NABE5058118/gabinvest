import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProfileEditPage from '@pages/ProfileEditPage';
import { AuthProvider, useAuth } from '@context/AuthContext';
import { api } from '@utils/api';
import userEvent from '@testing-library/user-event';

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

describe('ProfileEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render email and phone fields', async () => {
    const mockUser = { id: '1', firstName: 'Ivan', lastName: 'Ivanov', email: 'ivan@test.com', phone: '+79000000001' };
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    (api.get as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue({ data: mockUser });

    await act(async () => {
      renderWithProviders(<ProfileEditPage />);
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/телефон/i)).toBeInTheDocument();
    });

    expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe('ivan@test.com');
    expect((screen.getByLabelText(/телефон/i) as HTMLInputElement).value).toBe('+79000000001');
  });

  it('should submit email and phone on save', async () => {
    const mockUser = { id: '1', firstName: 'Ivan', lastName: 'Ivanov', email: 'ivan@test.com', phone: '+79000000001' };
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    (api.get as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue({ data: mockUser });
    (api.put as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue({
      data: { ...mockUser, email: 'new@test.com', phone: '+79000000002' },
    });

    await act(async () => {
      renderWithProviders(<ProfileEditPage />);
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/email/i);
    const phoneInput = screen.getByLabelText(/телефон/i);

    await act(async () => {
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, 'new@test.com');
    });

    await act(async () => {
      await userEvent.clear(phoneInput);
      await userEvent.type(phoneInput, '+79000000002');
    });

    await act(async () => {
      screen.getByText('Сохранить').click();
    });

    expect(api.put).toHaveBeenCalledWith('/api/auth/profile', {
      firstName: 'Ivan',
      lastName: 'Ivanov',
      email: 'new@test.com',
      phone: '+79000000002',
    });
  });
});
