/**
 * 入 The Supabase auth settings the game needs, as the JSON the Management API takes.
 * Run by .github/workflows/supabase.yml, which sends it with the access token.
 *
 * Guests are allowed (anonymous sign-ins) and links come back to the game. The `mail`
 * half puts a six-digit code beside the link, because inside the installed app a link
 * opens the phone's browser rather than the game (Jerokhna found it on the first day).
 * Supabase refuses custom wording on the free plan without a mail server of our own, so
 * the `mail` half carries that server too, once it exists: the SMTP_PASS secret and the
 * SMTP_SENDER variable (an address on a domain the mail service has verified). The host,
 * port and user default to Resend's; SMTP_HOST, SMTP_PORT and SMTP_USER change them.
 * Without both, the email stays a link only, exactly as before.
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

// `core` is what the game cannot sign anybody in without; `mail` is the wording of the
// emails. The workflow sends them apart, so a refused template never holds up a guest.
const core = {
  external_anonymous_users_enabled: true,
  site_url: SITE,
  // 盾 Only the game's own address. A local preview had a place on this list, and a
  // sign-in link has no business landing anywhere a published game is not.
  uri_allow_list: `${SITE}**`,
  mailer_otp_length: 6,
  // 盾 Guests one address may make in an hour. A guest is an account a tap away, and the
  // default let a script make thirty an hour from one machine. Ten is more than a family
  // on one wifi will ever use.
  rate_limit_anonymous_users: 10,
  // 盾 hCaptcha on every sign-in, once both halves exist: the secret here and the site key
  // the game is built with (HCAPTCHA_SITEKEY). One without the other would lock every
  // guest out, so the workflow passes the secret only when it has both.
  ...(process.env.HCAPTCHA_SECRET
    ? { security_captcha_enabled: true, security_captcha_provider: 'hcaptcha', security_captcha_secret: process.env.HCAPTCHA_SECRET }
    : { security_captcha_enabled: false }),
};
const mailer = {
  mailer_subjects_magic_link: 'Your Ninefold sign-in code',
  mailer_templates_magic_link_content: mail('Your code to sign in:'),
  mailer_subjects_confirmation: 'Your Ninefold sign-in code',
  mailer_templates_confirmation_content: mail('Your code to sign in:'),
  mailer_subjects_email_change: 'Keep your Ninefold cultivator everywhere',
  mailer_templates_email_change_content: mail('Your code to add this email to your cultivator:'),
};

// 郵 The mail server, only when both halves are there; half of one would stop every email.
const smtp = process.env.SMTP_PASS && process.env.SMTP_SENDER ? {
  smtp_admin_email: process.env.SMTP_SENDER,
  smtp_sender_name: 'Ninefold',
  smtp_host: process.env.SMTP_HOST || 'smtp.resend.com',
  smtp_port: process.env.SMTP_PORT || '465',
  smtp_user: process.env.SMTP_USER || 'resend',
  smtp_pass: process.env.SMTP_PASS,
} : {};

const part = process.argv[2];
process.stdout.write(JSON.stringify(part === 'core' ? core : part === 'mail' ? { ...smtp, ...mailer } : { ...core, ...smtp, ...mailer }));
