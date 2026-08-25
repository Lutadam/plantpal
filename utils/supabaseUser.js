export function toAppUser(session) {
  if (!session?.user) return null;
  return {
    uid: session.user.id,
    email: session.user.email,
    emailVerified: !!session.user.email_confirmed_at,
  };
}
