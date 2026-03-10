

interface LogoProps {
    size?: 'small' | 'medium' | 'large';
    light?: boolean;
}

export default function Logo({ size = 'medium', light = false }: LogoProps) {
    const baseSize = size === 'small' ? 20 : size === 'large' ? 40 : 28;

    const textColor = light ? '#ffffff' : '#4a7090';

    return (
        <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 4,
            userSelect: 'none',
            cursor: 'pointer'
        }}>
            <span style={{
                fontFamily: 'var(--font-logo-ifbw)',
                fontSize: baseSize,
                fontWeight: 800,
                color: textColor,
                letterSpacing: '-1px'
            }}>
                IFBW
            </span>
            <span style={{
                fontFamily: 'var(--font-logo-innovation)',
                fontSize: baseSize * 0.7,
                color: textColor,
                opacity: 0.9
            }}>
                Innovation
            </span>
        </div>
    );
}
