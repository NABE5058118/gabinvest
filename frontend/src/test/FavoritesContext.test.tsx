import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
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

function FavoritesTestComponent() {
  const { favoriteIds, toggleFavorite, isFavorite, loading } = useFavorites();
  return (
    <div>
      <div data-testid="fav-loading">{loading ? 'loading' : 'ready'}</div>
      <div data-testid="fav-count">{favoriteIds.size}</div>
      <button onClick={() => toggleFavorite('obj-1')}>Toggle obj-1</button>
      <button onClick={() => toggleFavorite('obj-2')}>Toggle obj-2</button>
      <div data-testid="is-fav-1">{isFavorite('obj-1') ? 'yes' : 'no'}</div>
      <div data-testid="is-fav-2">{isFavorite('obj-2') ? 'yes' : 'no'}</div>
    </div>
  );
}

describe('FavoritesContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should start with empty favorites when no user', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <FavoritesProvider>
              <FavoritesTestComponent />
            </FavoritesProvider>
          </AuthProvider>
        </BrowserRouter>
      );
    });

    expect(screen.getByTestId('fav-count').textContent).toBe('0');
  });

  it('should toggle favorites locally when no user', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <FavoritesProvider>
              <FavoritesTestComponent />
            </FavoritesProvider>
          </AuthProvider>
        </BrowserRouter>
      );
    });

    expect(screen.getByTestId('is-fav-1').textContent).toBe('no');

    await act(async () => {
      screen.getByText('Toggle obj-1').click();
    });

    expect(screen.getByTestId('fav-count').textContent).toBe('1');
    expect(screen.getByTestId('is-fav-1').textContent).toBe('yes');

    await act(async () => {
      screen.getByText('Toggle obj-1').click();
    });

    expect(screen.getByTestId('fav-count').textContent).toBe('0');
    expect(screen.getByTestId('is-fav-1').textContent).toBe('no');
  });

  it('should toggle multiple favorites locally when no user', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <FavoritesProvider>
              <FavoritesTestComponent />
            </FavoritesProvider>
          </AuthProvider>
        </BrowserRouter>
      );
    });

    await act(async () => {
      screen.getByText('Toggle obj-1').click();
    });

    await act(async () => {
      screen.getByText('Toggle obj-2').click();
    });

    expect(screen.getByTestId('fav-count').textContent).toBe('2');
    expect(screen.getByTestId('is-fav-1').textContent).toBe('yes');
    expect(screen.getByTestId('is-fav-2').textContent).toBe('yes');
  });

  it('should use API when user is present', async () => {
    const mockUser = { id: 'user-1', email: 'anna@test.com', firstName: 'Anna' };
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    (api.get as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue({ data: [] });
    (api.post as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue({ data: {} });

    await act(async () => {
      render(
        <BrowserRouter>
          <AuthProvider>
            <FavoritesProvider>
              <FavoritesTestComponent />
            </FavoritesProvider>
          </AuthProvider>
        </BrowserRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('fav-loading').textContent).toBe('ready');
    });

    expect(api.get).toHaveBeenCalledWith('/api/favorites');

    await act(async () => {
      screen.getByText('Toggle obj-1').click();
    });

    expect(api.post).toHaveBeenCalledWith('/api/favorites/obj-1', {});
  });
});
