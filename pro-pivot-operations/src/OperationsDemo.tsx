import { useEffect, useRef } from 'react';
import { mountOperationsDemo } from './operations-demo';
export default function OperationsDemo() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => host.current ? mountOperationsDemo(host.current) : undefined, []);
  return <div ref={host} className="pivot-operations-embed" />;
}
