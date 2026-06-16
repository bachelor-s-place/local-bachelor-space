import Link from 'next/link';

/**
 * BrandLogo renders the "BachelorsSpace." wordmark as a link home, matching the
 * gradient treatment used on the auth screens. Use it on full-screen "portal" pages
 * (onboarding, landlord/admin shells) that don't render the global marketing navbar.
 */
export default function BrandLogo({
  size = '1.5rem',
  href = '/',
  style,
}: {
  size?: string;
  href?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Link
      href={href}
      aria-label="BachelorsSpace home"
      style={{
        fontSize: size,
        fontWeight: 700,
        letterSpacing: '-0.04em',
        fontFamily: 'var(--font-inter), sans-serif',
        background: 'linear-gradient(135deg, #ffffff 0%, #a5c7f0 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        textDecoration: 'none',
        display: 'inline-block',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      BachelorsSpace.
    </Link>
  );
}
