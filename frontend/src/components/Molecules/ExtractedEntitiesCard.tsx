/**
 * ExtractedEntitiesCard.tsx
 *
 * Displays key information extracted from an audio transcription:
 * - Incident type, severity, location, phones, people count,
 *   caller/victim names, date/time, and additional details.
 *
 * Used inside TranscriptionResultCard when status === 'done'.
 */

import type { ExtractedEntities } from '../../services/api';

type Props = {
    entities: ExtractedEntities;
};

// ── Severity config ────────────────────────────────────────────
const SEVERITY_CFG = {
    low:      { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', dot: '🟢', label: 'LOW' },
    medium:   { bg: '#fefce8', color: '#ca8a04', border: '#fde68a', dot: '🟡', label: 'MEDIUM' },
    high:     { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', dot: '🟠', label: 'HIGH' },
    critical: { bg: '#fff1f2', color: '#dc2626', border: '#fecaca', dot: '🔴', label: 'CRITICAL' },
};

// ── Extraction method badge ────────────────────────────────────
const METHOD_CFG: Record<string, { label: string; bg: string; color: string }> = {
    llm_anthropic:  { label: 'AI · Claude',    bg: '#f5f3ff', color: '#7c3aed' },
    llm_openai:     { label: 'AI · GPT',       bg: '#f0fdf4', color: '#16a34a' },
    rule_based:     { label: 'Rule-based',    bg: '#f8fafc', color: '#64748b' },
    'spacy+hf_local': { label: 'NLP · spaCy+AI', bg: '#eff6ff', color: '#1d4ed8' },
};

export default function ExtractedEntitiesCard({ entities }: Props) {
    const severityCfg = entities.severity ? SEVERITY_CFG[entities.severity] : null;
    const methodCfg = entities.extraction_method ? METHOD_CFG[entities.extraction_method] : null;

    // Build entity rows to display
    const rows: { icon: string; label: string; value: string; highlight?: boolean }[] = [];

    if (entities.incident_type) {
        rows.push({ icon: '🚨', label: 'Incident Type', value: entities.incident_type, highlight: true });
    }
    if (entities.location) {
        rows.push({ icon: '📍', label: 'Location', value: entities.location });
    }
    if (entities.people_count !== null && entities.people_count !== undefined) {
        rows.push({ icon: '👥', label: 'People Involved', value: String(entities.people_count) });
    }
    if (entities.phones && entities.phones.length > 0) {
        rows.push({ icon: '📞', label: 'Phone Numbers', value: entities.phones.join('  ·  ') });
    }
    if (entities.caller_name) {
        rows.push({ icon: '🧑', label: 'Caller', value: entities.caller_name });
    }
    if (entities.victim_names && entities.victim_names.length > 0) {
        rows.push({ icon: '🏥', label: 'Victims', value: entities.victim_names.join(', ') });
    }
    if (entities.time_mentioned) {
        rows.push({ icon: '🕐', label: 'Time', value: entities.time_mentioned });
    }
    if (entities.date_mentioned) {
        rows.push({ icon: '📅', label: 'Date', value: entities.date_mentioned });
    }
    if (entities.additional_details) {
        rows.push({ icon: '📝', label: 'Additional Details', value: entities.additional_details });
    }

    if (rows.length === 0) return null;

    const confidence = entities.confidence !== null && entities.confidence !== undefined
        ? Math.round(entities.confidence * 100)
        : null;

    return (
        <div style={{
            background: 'white',
            border: '1.5px solid #e2e8f0',
            borderRadius: 14,
            overflow: 'hidden',
            marginBottom: 4,
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>🔍</span>
                    <span style={{ fontWeight: 700, color: '#1a3a6b', fontSize: 15 }}>
                        Key Information Extracted
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Confidence badge */}
                    {confidence !== null && (
                        <span style={{
                            background: confidence >= 80 ? '#f0fdf4' : confidence >= 60 ? '#fefce8' : '#f8fafc',
                            color: confidence >= 80 ? '#16a34a' : confidence >= 60 ? '#ca8a04' : '#64748b',
                            border: `1px solid ${confidence >= 80 ? '#bbf7d0' : confidence >= 60 ? '#fde68a' : '#e2e8f0'}`,
                            padding: '3px 10px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                        }}>
                            {confidence}% confidence
                        </span>
                    )}

                    {/* Extraction method */}
                    {methodCfg && (
                        <span style={{
                            background: methodCfg.bg,
                            color: methodCfg.color,
                            border: `1px solid ${methodCfg.color}30`,
                            padding: '3px 10px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                        }}>
                            {methodCfg.label}
                        </span>
                    )}
                </div>
            </div>

            {/* Severity banner (full width, prominent) */}
            {severityCfg && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 20px',
                    background: severityCfg.bg,
                    borderBottom: `2px solid ${severityCfg.border}`,
                }}>
                    <span style={{ fontSize: 20 }}>{severityCfg.dot}</span>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.5px' }}>
                            SEVERITY LEVEL
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: severityCfg.color }}>
                            {severityCfg.label}
                        </div>
                    </div>
                </div>
            )}

            {/* Entity rows — 2-column grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 0,
            }}>
                {rows.map((row, i) => {
                    // Additional details spans full width
                    const isFullWidth = row.label === 'Additional Details';
                    const isLast = i === rows.length - 1;
                    const isRTL = /[\u0600-\u06FF]/.test(row.value);

                    return (
                        <div
                            key={row.label}
                            style={{
                                gridColumn: isFullWidth ? '1 / -1' : 'auto',
                                padding: '12px 20px',
                                borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
                                borderRight: !isFullWidth && i % 2 === 0 ? '1px solid #f1f5f9' : 'none',
                                background: row.highlight ? '#fffbeb' : 'white',
                            }}
                        >
                            <div style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#94a3b8',
                                letterSpacing: '0.3px',
                                marginBottom: 4,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                            }}>
                                <span>{row.icon}</span>
                                {row.label.toUpperCase()}
                            </div>
                            <div
                                dir={isRTL ? 'rtl' : 'ltr'}
                                style={{
                                    fontSize: 14,
                                    fontWeight: row.highlight ? 700 : 500,
                                    color: row.highlight ? '#92400e' : '#1e293b',
                                    lineHeight: 1.5,
                                    wordBreak: 'break-word',
                                }}
                            >
                                {row.value}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}