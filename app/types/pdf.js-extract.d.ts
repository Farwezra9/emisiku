declare module 'pdf.js-extract' {
  export interface PDFJSExtractOptions {
    firstPage?: number;
    lastPage?: number;
    password?: string;
  }

  export interface PDFJSExtractContent {
    str: string;
    dir: string;
    width: number;
    height: number;
    transform: number[];
    fontName: string;
  }

  export interface PDFJSExtractPage {
    pageInfo: {
      num: number;
      gen: number;
      scale: number;
      rotation: number;
      width: number;
      height: number;
    };
    content: PDFJSExtractContent[];
  }

  export interface PDFJSExtractResult {
    filename?: string;
    numPages: number;
    pages: PDFJSExtractPage[];
  }

  export class PDFExtract {
    constructor();
    extract(
      buffer: string | Buffer, 
      options?: PDFJSExtractOptions, 
      callback?: (err: Error | null, result?: PDFJSExtractResult) => void
    ): void;
    extractBuffer(
      buffer: Buffer, 
      options?: PDFJSExtractOptions
    ): Promise<PDFJSExtractResult>;
  }
}