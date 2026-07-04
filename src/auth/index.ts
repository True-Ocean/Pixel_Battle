export { ensureAnonymousUserId } from './anonymous';
export {
  assertEmailAllowedOnDevice,
  clearDeviceLinkedEmail,
  getDeviceLinkedEmail,
  rememberDeviceLinkedEmail,
} from './deviceLinkedEmail';
export {
  linkEmailToCurrentUser,
  signInWithEmailMagicLink,
  signOutAccount,
  unlinkAccountFromDevice,
  syncDeviceLinkedEmailFromUser,
  describeAuthUser,
  isValidEmail,
  normalizeEmailInput,
  formatAuthError,
} from './emailLink';
export { getAuthRedirectUrl } from './redirectUrl';
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
