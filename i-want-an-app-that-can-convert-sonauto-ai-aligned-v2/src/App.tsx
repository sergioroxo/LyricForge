

import React, { useState, useCallback } from 'react';
import { parseSonautoJson, convertToSRT, convertToLRCWordLevel, convertToLRCLineLevel, calculateDuration, type SongMetadata } from './utils/converters';
import './App.css';

type OutputMode = 'srt' | 'lrc-karaoke' | 'lrc-lyrics';

interface ParsedData {
  alignedLyrics: Array<{ start: number; end: number; text: string }>;
  wordAlignedLyrics: Array<{ start: number; end: number; word: string }>;
  metadata: SongMetadata;
}

function App() {
  const [inputText, setInputText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [outputMode, setOutputMode] = useState<OutputMode>('srt');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleParse = useCallback(() => {
    if (!inputText.trim()) return;
    
    setError('');
    const result = parseSonautoJson(inputText);
    
    if (result && result.alignedLyrics.length > 0) {
      setParsedData(result);
    } else if (result && result.wordAlignedLyrics.length > 0 && result.alignedLyrics.length === 0) {
      // Handle case where only word-aligned is present
      setParsedData({
        alignedLyrics: [],
        wordAlignedLyrics: result.wordAlignedLyrics,
        metadata: result.metadata,
      });
    } else {
      setError('Could not parse the JSON data. Please check the format and try again.');
      setParsedData(null);
    }
  }, [inputText]);

  const getOutput = useCallback((): string => {
    if (!parsedData) return '';
    
    switch (outputMode) {
      case 'srt':
        return parsedData.alignedLyrics.length > 0 
          ? convertToSRT(parsedData.alignedLyrics)
          : '// No line-level lyrics available for SRT';
      case 'lrc-karaoke':
        return parsedData.wordAlignedLyrics.length > 0 
          ? convertToLRCWordLevel(parsedData.wordAlignedLyrics, parsedData.metadata)
          : '// No word-level lyrics available for Karaoke LRC';
      case 'lrc-lyrics':
        return parsedData.alignedLyrics.length > 0 
          ? convertToLRCLineLevel(parsedData.alignedLyrics, parsedData.metadata)
          : '// No line-level lyrics available for LRC';
    }
  }, [parsedData, outputMode]);

  const handleCopy = useCallback(async () => {
    const output = getOutput();
    if (output) {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [getOutput]);

  const handleDownload = useCallback(() => {
    const output = getOutput();
    if (!output || !parsedData) return;
    
    const extension = outputMode === 'srt' ? 'srt' : 'lrc';
    const title = parsedData.metadata.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'song';
    const filename = `${title}.${extension}`;
    
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [getOutput, outputMode, parsedData]);

  const lineCount = parsedData?.alignedLyrics.filter(l => l.text.trim()).length ?? 0;
  const wordCount = parsedData?.wordAlignedLyrics.filter(w => w.word.trim()).length ?? 0;
  const duration = parsedData?.alignedLyrics ? calculateDuration(parsedData.alignedLyrics) : '--';

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">🔥</div>
            <div>
              <h1>LyricForge</h1>
              <p className="subtitle">Forge raw Sonauto data into synced subtitles & lyrics</p>
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        <section className="input-section">
          <div className="section-header">
            <h2>
              <span className="section-icon">📋</span>
              Paste JSON Data
            </h2>
            <span className="hint">From DevTools Network tab</span>
          </div>
          <textarea
            className="json-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Paste your Sonauto.AI JSON here...\n\nExample: {"data":[{"alignedLyrics":[...],"wordAlignedLyrics":[...],...}]}`}
            spellCheck={false}
          />
          {error && (
            <div className="error-banner">
              <span className="error-icon">⚠</span>
              {error}
            </div>
          )}
          <div className="actions">
            <button className="btn btn-primary" onClick={handleParse} disabled={!inputText.trim()}>
              <span className="btn-icon">⚡</span>
              Forge It
            </button>
            {parsedData && (
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setInputText('');
                  setParsedData(null);
                  setError('');
                }}
              >
                Clear
              </button>
            )}
          </div>
        </section>

        {parsedData && (
          <>
            <div className="stats-bar">
              <div className="stat">
                <span className="stat-value">{lineCount}</span>
                <span className="stat-label">Lines</span>
              </div>
              <div className="stat">
                <span className="stat-value">{wordCount}</span>
                <span className="stat-label">Words</span>
              </div>
              <div className="stat">
                <span className="stat-value">{duration}</span>
                <span className="stat-label">Duration</span>
              </div>
              {parsedData.metadata.title && (
                <div className="stat stat-title">
                  <span className="stat-label">Title:</span>
                  <span className="stat-value">{parsedData.metadata.title}</span>
                </div>
              )}
            </div>

            <section className="output-section">
              <div className="tabs">
                <button
                  className={`tab ${outputMode === 'srt' ? 'active' : ''}`}
                  onClick={() => setOutputMode('srt')}
                >
                  <span className="tab-icon">🎬</span>
                  <span className="tab-label">SRT</span>
                  <span className="tab-desc">Subtitle</span>
                </button>
                <button
                  className={`tab ${outputMode === 'lrc-karaoke' ? 'active' : ''}`}
                  onClick={() => setOutputMode('lrc-karaoke')}
                >
                  <span className="tab-icon">🎤</span>
                  <span className="tab-label">LRC Karaoke</span>
                  <span className="tab-desc">Word-level</span>
                </button>
                <button
                  className={`tab ${outputMode === 'lrc-lyrics' ? 'active' : ''}`}
                  onClick={() => setOutputMode('lrc-lyrics')}
                >
                  <span className="tab-icon">📝</span>
                  <span className="tab-label">LRC Lyrics</span>
                  <span className="tab-desc">Line-level</span>
                </button>
              </div>

              <div className="output-container">
                <div className="output-header">
                  <span className="format-badge">
                    {outputMode === 'srt' ? '.srt' : '.lrc'}
                  </span>
                  <span className="mode-label">
                    {outputMode === 'srt' && 'Standard Subtitle Format'}
                    {outputMode === 'lrc-karaoke' && 'Karaoke - Synced per word'}
                    {outputMode === 'lrc-lyrics' && 'Lyrics - Synced per line'}
                  </span>
                </div>
                <pre className="output-display">{getOutput()}</pre>
                <div className="output-actions">
                  <button className="btn btn-copy" onClick={handleCopy}>
                    <span className="btn-icon">{copied ? '✓' : '📋'}</span>
                    {copied ? 'Copied!' : 'Copy to Clipboard'}
                  </button>
                  <button className="btn btn-download" onClick={handleDownload}>
                    <span className="btn-icon">⬇</span>
                    Download File
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="footer">
        <p>Built for the music community • Paste → Convert → Download</p>
      </footer>
    </div>
  );
}

export default App;
