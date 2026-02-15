import { Router } from 'express';
import { validateBody, asyncHandler } from '../../common/validate';
import * as authController from './auth.controller';
import {
  RegisterDto,
  VerifyEmailDto,
  LoginDto,
  VerifyOtpDto,
  RefreshDto,
  LogoutDto,
  PasswordRecoveryDto,
  PasswordResetDto,
} from './auth.dto';

const router = Router();

router.post('/register', validateBody(RegisterDto), asyncHandler(authController.register));
router.get('/verify-email', asyncHandler(authController.verifyEmailGet));
router.post('/verify-email', validateBody(VerifyEmailDto), asyncHandler(authController.verifyEmail));
router.post('/login', validateBody(LoginDto), asyncHandler(authController.login));
router.post('/verify-otp', validateBody(VerifyOtpDto), asyncHandler(authController.verifyOtp));
router.post('/refresh', validateBody(RefreshDto), asyncHandler(authController.refresh));
router.post('/logout', validateBody(LogoutDto), asyncHandler(authController.logout));
router.post('/password-recovery', validateBody(PasswordRecoveryDto), asyncHandler(authController.passwordRecovery));
router.post('/password-reset', validateBody(PasswordResetDto), asyncHandler(authController.passwordReset));

export default router;
