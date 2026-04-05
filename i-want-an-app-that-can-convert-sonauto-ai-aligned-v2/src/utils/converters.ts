
interface AlignedLyricLine {
  start: number;
  end: number;
  text: string;
}

interface AlignedLyricWord {
  start: number;
  end: number;
  word: string;
}

interface SongMetadata {
  title?: string;
  artist?: string;
  album?: string;
  length?: string;
}

// SRT time format: HH:MM:SS,mmm
function formatSRTTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

// LRC time format: [mm:ss.xx]
function formatLRCTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hundredths = Math.round(((seconds % 60) % 1) * 100);
  return `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}]`;
}

export function convertToSRT(lyrics: AlignedLyricLine[]): string {
  return lyrics
    .filter(line => line.text.trim().length > 0)
    .map((entry, index) => {
      const start = formatSRTTime(entry.start);
      const end = formatSRTTime(entry.end);
      // Preserve newlines in the text for SRT
      const text = entry.text.replace(/\\n/g, '\n');
      return `${index + 1}\n${start} --> ${end}\n${text}`;
    })
    .join('\n\n');
}

export function convertToLRCWordLevel(lyrics: AlignedLyricWord[], metadata?: SongMetadata): string {
  const metaLines = [];
  if (metadata?.title) metaLines.push(`[ti:${metadata.title}]`);
  if (metadata?.artist) metaLines.push(`[ar:${metadata.artist}]`);
  if (metadata?.album) metaLines.push(`[al:${metadata.album}]`);
  if (metadata?.length) metaLines.push(`[length:${metadata.length}]`);

  const lyricsLines = lyrics
    .filter(w => w.word.trim().length > 0)
    .map(entry => {
      const time = formatLRCTime(entry.start);
      return `${time}${entry.word}`;
    })
    .join('\n');

  return [...metaLines, lyricsLines].filter(Boolean).join('\n');
}

export function convertToLRCLineLevel(lyrics: AlignedLyricLine[], metadata?: SongMetadata): string {
  const metaLines = [];
  if (metadata?.title) metaLines.push(`[ti:${metadata.title}]`);
  if (metadata?.artist) metaLines.push(`[ar:${metadata.artist}]`);
  if (metadata?.album) metaLines.push(`[al:${metadata.album}]`);
  if (metadata?.length) metaLines.push(`[length:${metadata.length}]`);

  const lyricsLines = lyrics
    .filter(line => line.text.trim().length > 0)
    .map(entry => {
      const time = formatLRCTime(entry.start);
      const text = entry.text.replace(/\\n/g, '\n');
      return `${time}${text}`;
    })
    .join('\n');

  return [...metaLines, lyricsLines].filter(Boolean).join('\n');
}

export function parseSonautoJson(rawJson: string): {
  alignedLyrics: AlignedLyricLine[];
  wordAlignedLyrics: AlignedLyricWord[];
  metadata: SongMetadata;
} | null {
  try {
    const parsed = JSON.parse(rawJson);
    
    // Handle the nested structure - data might be at root or nested
    const data = parsed.data?.[0] ?? parsed.data ?? parsed;
    
    const alignedLyrics = data.alignedLyrics ?? data.trackParams?.alignedLyrics ?? [];
    const wordAlignedLyrics = data.wordAlignedLyrics ?? data.trackParams?.wordAlignedLyrics ?? [];
    
    const metadata: SongMetadata = {
      title: data.title ?? undefined,
      length: data.duration ? `${Math.floor(data.duration / 60)}:${String(Math.floor(data.duration % 60)).padStart(2, '0')}` : undefined,
    };

    return {
      alignedLyrics,
      wordAlignedLyrics,
      metadata,
    };
  } catch {
    return null;
  }
}

export function calculateDuration(alignedLyrics: AlignedLyricLine[]): string {
  if (alignedLyrics.length === 0) return '0:00';
  const lastEntry = alignedLyrics[alignedLyrics.length - 1];
  const totalSeconds = Math.ceil(lastEntry.end);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
