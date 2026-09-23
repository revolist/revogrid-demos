# Pivot at scale

This standalone showcase demonstrates the published `@revolist/pivot` trial package with deterministic synthetic USD transactions. Start with 10K rows, explicitly choose 100K or 1M, and use **Switch row hierarchy** to measure a follow-up interaction. The 1M workload is opt-in because browsers can exhaust memory on smaller devices.

Run `pnpm install`, then `pnpm dev`. For the **Remote adapter** button, run `pnpm backend` in a second terminal before starting the Vite page. The Vite development proxy forwards `/api/pivot/*` to the Node backend. If hosting a build, route these paths to that backend at the same origin. The backend owns 100K generated rows and returns Pivot analytical windows through the public `HttpPivotRemoteStore` contract; it uses server memory and does not make a database-scale claim. Its field whitelist is intentionally narrow. A production backend must add authentication, tenancy, query planning, resource limits, and persistence.

The displayed timings distinguish generation, source/config assignment to `pivot-model-changed`, the following two animation frames, and a later layout interaction. The Pivot interval includes browser scheduling and plugin work; the animation frame interval is a paint estimate. Browser and device hints appear beside every result. Compare runs on the same browser/device and note that the demonstration does not claim a speed advantage over another product.

Run `pnpm test`, `pnpm typecheck`, and `pnpm build` to verify the standalone example. The backend can be checked with `curl http://127.0.0.1:4174/api/health` while running. Source rows are generated locally; no imported user data or telemetry leaves the browser in client mode.
