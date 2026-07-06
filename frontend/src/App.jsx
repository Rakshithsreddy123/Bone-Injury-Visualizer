import { useState } from 'react';
import SkeletonViewer from './components/SkeletonViewer';
import SeverityBadge from './components/SeverityBadge';
import { analyzeReportFile, analyzeReportText } from './api';

function App() {
  const [result, setResult] = useState(null);
  const [reportText, setReportText] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('patient'); // 'patient' | 'doctor'
  const [inputMode, setInputMode] = useState('upload'); // 'upload' | 'paste'

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const data = await analyzeReportFile(file);
      setReportText(data.report_text || '');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pastedText.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const data = await analyzeReportText(pastedText);
      setReportText(data.report_text || pastedText);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setReportText('');
    setPastedText('');
    setError(null);
  };

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: '#0d0d0d' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        borderBottom: '1px solid #2a2a2a',
        color: 'white',
      }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>Bone Injury Visualizer</h2>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {result && (
            <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid #444' }}>
              <button
                onClick={() => setView('patient')}
                style={{
                  padding: '6px 16px',
                  background: view === 'patient' ? '#FFA726' : 'transparent',
                  color: view === 'patient' ? '#000' : '#ccc',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Patient View
              </button>
              <button
                onClick={() => setView('doctor')}
                style={{
                  padding: '6px 16px',
                  background: view === 'doctor' ? '#FFA726' : 'transparent',
                  color: view === 'doctor' ? '#000' : '#ccc',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Doctor View
              </button>
            </div>
          )}

          {!result && (
            <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid #444' }}>
              <button
                onClick={() => setInputMode('upload')}
                style={{
                  padding: '6px 14px',
                  background: inputMode === 'upload' ? '#2a2a2a' : 'transparent',
                  color: '#ccc',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Upload File
              </button>
              <button
                onClick={() => setInputMode('paste')}
                style={{
                  padding: '6px 14px',
                  background: inputMode === 'paste' ? '#2a2a2a' : 'transparent',
                  color: '#ccc',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Paste Text
              </button>
            </div>
          )}

          {!result && inputMode === 'upload' && (
            <label style={{
              padding: '6px 16px',
              background: '#2a2a2a',
              color: 'white',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}>
              Choose .txt or .pdf
              <input type="file" accept=".txt,.pdf" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>
          )}

          {result && (
            <label style={{
              padding: '6px 16px',
              background: '#2a2a2a',
              color: 'white',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}>
              Upload another
              <input type="file" accept=".txt,.pdf" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>
          )}

          {result && (
            <button
              onClick={handleReset}
              style={{
                padding: '6px 16px',
                background: 'transparent',
                color: '#ccc',
                border: '1px solid #444',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: result ? (view === 'doctor' ? '60% 40%' : '70% 30%') : '1fr',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        {/* 3D viewer */}
        <div style={{ position: 'relative', minWidth: 0 }}>
          <SkeletonViewer
            highlightedBones={result?.viewer?.bones}
            color={result?.viewer?.color}
            hasFracture={result?.viewer?.has_fracture}
            hasSwelling={result?.viewer?.has_swelling}
            structure={result?.extraction?.structure}
          />

          {loading && (
            <div style={overlayCenterStyle}>Analyzing report...</div>
          )}
          {error && (
            <div style={{ ...overlayCenterStyle, color: '#E53935' }}>{error}</div>
          )}
          {!result && !loading && !error && inputMode === 'upload' && (
            <div style={overlayCenterStyle}>Upload an MRI report to begin</div>
          )}
          {!result && !loading && inputMode === 'paste' && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '480px',
              maxWidth: '90%',
              background: 'rgba(20,20,20,0.9)',
              padding: '20px',
              borderRadius: '10px',
              border: '1px solid #333',
            }}>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste the MRI/radiology report text here..."
                style={{
                  width: '100%',
                  height: '220px',
                  background: '#1a1a1a',
                  color: '#eee',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
              <button
                onClick={handlePasteSubmit}
                disabled={!pastedText.trim()}
                style={{
                  marginTop: '10px',
                  padding: '8px 20px',
                  background: pastedText.trim() ? '#FFA726' : '#555',
                  color: pastedText.trim() ? '#000' : '#999',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: pastedText.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                Analyze Report
              </button>
            </div>
          )}
          {result && !loading && !error && (!result.viewer?.bones || result.viewer.bones.length === 0) && (
            <div style={overlayCenterStyle}>
              3D highlight not available for this body region yet
            </div>
          )}
        </div>

        {/* Side panel */}
        {result && (
          <div style={{
            padding: '20px',
            color: 'white',
            overflowY: 'auto',
            borderLeft: '1px solid #2a2a2a',
            minWidth: 0,
          }}>
            <div style={{ marginBottom: '16px' }}>
              <SeverityBadge tier={result.extraction.severity_tier} />
            </div>

            {view === 'patient' ? (
              <>
                <h3 style={{ marginTop: 0, fontSize: '15px' }}>What this means</h3>
                <p style={{ lineHeight: 1.6, color: '#ddd', fontSize: '13px' }}>{result.explanation}</p>
                <p style={{ fontSize: '11px', color: '#888', marginTop: '24px' }}>
                  This visualization is for educational purposes only and does not replace
                  professional medical advice. Please discuss your results with your doctor.
                </p>
              </>
            ) : (
              <>
                <h3 style={{ marginTop: 0, fontSize: '15px' }}>Extracted Findings</h3>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                  <tbody>
                    {Object.entries(result.extraction).map(([key, value]) => (
                      <tr key={key} style={{ borderBottom: '1px solid #2a2a2a' }}>
                        <td style={{ padding: '6px 0', color: '#888', textTransform: 'capitalize' }}>
                          {key.replace('_', ' ')}
                        </td>
                        <td style={{ padding: '6px 0', textAlign: 'right' }}>{String(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h3 style={{ fontSize: '15px' }}>Highlighted Bones</h3>
                <p style={{ fontSize: '12px', color: '#ccc' }}>
                  {result.viewer.bones?.join(', ') || 'None matched'}
                </p>

                <h3 style={{ fontSize: '15px' }}>Original Report</h3>
                <pre style={{
                  fontSize: '11px',
                  color: '#aaa',
                  whiteSpace: 'pre-wrap',
                  background: '#1a1a1a',
                  padding: '12px',
                  borderRadius: '6px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                }}>
                  {reportText}
                </pre>

                <p style={{ fontSize: '11px', color: '#888', marginTop: '20px' }}>
                  This tool provides AI-assisted extraction and visualization to support
                  clinical review. It is not a diagnostic system and does not replace
                  radiologist interpretation or clinical judgment.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const overlayCenterStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  color: '#888',
  fontSize: '14px',
  pointerEvents: 'none',
};

export default App;