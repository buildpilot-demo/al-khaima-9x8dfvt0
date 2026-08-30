import { useEffect, useState } from "react";
import { convexUrl } from "../lib/convex";

// A lightweight, dependency-free route used as the build/deploy smoke-test
// target. It must render immediately without waiting on any network call,
// so bounded automated health checks never hang.
export function HealthPage() {
  const [checkedAt] = useState(() => new Date().toISOString());

  useEffect(() => {
    document.title = "Health check";
  }, []);

  return (
    <main className="page" data-testid="health-page">
      <p className="eyebrow">Status</p>
      <h1>OK</h1>
      <p className="muted">Checked at {checkedAt}</p>
      <p className="muted">Convex backend configured: {convexUrl ? "yes" : "no"}</p>
    </main>
  );
}
