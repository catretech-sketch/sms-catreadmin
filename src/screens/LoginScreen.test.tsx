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

  it('does not render demo logins', () => {
    wrap();
    expect(screen.queryByText(/demo logins/i)).not.toBeInTheDocument();
  });
});
