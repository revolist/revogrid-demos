import { useEffect, useRef } from 'react';
import { mountAdvancedGrid } from './demo-entry';

export default function AdvancedGridPreview({ exampleId }: { exampleId: string }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => host.current ? mountAdvancedGrid(host.current, exampleId) : undefined, [exampleId]);
  return <div ref={host} className="workbench-host" />;
}
