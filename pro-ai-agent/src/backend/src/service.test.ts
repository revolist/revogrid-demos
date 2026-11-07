import { describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import { queryOrders } from './service';
import { createAiReferenceHandler } from './handler';

describe('AI reference backend', () => {
  it('filters the complete dataset before paging, with consistent totals and ordered pages', () => {
    const view = {
      filter: {
        type: 'condition',
        field: 'region',
        operator: 'equal',
        valueType: 'string',
        value: 'Europe',
      },
      sort: [{ field: 'amount', direction: 'desc' }],
    };
    const result = queryOrders({ view, limit: 20 });
    const next = queryOrders({ view, limit: 20, offset: 20 });
    expect(result.total).toBe(1667);
    expect(result.rows).toHaveLength(20);
    expect(result.rows.every((row) => row.region === 'Europe')).toBe(true);
    expect(result.rows[19].amount).toBeGreaterThanOrEqual(next.rows[0].amount);
    expect(
      new Set([...result.rows, ...next.rows].map((row) => row.id)).size,
    ).toBe(40);
    expect(() => queryOrders({ view, limit: 100000 })).toThrow();
  });
  it('rejects unknown fields before query evaluation', () => {
    expect(() =>
      queryOrders({ view: { sort: [{ field: 'private', direction: 'asc' }] } }),
    ).toThrow();
  });
  it('bounds HTTP inputs and never forwards browser-supplied rows or field policy to the model', async () => {
    const interpret = vi.fn(async () => ({
      kind: 'unsupported',
      message: 'fixture',
    }));
    const server = createServer(createAiReferenceHandler(interpret));
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    try {
      const address = server.address() as { port: number };
      const url = `http://127.0.0.1:${address.port}/api/ai-view/interpret`;
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'sort',
          view: { sort: [] },
          samples: [{ private: 'never forward' }],
          fields: [{ field: 'private' }],
        }),
      });
      expect(response.status).toBe(200);
      expect(JSON.stringify(interpret.mock.calls)).not.toContain('private');
      expect(
        (await fetch(url, { method: 'POST', body: 'invalid' })).status,
      ).toBe(422);
      expect(
        (
          await fetch(url, {
            method: 'POST',
            headers: { Origin: 'https://untrusted.example' },
            body: '{}',
          })
        ).status,
      ).toBe(403);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
