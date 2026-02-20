import { Router } from 'express';
import { validateBody, asyncHandler } from '../../common/validate';
import { requireAuth } from '../../common/middleware/auth';
import { uploadUserAvatar } from '../../common/upload';
import * as authController from './auth.controller';
import {
  RegisterDto,
  VerifyEmailDto,
  LoginDto,
  SendLoginOtpDto,
  VerifyOtpDto,
  RefreshDto,
  LogoutDto,
  PasswordRecoveryDto,
  PasswordResetDto,
  UpdateProfileDto,
  RequestEmailChangeDto,
  VerifyNewEmailDto,
} from './auth.dto';

const router = Router();

/** Perfil del usuario logueado (pantalla Cuenta). Requiere Authorization: Bearer <accessToken>. */
router.get('/me', requireAuth as any, asyncHandler(authController.getMe));
/** Actualizar perfil (nombres, apellidos, domicilio, región, comuna, avatarUrl). */
router.patch('/me', requireAuth as any, validateBody(UpdateProfileDto), asyncHandler(authController.updateMe));
/** Subir avatar (imagen de perfil). multipart/form-data con campo "file". Máx 3MB; jpeg, png, gif, webp. */
router.post(
  '/me/avatar',
  requireAuth as any,
  (req: any, res: any, next: any) => {
    uploadUserAvatar(req, res, (err: unknown) => {
      if (err) {
        return res.status(400).json({
          success: false,
          error: 'UPLOAD_ERROR',
          message: err instanceof Error ? err.message : 'Error al subir la imagen.',
        });
      }
      next();
    });
  },
  asyncHandler(authController.uploadAvatar)
);
/** Solicitar cambio de correo: envía token al nuevo email. Tras verificar, el usuario debe cerrar sesión y loguearse con el nuevo correo. */
router.post(
  '/me/request-email-change',
  requireAuth as any,
  validateBody(RequestEmailChangeDto),
  asyncHandler(authController.requestEmailChange)
);

router.post('/register', validateBody(RegisterDto), asyncHandler(authController.register));
router.get('/verify-email', asyncHandler(authController.verifyEmailGet));
router.post('/verify-email', validateBody(VerifyEmailDto), asyncHandler(authController.verifyEmail));
router.get('/verify-new-email', asyncHandler(authController.verifyNewEmailGet));
router.post('/verify-new-email', validateBody(VerifyNewEmailDto), asyncHandler(authController.verifyNewEmail));
router.post('/login', validateBody(LoginDto), asyncHandler(authController.login));
/** Endpoint explícito para solicitar OTP por correo (recomendado para Flutter). */
router.post('/send-login-otp', validateBody(SendLoginOtpDto), asyncHandler(authController.sendLoginOtp));
router.post('/verify-otp', validateBody(VerifyOtpDto), asyncHandler(authController.verifyOtp));
router.post('/refresh', validateBody(RefreshDto), asyncHandler(authController.refresh));
router.post('/logout', validateBody(LogoutDto), asyncHandler(authController.logout));
router.post('/password-recovery', validateBody(PasswordRecoveryDto), asyncHandler(authController.passwordRecovery));
router.post('/password-reset', validateBody(PasswordResetDto), asyncHandler(authController.passwordReset));

export default router;
