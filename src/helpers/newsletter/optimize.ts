import { spawn } from 'node:child_process';

export const optimizeWithGhostscript = async (
  sourcePath: string,
  destinationPath: string
) => {
  const arguments_ = [
    '-q',
    '-dSAFER',
    '-dBATCH',
    '-dNOPAUSE',
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.7',
    '-dEmbedAllFonts=true',
    '-dSubsetFonts=true',
    '-dCompressFonts=true',
    '-dDownsampleColorImages=true',
    '-dColorImageDownsampleType=/Bicubic',
    '-dColorImageResolution=150',
    '-dColorImageDownsampleThreshold=1.0',
    '-dDownsampleGrayImages=true',
    '-dGrayImageDownsampleType=/Bicubic',
    '-dGrayImageResolution=150',
    '-dGrayImageDownsampleThreshold=1.0',
    '-dDownsampleMonoImages=true',
    '-dMonoImageDownsampleType=/Subsample',
    '-dMonoImageResolution=300',
    '-dMonoImageDownsampleThreshold=1.0',
    `-sOutputFile=${destinationPath}`,
    sourcePath
  ];

  await new Promise<void>((resolve, reject) => {
    const ghostscript = spawn('gs', arguments_, {
      stdio: ['ignore', 'ignore', 'pipe']
    });
    let stderr = '';

    ghostscript.stderr.setEncoding('utf8');
    ghostscript.stderr.on('data', chunk => {
      stderr += chunk;
    });
    ghostscript.on('error', error => {
      reject(
        new Error(
          error.message.includes('ENOENT')
            ? 'Ghostscript is required to add a Village Voice Issue; install gs and try again'
            : `Ghostscript failed to start: ${error.message}`,
          { cause: error }
        )
      );
    });
    ghostscript.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `Ghostscript exited with code ${code}${stderr ? `: ${stderr.trim()}` : ''}`
          )
        );
      }
    });
  });
};
