export { ensureAnonymousUserId } from './anonymous';
export {
  assertEmailAllowedOnDevice,
  clearDeviceLinkedEmail,
  getDeviceLinkedEmail,
  rememberDeviceLinkedEmail,
} from './deviceLinkedEmail';
export {
  linkEmailToCurrentUser,
  signInWithEmailPassword,
  signOutAccount,
  unlinkAccountFromDevice,
  syncDeviceLinkedEmailFromUser,
  describeAuthUser,
  isValidEmail,
  isValidPassword,
  normalizeEmailInput,
  formatAuthError,
  MIN_PASSWORD_LENGTH,
} from './emailLink';
export {
  getAccountLinkStatus,
  getAuthSession,
  getAuthUser,
  isAnonymousUser,
  isEmailLinkedUser,
  resolveAccountEmail,
  subscribeAuthState,
} from './session';
export type {
  AccountLinkStatus,
  AuthActionResult,
  AuthFailReason,
} from './types';
