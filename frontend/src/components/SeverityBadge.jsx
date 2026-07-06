const SEVERITY_STYLES = {
  low: { bg: '#4CAF50', label: 'Low Severity' },
  mild: { bg: '#FFA726', label: 'Mild Severity' },
  high: { bg: '#E53935', label: 'High Severity' },
};

export default function SeverityBadge({ tier }) {
  const style = SEVERITY_STYLES[(tier || '').toLowerCase()] || {
    bg: '#888',
    label: 'Unknown',
  };

  return (
    <span
      style={{
        display: 'inline-block',
        background: style.bg,
        color: 'white',
        padding: '4px 12px',
        borderRadius: '999px',
        fontSize: '13px',
        fontWeight: 600,
        letterSpacing: '0.3px',
      }}
    >
      {style.label}
    </span>
  );
}