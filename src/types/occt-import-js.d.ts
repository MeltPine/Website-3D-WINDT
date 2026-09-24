declare module 'occt-import-js' {
  import type { OcctModule } from '../lib/geometry/step';

  interface OcctFactoryOptions {
    locateFile?: (path: string, scriptDirectory: string) => string;
  }

  const occtimportjs: (options?: OcctFactoryOptions) => Promise<OcctModule>;
  export default occtimportjs;
}
