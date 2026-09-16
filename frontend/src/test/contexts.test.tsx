import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { FavoritesProvider, useFavorites } from '../context/FavoritesContext';
import { api } from '../utils/api';

vi.mock('../utils/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
  API_URL: 'http://localhost:3001',
}));

function TestComponent() {
  const { user, loading } = useAuth();
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'ready'}</div>
      <div data-testid="user">{user ? user.firstName || user.email || 'user' : 'no-user'}</div>
    </div>
  );
}

function FavoritesTestComponent() {
  const { favoriteIds, toggleFavorite, isFavorite, loading } = useFavorites();
  return (
    <div>
      <div data-testid="fav-loading">{loading ? 'loading' : 'ready'}</div>
      <div data-testid="fav-count">{favoriteIds.size}</div>
      <button onClick={() => toggleFavorite('obj-1')}>Toggle</button>
      <div data-testid="is-fav">{isFavorite('obj-1') ? 'yes' : 'no'}</div>
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
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    expect(screen.getByTestId('user').textContent).toBe('no-user');
  });

  it('should show user from localStorage when token exists', async () => {
    const mockUser = { id: 'user-1', email: 'anna@test.com', firstName: 'Anna' };
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    expect(screen.getByTestId('user').textContent).toBe('Anna');
  });
});

describe('FavoritesContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should start with empty favorites when no user', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <FavoritesProvider>
            <FavoritesTestComponent />
          </FavoritesProvider>
        </AuthProvider>
      );
    });

    expect(screen.getByTestId('fav-count').textContent).toBe('0');
  });

  it('should toggle favorites locally when no user', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <FavoritesProvider>
            <FavoritesTestComponent />
          </FavoritesProvider>
        </AuthProvider>
      );
    });

    expect(screen.getByTestId('is-fav').textContent).toBe('no');

    await act(async () => {
      screen.getByText('Toggle').click();
    });

    expect(screen.getByTestId('fav-count').textContent).toBe('1');
    expect(screen.getByTestId('is-fav').textContent).toBe('yes');
  });

  it('should use API when user is present', async () => {
    const mockUser = { id: 'user-1', email: 'anna@test.com', firstName: 'Anna' };
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    (api.get as any).mockResolvedValue({ data: [] });
    (api.post as any).mockResolvedValue({ data: {} });

    await act(async () => {
      render(
        <AuthProvider>
          <FavoritesProvider>
            <FavoritesTestComponent />
          </FavoritesProvider>
        </AuthProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('fav-loading').textContent).toBe('ready');
    });

    expect(api.get).toHaveBeenCalledWith('/api/favorites');
  });
});
