/**
 * 入 The Supabase auth settings the game needs, as the JSON the Management API takes.
 * Run by .github/workflows/supabase.yml, which sends it with the access token.
 *
 * Guests are allowed (anonymous sign-ins), links come back to the game, and every
 * sign-in email carries a six-digit code beside the link: inside the installed app a
 * link opens the phone's browser rather than the game, so the code is what is typed.
 */
const SITE = process.env.SITE ?? 'https://hyoddougamer-dev.github.io/ninefold/';

const mail = (lead) => `
<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;background:#14110D;color:#EDE3D2;border-radius:14px">
  <p style="font-size:22px;color:#7FB495;margin:0 0 12px">九境 Ninefold</p>
  <p style="margin:0 0 16px;color:#C9BFAE">${lead}</p>
  <p style="font-size:30px;letter-spacing:.3em;font-weight:700;color:#D4AF56;margin:0 0 16px">{{ .Token }}</p>
  <p style="margin:0 0 8px;color:#9C907C">Type it in the game, or open this link on the device you play on:</p>
  <p style="margin:0"><a href="{{ .ConfirmationURL }}" style="color:#7FB495">Sign in to Ninefold</a></p>
</div>`;

process.stdout.write(JSON.stringify({
  external_anonymous_users_enabled: true,
  site_url: SITE,
  uri_allow_list: `${SITE}**,http://localhost:4173/**`,
  mailer_otp_length: 6,
  mailer_subjects_magic_link: 'Your Ninefold sign-in code',
  mailer_templates_magic_link_content: mail('Your code to sign in:'),
  mailer_subjects_confirmation: 'Your Ninefold sign-in code',
  mailer_templates_confirmation_content: mail('Your code to sign in:'),
  mailer_subjects_email_change: 'Keep your Ninefold cultivator everywhere',
  mailer_templates_email_change_content: mail('Your code to add this email to your cultivator:'),
}));
