import { useEffect, useRef } from 'react';
import { mountImportDemo } from './import-demo';

export default function ImportDemo() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => host.current ? mountImportDemo(host.current) : undefined, []);
  return <div ref={host} className="pivot-import-embed" />;
}
