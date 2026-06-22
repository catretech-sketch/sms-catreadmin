import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthScreen } from './AuthScreen';
import { AuthProvider } from '../auth/AuthContext';
import { ToastHost } from '../components';
import * as authApi from '../api/auth';
import { ApiError } from '../api/client';

function wrap() {
  return render(<ToastHost><AuthProvider><AuthScreen /></AuthProvider></ToastHost>);
}

describe('AuthScreen', () => {
  it('renders the password login by default and no demo logins', () => {
    wrap();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByText(/demo logins/i)).not.toBeInTheDocument();
  });

  it('signs in with email + password', async () => {
    const loginSpy = vi.spyOn(authApi, 'login').mockResolvedValue({ access_token: 'a', refresh_token: 'r' });
    vi.spyOn(authApi, 'me').mockResolvedValue({ id: 'u1', tenant_id: null, roles: ['owner'] });
    wrap();
    await userEvent.type(screen.getByLabelText(/^email$/i), 'rohan@catre.io');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'supersecret');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(loginSpy).toHaveBeenCalledWith('rohan@catre.io', 'supersecret'));
  });

  it('shows an error when password login fails', async () => {
    vi.spyOn(authApi, 'login').mockRejectedValue(new ApiError(401, 'invalid_credentials', 'bad email or password', null));
    wrap();
    await userEvent.type(screen.getByLabelText(/^email$/i), 'rohan@catre.io');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(screen.getByText('Incorrect email or password')).toBeInTheDocument());
  });

  it('shows a not-registered message and stays on the email step', async () => {
    vi.spyOn(authApi, 'otpRequest').mockRejectedValue(new ApiError(404, 'not_registered', 'Email is not registered.', null));
    wrap();
    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }));
    await userEvent.type(screen.getByLabelText(/^email$/i), 'nobody@x.com');
    await userEvent.click(screen.getByRole('button', { name: /send code/i }));
    await waitFor(() => expect(screen.getByText("That email isn't registered. Contact your administrator.")).toBeInTheDocument());
    expect(screen.queryByLabelText(/code/i)).not.toBeInTheDocument();
  });

  it('completes first-time setup: email → code → set password → finalize', async () => {
    vi.spyOn(authApi, 'otpRequest').mockResolvedValue({ sent: true });
    vi.spyOn(authApi, 'otpVerify').mockResolvedValue({ access_token: 'a', refresh_token: 'r' });
    const setPwSpy = vi.spyOn(authApi, 'setPassword').mockResolvedValue();
    vi.spyOn(authApi, 'me').mockResolvedValue({ id: 'u1', tenant_id: null, roles: ['owner'] });
    wrap();
    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }));
    await userEvent.type(screen.getByLabelText(/^email$/i), 'rohan@catre.io');
    await userEvent.click(screen.getByRole('button', { name: /send code/i }));
    await userEvent.type(await screen.findByLabelText(/code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify code/i }));
    await userEvent.type(await screen.findByLabelText(/new password/i), 'supersecret');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'supersecret');
    await userEvent.click(screen.getByRole('button', { name: /set password/i }));
    await waitFor(() => expect(setPwSpy).toHaveBeenCalledWith('supersecret'));
  });

  it('keeps "Set password" disabled until ≥8 chars and confirm matches', async () => {
    vi.spyOn(authApi, 'otpRequest').mockResolvedValue({ sent: true });
    vi.spyOn(authApi, 'otpVerify').mockResolvedValue({ access_token: 'a', refresh_token: 'r' });
    wrap();
    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }));
    await userEvent.type(screen.getByLabelText(/^email$/i), 'rohan@catre.io');
    await userEvent.click(screen.getByRole('button', { name: /send code/i }));
    await userEvent.type(await screen.findByLabelText(/code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify code/i }));
    const btn = await screen.findByRole('button', { name: /set password/i });
    await userEvent.type(screen.getByLabelText(/new password/i), 'short');
    expect(btn).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/new password/i), 'enough'); // now 'shortenough' ≥8
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'shortenough');
    expect(btn).toBeEnabled();
  });
});
