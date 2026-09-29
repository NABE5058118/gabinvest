import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
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

function TestComponent() {
  const { user, loading, login, logout, updateUser } = useAuth();
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'ready'}</div>
      <div data-testid="user">{user ? user.firstName || user.email || 'user' : 'no-user'}</div>
      <button onClick={() => login({ id: '1', firstName: 'Logged' }, 'token')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => updateUser({ id: '1', firstName: 'Updated' })}>Update</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should show no user when no token', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </BrowserRouter>
      );
    });

    expect(screen.getByTestId('user').textContent).toBe('no-user');
  });

  it('should login and show user', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </BrowserRouter>
      );
    });

    await act(async () => {
      screen.getByText('Login').click();
    });

    expect(screen.getByTestId('user').textContent).toBe('Logged');
    expect(localStorage.getItem('token')).toBe('token');
  });

  it('should logout and clear user', async () => {
    const mockUser = { id: '1', firstName: 'Test' };
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    (api.get as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue({ data: mockUser });

    await act(async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('Test');
    });

    await act(async () => {
      screen.getByText('Logout').click();
    });

    expect(screen.getByTestId('user').textContent).toBe('no-user');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('should update user state and localStorage', async () => {
    const mockUser = { id: '1', firstName: 'Old' };
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    (api.get as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue({ data: mockUser });

    await act(async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('Old');
    });

    await act(async () => {
      screen.getByText('Update').click();
    });

    expect(screen.getByTestId('user').textContent).toBe('Updated');
    expect(JSON.parse(localStorage.getItem('user') || '{}').firstName).toBe('Updated');
  });
});
