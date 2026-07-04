export { ensureAnonymousUserId } from './anonymous';
export {
  linkEmailToCurrentUser,
  signInWithEmailMagicLink,
  signOutAccount,
  describeAuthUser,
  isValidEmail,
  normalizeEmailInput,
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
