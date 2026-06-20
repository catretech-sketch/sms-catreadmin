import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginScreen } from './LoginScreen';
import { AuthProvider } from '../auth/AuthContext';
import { ToastHost } from '../components';
import * as authApi from '../api/auth';
import { ApiError } from '../api/client';

function wrap() {
  return render(<ToastHost><AuthProvider><LoginScreen /></AuthProvider></ToastHost>);
}

describe('LoginScreen', () => {
  it('requests an OTP then reveals the code step', async () => {
    vi.spyOn(authApi, 'otpRequest').mockResolvedValue({ sent: true });
    wrap();
    await userEvent.type(screen.getByLabelText(/email/i), 'catre.tech@gmail.com');
    await userEvent.click(screen.getByRole('button', { name: /send otp/i }));
    await waitFor(() => expect(screen.getByLabelText(/code/i)).toBeInTheDocument());
    expect(authApi.otpRequest).toHaveBeenCalledWith('catre.tech@gmail.com');
  });

  it('shows error message when OTP verify fails', async () => {
    vi.spyOn(authApi, 'otpRequest').mockResolvedValue({ sent: true });
    vi.spyOn(authApi, 'otpVerify').mockRejectedValue(new ApiError(401, 'invalid_code', 'code invalid or expired', null));
    wrap();
    await userEvent.type(screen.getByLabelText(/email/i), 'catre.tech@gmail.com');
    await userEvent.click(screen.getByRole('button', { name: /send otp/i }));
    await waitFor(() => expect(screen.getByLabelText(/code/i)).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText(/code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify/i }));
    await waitFor(() => expect(screen.getByText('code invalid or expired')).toBeInTheDocument());
  });

  it('shows "Email is not registered." and stays on the email step for an unknown email', async () => {
    // mirrors the backend: POST /auth/otp/request → 404 not_registered for unknown emails
    vi.spyOn(authApi, 'otpRequest').mockRejectedValue(
      new ApiError(404, 'not_registered', 'Email is not registered.', null));
    wrap();
    await userEvent.type(screen.getByLabelText(/email/i), 'nobody@x.com');
    await userEvent.click(screen.getByRole('button', { name: /send otp/i }));
    await waitFor(() => expect(screen.getByText('Email is not registered.')).toBeInTheDocument());
    expect(screen.queryByLabelText(/code/i)).not.toBeInTheDocument(); // no OTP step
  });

  it('does not render demo logins', () => {
    wrap();
    expect(screen.queryByText(/demo logins/i)).not.toBeInTheDocument();
  });
});
