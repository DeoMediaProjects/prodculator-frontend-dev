import { Box, Container, Typography, Button } from '@mui/material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { PageHeader } from '@/app/components/common/PageHeader';
import { SiteFooter } from '@/app/components/common/SiteFooter';
import { useCookieConsent } from '@/app/cookies/CookieConsentProvider';

/**
 * Every row below was read off the code, not drafted from a template. The cookie
 * names come from app/core/auth_cookies.py, the storage keys from the registry in
 * src/app/cookies/consent.ts, and the lifetimes from the JWT settings. If a row here
 * cannot be traced to something the Platform actually sets, it does not belong on
 * this page: a policy that lists cookies we do not set is a false statement about
 * our own product, and one that omits cookies we do set is worse.
 */

interface Row {
  name: string;
  provider: string;
  purpose: string;
  expiry: string;
}

const ESSENTIAL: Row[] = [
  {
    name: 'pc_access_token',
    provider: 'Prodculator (first party)',
    purpose:
      'Proves you are signed in on each request. Stored httpOnly, so scripts running in the page cannot read it.',
    expiry: '1 hour',
  },
  {
    name: 'pc_refresh_token',
    provider: 'Prodculator (first party)',
    purpose:
      'Lets your session continue without signing in again each hour. Also httpOnly. Cleared when you sign out.',
    expiry: '14 days',
  },
  {
    name: 'pc_csrf_token',
    provider: 'Prodculator (first party)',
    purpose:
      'Protects against cross-site request forgery. Readable by our own code, which echoes it back in a header so the server can confirm a request came from our site rather than another one.',
    expiry: 'Matches your session',
  },
  {
    name: 'prodculator_admin_session',
    provider: 'Prodculator (first party)',
    purpose:
      'Browser storage, not a cookie. A single flag marking the current tab as an administrator session, so the interface knows which sign-in to renew. Only set if you sign in to the admin area.',
    expiry: 'Until you sign out',
  },
  {
    name: 'pc_cookie_consent',
    provider: 'Prodculator (first party)',
    purpose:
      'Records the choice you make on the cookie banner. Without it we would have to ask you on every page.',
    expiry: '6 months',
  },
];

const FUNCTIONAL: Row[] = [
  {
    name: 'prodculator-theme-mode',
    provider: 'Prodculator (first party)',
    purpose: 'Remembers whether you chose the light or dark interface.',
    expiry: 'Until cleared',
  },
  {
    name: 'prodculator-sidebar-collapsed, prodculator-admin-sidebar-collapsed',
    provider: 'Prodculator (first party)',
    purpose: 'Remembers whether you collapsed the navigation sidebar.',
    expiry: 'Until cleared',
  },
  {
    name: 'prodculator-profile, prodculator-avatar',
    provider: 'Prodculator (first party)',
    purpose:
      'Caches your display name, country and profile image so the interface can render them before the server responds. The authoritative copy lives in your account, not here.',
    expiry: 'Until cleared',
  },
  {
    name: 'prodculator-email-notifs',
    provider: 'Prodculator (first party)',
    purpose: 'Remembers which email notification switches you set on the account page.',
    expiry: 'Until cleared',
  },
  {
    name: 'prodculator-notifs-read, prodculator-notifs-dismissed',
    provider: 'Prodculator (first party)',
    purpose: 'Remembers which in-app notifications you have already read or dismissed.',
    expiry: 'Until cleared',
  },
  {
    name: 'pc_tutorial_seen, pc_wizard_tour_seen, pc_wizard_finish_seen, pc_bi_tour_seen, pc_dashboard_visited',
    provider: 'Prodculator (first party)',
    purpose:
      'Records which walkthroughs you have already been shown, so they are not repeated at you.',
    expiry: 'Until cleared',
  },
  {
    name: 'user_country, prodculator_intro_played',
    provider: 'Prodculator (first party)',
    purpose:
      'Held for the current tab only: your detected country, used to show prices in the right currency, and whether the intro animation has already played.',
    expiry: 'Until you close the tab',
  },
];

