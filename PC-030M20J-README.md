# PC-030M20J — Returning User Profile Routing

This patch makes the authenticated server profile authoritative at startup.

- Returning users with an existing cloud investor profile go directly to the dashboard.
- Cloud profiles are restored into the authenticated user namespace on fresh devices and TestFlight installations.
- Only a confirmed missing profile starts onboarding.
- A temporary profile-service failure no longer misclassifies a returning user as new.
- New registrations continue through the existing onboarding journey.

## Verify

From `mobile`:

```bash
bash scripts/verify-pc030m20j-returning-user-profile-routing.sh
npx expo start --clear --lan
```
