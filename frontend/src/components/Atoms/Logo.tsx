

import logo from '../../assets/Logo.png';

interface LogoProps {
    size?: 'small' | 'medium' | 'large';
    light?: boolean;
}

export default function Logo({ size = 'medium', light = false }: LogoProps) {
    const height = size === 'small' ? 85 : size === 'large' ? 100 : 70;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            userSelect: 'none'
        }}>
            <img
                src={logo}
                alt="Percepta Logo"
                style={{
                    height: height,
                    width: 'auto',
                    objectFit: 'contain',
                    filter: light ? 'brightness(0) invert(1)' : 'none'
                }}
            />
        </div>
    );
}