export function CookiePolicy() {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const { reopen, consent } = useCookieConsent();

  const table = (rows: Row[]) => (
    <Box
      sx={{
        border: `1px solid ${t.border}`,
        borderRadius: 2,
        overflow: 'hidden',
        mb: 4,
      }}
    >
      {rows.map((row, i) => (
        <Box
          key={row.name}
          sx={{
            p: 2.5,
            borderTop: i === 0 ? 'none' : `1px solid ${t.border}`,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.1fr 2fr 0.7fr' },
            gap: { xs: 1, md: 2.5 },
            alignItems: 'start',
          }}
        >
          <Box>
            <Typography sx={{ color: t.textPrimary, fontWeight: 700, fontSize: 13.5, wordBreak: 'break-word' }}>
              {row.name}
            </Typography>
            <Typography sx={{ color: t.textFaint, fontSize: 12, mt: 0.5 }}>
              {row.provider}
            </Typography>
          </Box>
          <Typography sx={{ color: t.textSecondary, fontSize: 13.5, lineHeight: 1.65 }}>
            {row.purpose}
          </Typography>
          <Typography sx={{ color: t.textSecondary, fontSize: 13, fontWeight: 600 }}>
            {row.expiry}
          </Typography>
        </Box>
      ))}
    </Box>
  );

  return (
    <Box sx={{ bgcolor: t.pageBg, minHeight: '100dvh' }}>
      <PageHeader />
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, color: t.gold }}>
          Cookie Policy
        </Typography>
        <Typography variant="body2" sx={{ color: t.textSecondary, mb: 6 }}>
          Last Updated: 10 August 2026
        </Typography>

        <Box
          sx={{
            '& h4': { color: t.gold, fontWeight: 700, mt: 5, mb: 2 },
            '& p': { color: t.textPrimary, mb: 2, lineHeight: 1.8 },
            '& ul': { color: t.textPrimary, mb: 2, pl: 3 },
            '& li': { mb: 1 },
          }}
        >
          <Typography variant="h4">1. What this policy covers</Typography>
          <Typography>
            This policy explains what Prodculator (operated by Deo Media Limited) stores
            on your device, why, and how you control it. It covers cookies and the
            equivalent browser storage the Platform uses. The law here concerns storing
            information on your device rather than the word &ldquo;cookie&rdquo;
            specifically, so browser storage is listed and treated exactly as cookies
            are.
          </Typography>
          <Typography>
            It sits alongside our{' '}
            <Box component="a" href="/privacy" sx={{ color: t.gold, fontWeight: 600 }}>
              Privacy Policy
            </Box>
            , which explains what we do with personal data more broadly.
          </Typography>

          <Typography variant="h4">2. What we do not do</Typography>
          <Typography>
            We do not use advertising cookies. We do not use analytics or tracking
            cookies. We do not run third-party tracking scripts, advertising pixels,
            or session-recording tools, and we do not sell or share what is stored on
            your device with anyone for marketing or profiling.
          </Typography>
          <Typography>
            This is stated plainly because it determines how short the rest of this
            page is. If that ever changes, we will ask for your consent again before
            the new category is used, rather than relying on a choice you made about a
            different set of cookies.
          </Typography>

          <Typography variant="h4">3. Strictly necessary</Typography>
          <Typography>
            These are required for the Platform to work and to keep your account
            secure. They are set when you sign in, or when you make a choice on the
            cookie banner, and they are not optional: without them we cannot keep you
            signed in or protect your account from cross-site attacks. You can still
            block them in your browser, but the Platform will not be usable if you do.
          </Typography>
          {table(ESSENTIAL)}

          <Typography variant="h4">4. Preferences</Typography>
          <Typography>
            These remember how you like the interface set up. They are only stored if
            you allow them, they are stored on your device rather than sent to us as a
            tracking signal, and refusing them costs you nothing except that these
            small conveniences reset. Every feature of the Platform works either way.
          </Typography>
          {table(FUNCTIONAL)}

          <Typography variant="h4">5. Third parties</Typography>
          <Typography>
            Three third parties are involved in running the Platform. None of them
            places a tracking cookie on Prodculator through us:
          </Typography>
          <ul>
            <li>
              <strong>Stripe</strong> handles payments. When you start a purchase you
              are taken to Stripe&rsquo;s own checkout page, where Stripe sets its own
              cookies under its own domain and policy. We do not run Stripe&rsquo;s
              scripts on our pages.
            </li>
            <li>
              <strong>Google (Firebase Authentication)</strong> is used only if you
              choose &ldquo;Sign in with Google&rdquo;. That opens a Google sign-in
              window, where Google applies its own cookies and policy. Nothing from
              Google is loaded for this purpose unless you choose that option.
            </li>
            <li>
              <strong>Google Fonts</strong> serves the typeface used across the site.
              Loading a font sends your IP address and browser details to Google as
              part of the request. Google Fonts does not set cookies, but the request
              itself is a third-party connection and we would rather name it than
              leave it unmentioned.
            </li>
          </ul>

          <Typography variant="h4">6. Changing your mind</Typography>
          <Typography>
            You can change your choice at any time, and withdrawing permission is as
            easy as giving it. Use the button below, or the &ldquo;Cookie
            preferences&rdquo; link in the footer of any page. When you turn
            preferences off, anything already stored under that category is deleted
            immediately rather than left in place.
          </Typography>
          <Typography>
            Your browser settings also let you block or delete cookies for this site
            directly. Blocking the strictly necessary ones will stop sign-in working.
          </Typography>

          <Box sx={{ my: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <Button
              variant="contained"
              onClick={reopen}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', px: 3, py: 1.1 }}
            >
              Change cookie preferences
            </Button>
            {consent && (
              <Typography sx={{ color: t.textFaint, fontSize: 13 }}>
                Your current choice: preferences are{' '}
                <Box component="span" sx={{ fontWeight: 700, color: t.textSecondary }}>
                  {consent.functional ? 'allowed' : 'refused'}
                </Box>
                {consent.decidedAt
                  ? `, set on ${new Date(consent.decidedAt).toLocaleDateString()}`
                  : ''}
                .
              </Typography>
            )}
          </Box>

          <Typography variant="h4">7. How long we keep your choice</Typography>
          <Typography>
            Your decision is remembered for six months, after which we ask again. We
            also ask again if we add a new category of storage, because a choice you
            made about one set of cookies is not a choice about a different one.
          </Typography>

          <Typography variant="h4">8. Contact</Typography>
          <Typography>
            Questions about this policy can go to support@prodculator.com. Deo Media
            Limited is registered in England &amp; Wales, Company No. 15426752,
            registered office Springhead Road, Northfleet, Kent, DA11 8HN.
          </Typography>
        </Box>
      </Container>
      <SiteFooter />
    </Box>
  );
}
