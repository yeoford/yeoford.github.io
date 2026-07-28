import { useEffect, useState } from 'react';

import { Document, Page, pdfjs } from 'react-pdf';

import { createLog } from '@helpers/log';

const log = createLog('PdfViewer');

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export const PdfViewer = ({ path }: { path: string }) => {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const maxWidth = 800;
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(maxWidth);

  useEffect(() => {
    if (!containerRef) {
      return;
    }

    const updateWidth = () => {
      const width = Math.min(containerRef.clientWidth - 32, maxWidth); // 32px for padding
      setContainerWidth(width);
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [containerRef]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }): void => {
    log.info('onDocumentLoadSuccess', { numPages });
    setNumPages(numPages);
    setError(null);
    setLoading(false);
  };

  const onError = (error: Error) => {
    log.error('onError', error);
    setError(error.message);
    setLoading(false);
  };

  const nextPage = () => {
    setPageNumber(v => v + 1);
  };

  const prevPage = () => {
    setPageNumber(v => v - 1);
  };

  const firstPage = () => {
    setPageNumber(1);
  };

  const lastPage = () => {
    setPageNumber(numPages ?? 1);
  };

  const onLoadError = (error: Error) => {
    log.error('onLoadError', error);
    setError(error.message);
    setLoading(false);
  };

  useEffect(() => {
    log.info('path', path);
    setLoading(true);
    setError(null);
  }, [path]);

  // log.info('path', path);

  return (
    <div className="flex w-full flex-col items-center p-4">
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-500">
          Error loading PDF: {error}
        </div>
      )}
      {loading && (
        <div className="mb-4 rounded-lg bg-gray-50 p-4">
          Loading PDF... (Worker: {pdfjs.version})
        </div>
      )}
      <div className="mb-4 flex gap-4">
        <button
          className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          disabled={pageNumber <= 1}
          onClick={firstPage}
        >
          First
        </button>
        <button
          className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          disabled={pageNumber <= 1}
          onClick={prevPage}
        >
          Previous
        </button>
        <button
          className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          disabled={pageNumber >= (numPages ?? -1)}
          onClick={nextPage}
        >
          Next
        </button>
        <button
          className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          disabled={pageNumber >= (numPages ?? -1)}
          onClick={lastPage}
        >
          Last
        </button>
      </div>
      <div className="flex w-full flex-1 justify-center">
        <div className="flex w-full justify-center" ref={setContainerRef}>
          <Document
            className="my-react-pdf"
            file={path}
            loading={null}
            onError={onError}
            onLoadError={onLoadError}
            onLoadSuccess={onDocumentLoadSuccess}
          >
            <Page
              pageNumber={pageNumber}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              width={containerWidth}
            />
          </Document>
        </div>
      </div>
      <p className="mt-4 text-gray-600">
        Page {pageNumber} of {numPages}
      </p>
    </div>
  );
};
